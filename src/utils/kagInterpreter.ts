// src/utils/kagInterpreter.ts
import type { KagToken, KAGLayer, KAGDisplayFrame, FlagValue } from '@/types/kag'

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
  private macroParamStack: Record<string, string>[] = [] // mp.xxx per call depth
  private textBuffer = ''
  private speakerName: string | undefined
  private currentMessageLayer = 'message0'
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
      case 'name': this.speakerName = this.expandAttrValue(attrs.text ?? ''); return 'continue'

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
      case 'else': case 'elsif': this.skipToEndif(); return 'continue'
      case 'endif': return 'continue'
      case 'macro': this.skipMacroBody(); return 'continue'
      case 'endmacro': this.handleReturn(); return 'continue'

      case 'eval': this.handleEval(attrs.exp ?? ''); return 'continue'

      case 'flag': this.flags[attrs.name] = this.parseValue(attrs.value); return 'continue'
      case 'glink':
        this.choiceBuffer.push({ text: attrs.text ?? '', target: attrs.target ?? '' })
        return 'continue'

      case 'layopt': this.handleLayopt(attrs); return 'continue'

      // KAG3 no-ops
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
      const expr = val.slice(1)
      const fM = expr.match(/^f\.(\w+)$/)
      if (fM) return String(this.flags[fM[1]] ?? '')
      const sfM = expr.match(/^sf\.(\w+)$/)
      if (sfM) return String(this.systemFlags[sfM[1]] ?? 0)
      const mpM = expr.match(/^mp\.(\w+)$/)
      if (mpM) {
        const params = this.macroParamStack[this.macroParamStack.length - 1]
        return String(params?.[mpM[1]] ?? '')
      }
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
    // Only handle image layers (base or 0-9); message layers are no-ops
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
    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++
      if (tok.type === 'Tag' && tok.name === 'endmacro') return
    }
  }

  private handleEval(exp: string) {
    const m = exp.trim().match(/^(f\.|sf\.)(\w+)\s*=\s*(.+)$/)
    if (!m) return
    const [, prefix, key, rawVal] = m
    const val = this.resolveRValue(rawVal.trim())
    if (prefix === 'f.') this.flags[key] = val
    else this.systemFlags[key] = val
  }

  private resolveRValue(raw: string): FlagValue {
    if (raw.startsWith('mp.')) {
      const key = raw.slice(3)
      const params = this.macroParamStack[this.macroParamStack.length - 1]
      const v = params?.[key]
      if (v === undefined) return ''
      const n = Number(v); return isNaN(n) ? v : n
    }
    if (raw.startsWith('f.')) return this.flags[raw.slice(2)] ?? ''
    if (raw.startsWith('sf.')) return this.systemFlags[raw.slice(3)] ?? 0
    if (raw === "''" || raw === '""') return ''
    if ((raw.startsWith("'") && raw.endsWith("'")) ||
        (raw.startsWith('"') && raw.endsWith('"'))) return raw.slice(1, -1)
    const n = Number(raw)
    if (!isNaN(n)) return n
    return raw
  }

  private evalExp(exp: string): boolean {
    const tryEval = (e: string): boolean => {
      e = e.trim()
      if (e.includes('&&')) return e.split('&&').every(part => tryEval(part))
      if (e.includes('||')) return e.split('||').some(part => tryEval(part))
      const m = e.match(/^(f\.|sf\.|mp\.)(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
      if (!m) return false
      const [, prefix, key, op, rawVal] = m
      let actual: FlagValue
      if (prefix === 'f.') actual = this.flags[key]
      else if (prefix === 'sf.') actual = this.systemFlags[key] ?? 0
      else {
        const params = this.macroParamStack[this.macroParamStack.length - 1]
        const v = params?.[key]
        actual = v !== undefined ? (isNaN(Number(v)) ? v : Number(v)) : ''
      }
      const expected = this.parseValue(rawVal.trim().replace(/^["']|["']$/g, ''))
      if (op === '==') return actual === expected
      if (op === '!=') return actual !== expected
      if (op === '>') return Number(actual) > Number(expected)
      if (op === '<') return Number(actual) < Number(expected)
      if (op === '>=') return Number(actual) >= Number(expected)
      if (op === '<=') return Number(actual) <= Number(expected)
      return false
    }
    return tryEval(exp)
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
      isEnd,
    }
    this.choiceBuffer = []
    return frame
  }
}
