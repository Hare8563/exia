// src/utils/kagInterpreter.ts
import type { KagToken, KAGLayer, KAGDisplayFrame, FlagValue, KAGUIState, KAGUIButton } from '@/types/kag'

const DEFAULT_LAYER = (id: 'base' | number): KAGLayer => ({
  id, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1,
})

const LAYER_IDS: ('base' | number)[] = ['base', 0, 1, 2, 3]

export class KAGInterpreter {
  private tokens: KagToken[]
  private cursor = 0

  // KAG3 double-buffer: fore = currently displayed, back = prepared target for next transition
  private foreLayers = new Map<'base' | number, KAGLayer>(
    LAYER_IDS.map(id => [id, DEFAULT_LAYER(id)])
  )
  private backLayers = new Map<'base' | number, KAGLayer>(
    LAYER_IDS.map(id => [id, DEFAULT_LAYER(id)])
  )

  private flags: Record<string, FlagValue> = {}
  private systemFlags: Record<string, FlagValue> = {}   // sf.xxx
  private tempFlags: Record<string, FlagValue> = {}     // tf.xxx
  private kagValues: Record<string, FlagValue> = {
    loaded_flag: false,
    skipMode: false,
    autoMode: false,
    inStable: 1,
  }
  private macroParamStack: Record<string, string>[] = [] // mp.xxx per call depth
  private textBuffer = ''
  private speakerName: string | undefined
  private currentMessageLayer = 'message0'
  private uiButtons = new Map<string, KAGUIButton>()
  private historyOutput = true
  private historyEnabled = true
  private rclickEnabled = false
  private startAnchorEnabled = false
  private clickableMap: KAGUIState['clickableMap'] = { enabled: false }
  private voiceFile: string | undefined
  private voiceSpeakerId: number | undefined
  private seFile: string | undefined
  private bgmFile: string | undefined
  private choiceBuffer: { text: string; target: string }[] = []
  private callStack: number[] = []
  private macros = new Map<string, number>()
  private labelMap = new Map<string, number>()

  // Running transitions: [trans] adds immediately, [wt] waits for all to complete
  private runningTransitions: Array<{ method: string; time: number; layer?: 'base' | number }> = []
  private pendingWaitTime: number | undefined
  private pendingWaitCanSkip = true
  private waitingTransition = false
  private waitingTransitionCanSkip = true
  private waitOriginTime = Date.now()

  constructor(tokens: KagToken[], flags?: Record<string, FlagValue>) {
    this.tokens = tokens
    if (flags) this.flags = flags
    this.buildMaps()
  }

  private buildMaps() {
    let i = 0
    while (i < this.tokens.length) {
      const tok = this.tokens[i]
      if (tok.type === 'Label') {
        this.labelMap.set(tok.name, i)
      } else if (tok.type === 'Tag' && tok.name === 'macro' && tok.attrs.name) {
        this.macros.set(tok.attrs.name, i + 1)
      }
      i++
    }
  }

  appendTokens(tokens: KagToken[]): number {
    const offset = this.tokens.length
    this.tokens = [...this.tokens, ...tokens]
    let i = offset
    while (i < this.tokens.length) {
      const tok = this.tokens[i]
      if (tok.type === 'Label') {
        this.labelMap.set(tok.name, i)
      } else if (tok.type === 'Tag' && tok.name === 'macro' && tok.attrs.name) {
        this.macros.set(tok.attrs.name, i + 1)
      }
      i++
    }
    return offset
  }

  callCrossFile(offset: number, target: string) {
    this.callStack.push(this.cursor)
    this.macroParamStack.push({})
    this.cursor = offset
    if (target) {
      const label = target.replace(/^\*/, '')
      this.jumpToLabel(label)
    }
  }

  getFlags() { return this.flags }
  setFlag(name: string, value: FlagValue) { this.flags[name] = value }
  isWaitingTransition() { return this.waitingTransition }
  isWaitingTimer() { return this.pendingWaitTime !== undefined }
  canSkipWaitingTransition() { return this.waitingTransitionCanSkip }
  canSkipWaitingTimer() { return this.pendingWaitCanSkip }

  // Called when foreground-layer timer completes (or skipped by user click)
  onForegroundTransitionComplete() {
    for (const t of this.runningTransitions) {
      const key = t.layer
      if (key !== undefined && key !== 'base') {
        const back = this.backLayers.get(key)
        if (back) this.foreLayers.set(key, { ...back })
      }
    }
    this.runningTransitions = []
  }

  // Called when background (base) transition completes (click or renderer callback)
  onTransitionComplete() {
    this.waitingTransition = false
    this.waitingTransitionCanSkip = true
    for (const t of this.runningTransitions) {
      const key = t.layer ?? 'base'
      const back = this.backLayers.get(key)
      if (back) this.foreLayers.set(key, { ...back })
    }
    this.runningTransitions = []
  }

  getLayersArray(): KAGLayer[] { return Array.from(this.foreLayers.values()) }

  jumpToLabel(label: string) {
    const idx = this.labelMap.get(label)
    if (idx !== undefined) this.cursor = idx
    else throw new Error(`Label not found: ${label}`)
  }

  selectChoice(target: string) {
    const label = target.startsWith('*') ? target.slice(1) : target
    this.jumpToLabel(label)
  }

  loadTokens(tokens: KagToken[], label: string, flags?: Record<string, FlagValue>) {
    this.tokens = tokens
    this.cursor = 0
    this.macros.clear(); this.labelMap.clear()
    this.macroParamStack = []
    if (flags) this.flags = flags
    this.buildMaps()
    if (label) this.jumpToLabel(label)
  }

  async advance(): Promise<KAGDisplayFrame> {
    if (this.waitingTransition) {
      return this.buildFrame(false)
    }
    this.textBuffer = ''
    this.voiceFile = undefined
    this.voiceSpeakerId = undefined
    this.seFile = undefined

    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++

      if (tok.type === 'Newline') continue
      if (tok.type === 'Label') continue
      if (tok.type === 'Text') {
        this.textBuffer += tok.content
        continue
      }
      if (tok.type === 'Tag') {
        const { name, attrs } = tok
        const handled = this.handleTag(name, attrs)
        if (handled === 'pause') break
        if (handled === 'end') return this.buildFrame(true)
      }
    }

    return this.buildFrame(this.cursor >= this.tokens.length)
  }

  private handleTag(
    name: string,
    attrs: Record<string, string>
  ): 'continue' | 'pause' | 'end' {
    if (this.shouldSkipByCond(name, attrs)) {
      return 'continue'
    }

    switch (name) {
      case 'l': return 'pause'
      case 'p': return 'pause'
      case 's': return 'pause'
      case 'waitclick': return 'pause'

      case 'wt': {
        if (this.runningTransitions.length === 0) return 'continue'
        const hasBase = this.runningTransitions.some(t => t.layer === undefined || t.layer === 'base')
        this.waitingTransitionCanSkip = this.parseBooleanAttr(attrs.canskip, true)
        if (hasBase) {
          // Base layer: renderer drives completion via onTransitionComplete callback
          this.waitingTransition = true
          return 'pause'
        }
        // Foreground layers only: auto-complete via timer
        const maxTime = Math.max(...this.runningTransitions.map(t => t.time))
        this.pendingWaitTime = maxTime
        this.pendingWaitCanSkip = this.waitingTransitionCanSkip
        return 'pause'
      }

      case 'r': this.textBuffer += '\n'; return 'continue'
      case 'cm': this.textBuffer = ''; return 'continue'
      case 'er': this.textBuffer = ''; return 'continue'
      case 'ct':
        this.textBuffer = ''
        this.speakerName = undefined
        this.currentMessageLayer = 'message0'
        return 'continue'
      case 'name': this.speakerName = this.expandAttrValue(attrs.text ?? ''); return 'continue'
      case 'emb':
        this.textBuffer += this.flagValueToString(this.evalTjs(attrs.exp ?? '', 'expr'))
        return 'continue'
      case 'history':
        this.handleHistory(attrs)
        return 'continue'
      case 'rclick':
        this.rclickEnabled = this.parseBooleanAttr(attrs.enabled, true)
        return 'continue'
      case 'startanchor':
        this.startAnchorEnabled = this.parseBooleanAttr(attrs.enabled, true)
        return 'continue'
      case 'button':
        this.handleButton(attrs)
        return 'continue'
      case 'mapimage':
        this.clickableMap.image = attrs.storage
        return 'continue'
      case 'mapaction':
        this.clickableMap.action = attrs.storage
        return 'continue'
      case 'mapdisable':
        this.clickableMap.enabled = false
        return 'continue'

      case 'current':
        if (attrs.layer) this.currentMessageLayer = attrs.layer
        return 'continue'

      case 'ch':
        // [ch text=xxx] on message1 layer = set speaker name
        if (this.currentMessageLayer === 'message1' && attrs.text !== undefined) {
          const t = this.expandAttrValue(attrs.text)
          this.speakerName = t || undefined
        }
        return 'continue'

      case 'image': this.applyImageTag(attrs); return 'continue'

      case 'backlay': this.handleBacklay(); return 'continue'

      case 'freeimage': this.handleFreeimage(attrs); return 'continue'

      // Audio — native tags
      case 'bgm': this.bgmFile = attrs.storage; return 'continue'
      case 'stopbgm': this.bgmFile = undefined; return 'continue'
      case 'se': this.seFile = attrs.storage; return 'continue'
      case 'voice':
        if (attrs.storage) { this.voiceFile = attrs.storage; this.voiceSpeakerId = undefined }
        else if (attrs.speaker) { this.voiceSpeakerId = parseInt(attrs.speaker); this.voiceFile = undefined }
        return 'continue'

      // Audio — KAG3 compat aliases
      case 'playbgm': case 'fadeinbgm':
        if (attrs.storage) this.bgmFile = attrs.storage
        return 'continue'
      case 'fadeoutbgm': case 'stopbgm2':
        this.bgmFile = undefined
        return 'continue'
      case 'playse': case 'fadeinse': {
        const storage = attrs.storage ? this.expandAttrValue(attrs.storage) : undefined
        if (storage) {
          // buf 2+ are voice buffers (per KAG3 macro convention)
          const buf = attrs.buf !== undefined ? parseInt(attrs.buf) : 1
          if (buf >= 2) this.voiceFile = storage
          else this.seFile = storage
        }
        return 'continue'
      }
      case 'stopse': case 'fadeoutse': case 'seopt': case 'bgmopt':
        return 'continue'

      case 'trans':
        // [trans] starts the transition immediately; [wt] waits for completion
        this.runningTransitions.push({
          method: attrs.method ?? 'universal',
          time: parseInt(attrs.time ?? '800'),
          layer: attrs.layer === 'base' ? 'base' : attrs.layer !== undefined ? parseInt(attrs.layer) : undefined,
        })
        return 'continue'

      case 'wait':
        this.pendingWaitCanSkip = this.parseBooleanAttr(attrs.canskip, true)
        this.pendingWaitTime = this.resolveWaitTime(attrs)
        return 'pause'

      case 'resetwait':
        this.waitOriginTime = Date.now()
        return 'continue'

      case 'jump': this.handleJump(attrs); return 'continue'
      case 'call': this.handleCall(attrs); return 'continue'
      case 'return': this.handleReturn(attrs); return 'continue'
      case 'if': this.handleIf(attrs); return 'continue'
      case 'ignore': this.handleIgnore(attrs); return 'continue'
      case 'else': case 'elsif': this.skipToEndif(); return 'continue'
      case 'endif': return 'continue'
      case 'endignore': return 'continue'
      case 'macro': this.skipMacroBody(); return 'continue'
      case 'endmacro': this.handleReturn(); return 'continue'
      case 'iscript': this.skipToMatchingTag('iscript', 'endscript'); return 'continue'
      case 'endscript': return 'continue'

      case 'eval': this.handleEval(attrs.exp ?? ''); return 'continue'

      case 'flag': this.flags[attrs.name] = this.parseValue(attrs.value); return 'continue'
      case 'glink':
        this.choiceBuffer.push({ text: attrs.text ?? '', target: attrs.target ?? '' })
        return 'continue'

      case 'layopt': this.handleLayopt(attrs); return 'continue'

      // KAG3 no-ops
      case 'nowait': case 'endnowait':
      case 'ws': case 'wb': case 'wq': case 'wv':
      case 'hact': case 'endhact':
      case 'laycount': case 'position':
      case 'kanji': case 'hr': case 'locate': case 'style': case 'font':
      case 'wm':
        return 'continue'

      default:
        if (this.macros.has(name)) {
          this.callStack.push(this.cursor)
          this.macroParamStack.push({ ...attrs })
          this.cursor = this.macros.get(name)!
          return 'continue'
        }
        return 'continue'
    }
  }

  private shouldSkipByCond(name: string, attrs: Record<string, string>): boolean {
    if (attrs.cond === undefined) return false
    if (name === 'macro' || name === 'endmacro' || name === 'if' || name === 'else' ||
        name === 'elsif' || name === 'endif' || name === 'ignore' || name === 'endignore' ||
        name === 'iscript' || name === 'endscript') {
      return false
    }
    return !this.evalExp(attrs.cond)
  }

  private expandAttrValue(val: string): string {
    if (!val) return val
    if (val.startsWith('%')) {
      const expr = val.slice(1)
      const [paramName, defaultValue] = expr.split('|', 2)
      const params = this.macroParamStack[this.macroParamStack.length - 1]
      const paramValue = params?.[paramName]
      if (paramValue !== undefined) return String(paramValue)
      return defaultValue !== undefined ? this.expandAttrValue(defaultValue) : ''
    }
    if (val.startsWith('&')) {
      const result = this.evalTjs(val.slice(1), 'expr')
      return this.flagValueToString(result)
    }
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1)
    }
    return val
  }

  private applyToBuffer(existing: KAGLayer, attrs: Record<string, string>, storageRaw: string | undefined): KAGLayer {
    // clear2/white/clear3 = KAG3 built-in transparent bitmaps.
    // They make the layer transparent but the layer itself is visible (visible= attr respected as-is).
    // We store file=undefined so the renderer skips texture loading and renders nothing.
    const isTransparentPlaceholder = storageRaw === 'clear2' || storageRaw === 'white' || storageRaw === 'clear3'
    const file = isTransparentPlaceholder ? undefined : (storageRaw ?? existing.file)
    const visibleAttr = attrs.visible !== undefined ? this.expandAttrValue(attrs.visible) : undefined
    const visible = visibleAttr !== undefined ? visibleAttr === 'true' : existing.visible
    return {
      ...existing,
      file,
      visible,
      x: attrs.left !== undefined ? parseInt(this.expandAttrValue(attrs.left)) : existing.x,
      y: attrs.top !== undefined ? parseInt(this.expandAttrValue(attrs.top)) : existing.y,
      opacity: attrs.opacity !== undefined ? parseInt(this.expandAttrValue(attrs.opacity)) : existing.opacity,
    }
  }

  private applyImageTag(attrs: Record<string, string>) {
    const layerKey: 'base' | number = attrs.layer === 'base' ? 'base' : parseInt(attrs.layer ?? '0')
    const page = attrs.page ?? 'fore'

    const storageRaw = attrs.storage !== undefined ? this.expandAttrValue(attrs.storage) : undefined

    if (page === 'fore') {
      const existing = this.foreLayers.get(layerKey) ?? DEFAULT_LAYER(layerKey)
      this.foreLayers.set(layerKey, this.applyToBuffer(existing, attrs, storageRaw))
    } else if (page === 'back') {
      const existing = this.backLayers.get(layerKey) ?? DEFAULT_LAYER(layerKey)
      this.backLayers.set(layerKey, this.applyToBuffer(existing, attrs, storageRaw))
    } else {
      // No page specified — apply to fore only (direct display)
      const existing = this.foreLayers.get(layerKey) ?? DEFAULT_LAYER(layerKey)
      this.foreLayers.set(layerKey, this.applyToBuffer(existing, attrs, storageRaw))
    }
  }

  // [backlay]: copy fore → back for all layers
  private handleBacklay() {
    for (const [key, layer] of this.foreLayers) {
      this.backLayers.set(key, { ...layer })
    }
  }

  // [freeimage layer=X page=fore/back]: clear the specified buffer
  private handleFreeimage(attrs: Record<string, string>) {
    const key: 'base' | number = attrs.layer === 'base' ? 'base' : parseInt(attrs.layer ?? '0')
    const page = attrs.page ?? 'fore'
    if (page === 'fore') this.foreLayers.set(key, DEFAULT_LAYER(key))
    else if (page === 'back') this.backLayers.set(key, DEFAULT_LAYER(key))
  }

  // [layopt]: update layer visibility/opacity without clearing content
  private handleLayopt(attrs: Record<string, string>) {
    const layerStr = attrs.layer ?? ''
    if (layerStr.startsWith('message')) {
      const visible = attrs.visible !== undefined ? this.parseBooleanAttr(attrs.visible, true) : undefined
      if (visible !== undefined) {
        for (const [graphic, button] of this.uiButtons) {
          if (button.layer === layerStr) {
            this.uiButtons.set(graphic, { ...button, visible })
          }
        }
      }
      return
    }
    // Only handle image layers (base or 0-9); message layers are handled above.
    if (layerStr !== 'base' && !/^\d+$/.test(layerStr)) return
    const key: 'base' | number = layerStr === 'base' ? 'base' : parseInt(layerStr)
    const page = attrs.page ?? 'fore'
    const buf = page === 'back' ? this.backLayers : this.foreLayers
    const existing = buf.get(key) ?? DEFAULT_LAYER(key)
    const updated = { ...existing }
    if (attrs.visible !== undefined) updated.visible = attrs.visible === 'true'
    if (attrs.opacity !== undefined) updated.opacity = parseInt(attrs.opacity)
    if (attrs.left !== undefined) updated.x = parseInt(attrs.left)
    if (attrs.top !== undefined) updated.y = parseInt(attrs.top)
    buf.set(key, updated)
  }

  private handleJump(attrs: Record<string, string>) {
    if (attrs.storage) {
      throw new Error(`CROSS_FILE_JUMP:${attrs.storage}:${attrs.target ?? ''}`)
    }
    if (attrs.target) {
      const label = attrs.target.replace(/^\*/, '')
      this.jumpToLabel(label)
    } else {
      this.cursor = 0
    }
  }

  private handleCall(attrs: Record<string, string>) {
    if (attrs.storage) {
      throw new Error(`CROSS_FILE_CALL:${attrs.storage}:${attrs.target ?? ''}`)
    }
    this.callStack.push(this.cursor)
    this.macroParamStack.push({})
    if (attrs.target) {
      const label = attrs.target.replace(/^\*/, '')
      this.jumpToLabel(label)
    } else {
      this.cursor = 0
    }
  }

  private handleReturn(attrs?: Record<string, string>) {
    if (attrs?.storage) {
      throw new Error(`CROSS_FILE_RETURN:${attrs.storage}:${attrs?.target ?? ''}`)
    }

    const ret = this.callStack.pop()
    this.macroParamStack.pop()
    if (attrs?.target) {
      const label = attrs.target.replace(/^\*/, '')
      this.jumpToLabel(label)
      return
    }
    if (ret !== undefined) this.cursor = ret
  }

  returnCrossFile(offset: number, target: string) {
    this.callStack.pop()
    this.macroParamStack.pop()
    this.cursor = offset
    if (target) {
      const label = target.replace(/^\*/, '')
      this.jumpToLabel(label)
    }
  }

  private handleIf(attrs: Record<string, string>) {
    const exp = attrs.exp ?? ''
    if (!this.evalExp(exp)) {
      this.skipToElseOrEndif()
    }
  }

  private handleIgnore(attrs: Record<string, string>) {
    if (this.evalExp(attrs.exp ?? '')) {
      this.skipToMatchingTag('ignore', 'endignore')
    }
  }

  private skipToEndif() {
    let depth = 1
    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++
      if (tok.type !== 'Tag') continue
      if (tok.name === 'if') { depth++; continue }
      if (tok.name === 'endif') { depth--; if (depth === 0) return }
    }
  }

  private skipToElseOrEndif() {
    let depth = 1
    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++
      if (tok.type !== 'Tag') continue
      if (tok.name === 'if') { depth++; continue }
      if (tok.name === 'endif') { depth--; if (depth === 0) return }
      if ((tok.name === 'else' || tok.name === 'elsif') && depth === 1) return
    }
  }

  private skipMacroBody() {
    this.skipToMatchingTag('macro', 'endmacro')
  }

  private skipToMatchingTag(startTag: string, endTag: string) {
    let depth = 1
    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++
      if (tok.type !== 'Tag') continue
      if (tok.name === startTag) {
        depth++
        continue
      }
      if (tok.name === endTag) {
        depth--
        if (depth === 0) return
      }
    }
  }

  private handleEval(exp: string) {
    this.evalTjs(exp, 'statement')
  }

  private handleHistory(attrs: Record<string, string>) {
    if (attrs.output !== undefined) {
      this.historyOutput = this.parseBooleanAttr(attrs.output, true)
    }
    if (attrs.enabled !== undefined) {
      this.historyEnabled = this.parseBooleanAttr(attrs.enabled, true)
    }
  }

  private handleButton(attrs: Record<string, string>) {
    const graphic = attrs.graphic
    if (!graphic) return
    this.uiButtons.set(graphic, {
      layer: this.currentMessageLayer,
      graphic,
      visible: true,
      exp: attrs.exp,
    })
  }

  private evalExp(exp: string): boolean {
    return Boolean(this.evalTjs(exp, 'expr'))
  }

  private parseValue(v: string): FlagValue {
    if (v === 'true') return true
    if (v === 'false') return false
    const n = Number(v)
    return isNaN(n) ? v : n
  }

  private parseBooleanAttr(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue
    const expanded = this.expandAttrValue(value)
    if (expanded === 'true') return true
    if (expanded === 'false') return false
    return defaultValue
  }

  private resolveWaitTime(attrs: Record<string, string>): number {
    const rawTime = parseInt(this.expandAttrValue(attrs.time ?? '0'))
    if ((attrs.mode ?? 'normal') !== 'until') {
      return rawTime
    }
    const elapsed = Date.now() - this.waitOriginTime
    return Math.max(0, rawTime - elapsed)
  }

  private evalTjs(source: string, mode: 'expr' | 'statement'): unknown {
    const js = this.transpileTjsToJs(source)
    const context = this.createTjsContext()
    try {
      const body = mode === 'statement'
        ? `with (context) { ${js}; }`
        : `with (context) { return (${js}); }`
      return Function('context', body)(context)
    } catch (error) {
      console.warn('[KAG] TJS eval failed', { source, js, mode, error })
      return mode === 'expr' ? '' : undefined
    }
  }

  private transpileTjsToJs(source: string): string {
    return source
      .replace(/\r?\n/g, ' ')
      .replace(/\btrue\b/g, 'true')
      .replace(/\bfalse\b/g, 'false')
  }

  private createTjsContext() {
    const params = this.macroParamStack[this.macroParamStack.length - 1] ?? {}

    const createFlagProxy = (
      store: Record<string, FlagValue>,
      defaultsToZero: boolean,
    ) => new Proxy(store, {
      get: (target, prop) => {
        if (typeof prop !== 'string') return undefined
        if (!(prop in target)) return defaultsToZero ? 0 : ''
        return target[prop]
      },
      set: (target, prop, value) => {
        if (typeof prop === 'string') {
          target[prop] = this.normalizeEvalValue(value)
        }
        return true
      },
    })

    const mpProxy = new Proxy(params, {
      get: (target, prop) => {
        if (typeof prop !== 'string') return undefined
        return this.normalizeMacroParamValue(target[prop])
      },
      set: (target, prop, value) => {
        if (typeof prop === 'string') {
          target[prop] = this.flagValueToString(this.normalizeEvalValue(value))
        }
        return true
      },
    })

    const kagValues = this.kagValues
    const kagProxy = new Proxy(kagValues as Record<string, unknown>, {
      get: (target, prop) => {
        if (typeof prop !== 'string') return undefined
        if (prop === 'f') return this.foreLayers
        if (prop === 'sf') return this.systemFlags
        if (prop === 'tf') return this.tempFlags
        if (prop === 'fore') return { layers: Object.fromEntries(this.foreLayers), base: this.foreLayers.get('base') }
        if (prop === 'back') return { layers: Object.fromEntries(this.backLayers), base: this.backLayers.get('base') }
        if (!(prop in target)) return undefined
        return target[prop]
      },
      set: (target, prop, value) => {
        if (typeof prop === 'string') {
          target[prop] = this.normalizeEvalValue(value)
        }
        return true
      },
    })

    return {
      f: createFlagProxy(this.flags, false),
      sf: createFlagProxy(this.systemFlags, true),
      tf: createFlagProxy(this.tempFlags, false),
      mp: mpProxy,
      kag: kagProxy,
      true: true,
      false: false,
      null: null,
      undefined,
    }
  }

  private normalizeMacroParamValue(value: string | undefined): FlagValue {
    if (value === undefined) return ''
    const n = Number(value)
    return Number.isNaN(n) ? value : n
  }

  private normalizeEvalValue(value: unknown): FlagValue {
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      return value
    }
    if (value == null) return ''
    return String(value)
  }

  private flagValueToString(value: unknown): string {
    if (value == null) return ''
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
  }

  private buildFrame(isEnd: boolean): KAGDisplayFrame {
    const isWaiting = this.waitingTransition

    const waitTime = this.pendingWaitTime
    const waitCanSkip = isWaiting ? this.waitingTransitionCanSkip : this.pendingWaitCanSkip
    this.pendingWaitTime = undefined
    this.pendingWaitCanSkip = true

    // Snapshot running transitions for the renderer
    const transition = this.runningTransitions.length > 0 ? {
      method: this.runningTransitions[0].method,
      time: Math.max(...this.runningTransitions.map(t => t.time)),
      layers: this.runningTransitions.map(t => t.layer ?? 'base' as 'base' | number),
      foreLayers: Array.from(this.foreLayers.values()).map(l => ({ ...l })),
      backLayers: Array.from(this.backLayers.values()).map(l => ({ ...l })),
    } : undefined

    const frame: KAGDisplayFrame = {
      text: this.textBuffer,
      speakerName: this.speakerName,
      layers: this.getLayersArray(),
      bgmFile: this.bgmFile,
      seFile: this.seFile,
      voiceFile: this.voiceFile,
      voiceSpeakerId: this.voiceSpeakerId,
      choices: this.choiceBuffer.length > 0 ? [...this.choiceBuffer] : undefined,
      transition,
      isWaitingTransition: isWaiting,
      isWaitingTimer: waitTime !== undefined,
      waitTime,
      waitCanSkip,
      uiState: {
        historyOutput: this.historyOutput,
        historyEnabled: this.historyEnabled,
        rclickEnabled: this.rclickEnabled,
        startAnchorEnabled: this.startAnchorEnabled,
        buttons: Array.from(this.uiButtons.values()).map(button => ({ ...button })),
        clickableMap: { ...this.clickableMap },
      },
      isEnd,
    }
    this.choiceBuffer = []
    return frame
  }
}
