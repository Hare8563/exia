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
  private voiceFile: string | undefined
  private voiceSpeakerId: number | undefined
  private seFile: string | undefined
  private bgmFile: string | undefined
  private choiceBuffer: { text: string; target: string }[] = []
  private callStack: number[] = []
  private macros = new Map<string, number>()
  private labelMap = new Map<string, number>()

  // Transition queue: [trans] pushes, [wt] pops one and activates it
  private pendingTransitions: Array<{ method: string; time: number; layer?: 'base' | number }> = []
  // Currently active transition (popped from queue on [wt])
  private activeTransition: { method: string; time: number; layer?: 'base' | number } | undefined
  private lastTransitionLayer: 'base' | number | undefined
  private pendingWaitTime: number | undefined
  private waitingTransition = false

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

  onTransitionComplete() {
    this.waitingTransition = false
    // Copy back → fore for the layer that just transitioned
    const key = this.lastTransitionLayer ?? 'base'
    const back = this.backLayers.get(key)
    if (back) this.foreLayers.set(key, { ...back })
    this.lastTransitionLayer = undefined
    this.activeTransition = undefined
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

    return this.buildFrame(false)
  }

  private handleTag(
    name: string,
    attrs: Record<string, string>
  ): 'continue' | 'pause' | 'end' {
    switch (name) {
      case 'l': return 'pause'
      case 'p': return 'pause'
      case 's': return 'pause'

      case 'wt': {
        if (this.pendingTransitions.length === 0) return 'continue'
        // Pop one transition from the queue and activate it
        const trans = this.pendingTransitions.shift()!
        this.activeTransition = trans
        this.lastTransitionLayer = trans.layer
        this.waitingTransition = true
        return 'pause'
      }

      case 'r': this.textBuffer += '\n'; return 'continue'
      case 'cm': this.textBuffer = ''; return 'continue'
      case 'er': this.textBuffer = ''; return 'continue'
      case 'name': this.speakerName = this.expandAttrValue(attrs.text ?? ''); return 'continue'

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
      case 'playse': case 'fadeinse':
        if (attrs.storage) this.seFile = attrs.storage
        return 'continue'
      case 'stopse': case 'fadeoutse': case 'seopt': case 'bgmopt':
        return 'continue'

      case 'trans':
        this.pendingTransitions.push({
          method: attrs.method ?? 'crossfade',
          time: parseInt(attrs.time ?? '800'),
          layer: attrs.layer === 'base' ? 'base' : attrs.layer !== undefined ? parseInt(attrs.layer) : undefined,
        })
        return 'continue'

      case 'wait':
        this.pendingWaitTime = parseInt(attrs.time ?? '0')
        return 'pause'

      case 'jump': this.handleJump(attrs); return 'continue'
      case 'call': this.handleCall(attrs); return 'continue'
      case 'return': this.handleReturn(); return 'continue'
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

      // KAG3 no-ops
      case 'ws': case 'wb': case 'wq': case 'wv':
      case 'hact': case 'endhact':
      case 'layopt': case 'laycount': case 'position': case 'current':
      case 'ch': case 'kanji': case 'hr': case 'locate': case 'style': case 'font':
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

  private expandAttrValue(val: string): string {
    if (!val) return val
    if (val.startsWith('%')) {
      const paramName = val.slice(1)
      const params = this.macroParamStack[this.macroParamStack.length - 1]
      return String(params?.[paramName] ?? '')
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

  private applyToBuffer(existing: KAGLayer, attrs: Record<string, string>, isPlaceholder: boolean, storageRaw: string | undefined): KAGLayer {
    const storage = isPlaceholder ? existing.file : storageRaw
    const visibleAttr = attrs.visible !== undefined ? this.expandAttrValue(attrs.visible) : undefined
    const visible = isPlaceholder ? false
      : visibleAttr !== undefined ? visibleAttr === 'true'
      : existing.visible
    return {
      ...existing,
      file: storage ?? existing.file,
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
    const isPlaceholder = storageRaw === 'clear2' || storageRaw === 'white' || storageRaw === 'clear3'

    if (page === 'fore') {
      const existing = this.foreLayers.get(layerKey) ?? DEFAULT_LAYER(layerKey)
      this.foreLayers.set(layerKey, this.applyToBuffer(existing, attrs, isPlaceholder, storageRaw))
    } else if (page === 'back') {
      const existing = this.backLayers.get(layerKey) ?? DEFAULT_LAYER(layerKey)
      this.backLayers.set(layerKey, this.applyToBuffer(existing, attrs, isPlaceholder, storageRaw))
    } else {
      // No page specified — apply to fore only (direct display)
      const existing = this.foreLayers.get(layerKey) ?? DEFAULT_LAYER(layerKey)
      this.foreLayers.set(layerKey, this.applyToBuffer(existing, attrs, isPlaceholder, storageRaw))
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

  private handleJump(attrs: Record<string, string>) {
    if (attrs.file) {
      throw new Error(`CROSS_FILE_JUMP:${attrs.file}:${attrs.target ?? ''}`)
    }
    const label = (attrs.target ?? '').replace(/^\*/, '')
    this.jumpToLabel(label)
  }

  private handleCall(attrs: Record<string, string>) {
    if (attrs.storage) {
      throw new Error(`CROSS_FILE_CALL:${attrs.storage}:${attrs.target ?? ''}`)
    }
    const label = (attrs.target ?? '').replace(/^\*/, '')
    this.callStack.push(this.cursor)
    this.macroParamStack.push({})
    this.jumpToLabel(label)
  }

  private handleReturn() {
    const ret = this.callStack.pop()
    if (ret !== undefined) this.cursor = ret
    this.macroParamStack.pop()
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

  private buildFrame(isEnd: boolean): KAGDisplayFrame {
    const trans = this.activeTransition
    const isWaiting = this.waitingTransition

    const waitTime = this.pendingWaitTime
    this.pendingWaitTime = undefined

    // Snapshot fore and back at the moment the transition starts
    const transition = trans ? {
      method: trans.method,
      time: trans.time,
      layer: trans.layer,
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
      isEnd,
    }
    this.choiceBuffer = []
    return frame
  }
}
