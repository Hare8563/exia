// src/utils/kagInterpreter.ts
import type { KagToken, KAGLayer, KAGDisplayFrame, FlagValue } from '@/types/kag'

const DEFAULT_LAYER = (id: 'base' | number): KAGLayer => ({
  id, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1,
})

export class KAGInterpreter {
  private tokens: KagToken[]
  private cursor = 0
  private layers = new Map<'base' | number, KAGLayer>([
    ['base', DEFAULT_LAYER('base')],
    [0, DEFAULT_LAYER(0)], [1, DEFAULT_LAYER(1)], [2, DEFAULT_LAYER(2)],
    [3, DEFAULT_LAYER(3)],
  ])
  private flags: Record<string, FlagValue> = {}
  private textBuffer = ''
  private speakerName: string | undefined
  private voiceFile: string | undefined
  private voiceSpeakerId: number | undefined
  private seFile: string | undefined
  private bgmFile: string | undefined
  private choiceBuffer: { text: string; target: string }[] = []
  private callStack: number[] = []
  private macros = new Map<string, number>()      // name → body start index
  private labelMap = new Map<string, number>()
  private pendingTransition: KAGDisplayFrame['transition'] | undefined
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
        const macroName = tok.attrs.name
        const bodyStart = i + 1
        let j = i + 1
        while (j < this.tokens.length) {
          const t = this.tokens[j]
          if (t.type === 'Tag' && t.name === 'endmacro') break
          j++
        }
        this.macros.set(macroName, bodyStart)
      }
      i++
    }
  }

  getFlags() { return this.flags }
  setFlag(name: string, value: FlagValue) { this.flags[name] = value }
  isWaitingTransition() { return this.waitingTransition }
  onTransitionComplete() { this.waitingTransition = false }
  getLayersArray(): KAGLayer[] { return Array.from(this.layers.values()) }

  jumpToLabel(label: string) {
    const idx = this.labelMap.get(label)
    if (idx !== undefined) this.cursor = idx
    else throw new Error(`Label not found: ${label}`)
  }

  selectChoice(target: string) {
    const label = target.startsWith('*') ? target.slice(1) : target
    this.jumpToLabel(label)
  }

  // Replaces token array for cross-file jumps
  loadTokens(tokens: KagToken[], label: string, flags?: Record<string, FlagValue>) {
    this.tokens = tokens
    this.cursor = 0
    this.macros.clear(); this.labelMap.clear()
    if (flags) this.flags = flags
    this.buildMaps()
    if (label) this.jumpToLabel(label)
  }

  // advance() is async for API consistency with future async operations (e.g. cross-file loading)
  async advance(): Promise<KAGDisplayFrame> {
    // If we're waiting for a transition, return current waiting frame
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
      // Pause points
      case 'l': return 'pause'
      case 'p': return 'pause'
      case 's':
        return 'end'

      // [wt] — pause and mark isWaitingTransition
      case 'wt':
        this.waitingTransition = true
        return 'pause'

      // Text
      case 'r': this.textBuffer += '\n'; return 'continue'
      case 'cm': this.textBuffer = ''; return 'continue'
      case 'name': this.speakerName = attrs.text; return 'continue'

      // Image / layers
      case 'image': this.applyImageTag(attrs); return 'continue'

      // Audio
      case 'bgm': this.bgmFile = attrs.storage; return 'continue'
      case 'stopbgm': this.bgmFile = undefined; return 'continue'
      case 'se': this.seFile = attrs.storage; return 'continue'
      case 'voice':
        if (attrs.storage) { this.voiceFile = attrs.storage; this.voiceSpeakerId = undefined }
        else if (attrs.speaker) { this.voiceSpeakerId = parseInt(attrs.speaker); this.voiceFile = undefined }
        return 'continue'

      // Transition
      case 'trans':
        this.pendingTransition = {
          method: attrs.method ?? 'crossfade',
          time: parseInt(attrs.time ?? '800'),
          layer: attrs.layer === 'base' ? 'base' : attrs.layer !== undefined ? parseInt(attrs.layer) : undefined,
        }
        return 'continue'

      // Wait — set timer fields, then pause (hook reads waitTime and starts setTimeout)
      case 'wait':
        this.pendingWaitTime = parseInt(attrs.time ?? '0')
        return 'pause'

      // Flow
      case 'jump': this.handleJump(attrs); return 'continue'
      case 'call': this.handleCall(attrs); return 'continue'
      case 'return': this.handleReturn(); return 'continue'
      case 'if': this.handleIf(attrs); return 'continue'
      case 'else': case 'elsif': case 'endif': return 'continue' // handled by skipIf
      case 'macro': this.skipMacroBody(); return 'continue'
      case 'endmacro': this.handleReturn(); return 'continue' // like return

      // Exia extensions
      case 'flag': this.flags[attrs.name] = this.parseValue(attrs.value); return 'continue'
      case 'glink':
        this.choiceBuffer.push({ text: attrs.text ?? '', target: attrs.target ?? '' })
        return 'continue'

      default:
        // Try macro call
        if (this.macros.has(name)) {
          this.callStack.push(this.cursor)
          this.cursor = this.macros.get(name)!
          return 'continue'
        }
        return 'continue'
    }
  }

  private applyImageTag(attrs: Record<string, string>) {
    const layerKey: 'base' | number = attrs.layer === 'base' ? 'base' : parseInt(attrs.layer ?? '0')
    const existing = this.layers.get(layerKey) ?? DEFAULT_LAYER(layerKey)
    this.layers.set(layerKey, {
      ...existing,
      file: attrs.storage ?? existing.file,
      visible: attrs.visible !== undefined ? attrs.visible === 'true' : existing.visible,
      x: attrs.left !== undefined ? parseInt(attrs.left) : existing.x,
      y: attrs.top !== undefined ? parseInt(attrs.top) : existing.y,
      opacity: attrs.opacity !== undefined ? parseInt(attrs.opacity) : existing.opacity,
    })
  }

  private handleJump(attrs: Record<string, string>) {
    if (attrs.file) {
      // Cross-file: handled externally via loadTokens
      throw new Error(`CROSS_FILE_JUMP:${attrs.file}:${attrs.target ?? ''}`)
    }
    const label = (attrs.target ?? '').replace(/^\*/, '')
    this.jumpToLabel(label)
  }

  private handleCall(attrs: Record<string, string>) {
    const label = (attrs.target ?? '').replace(/^\*/, '')
    this.callStack.push(this.cursor)
    this.jumpToLabel(label)
  }

  private handleReturn() {
    const ret = this.callStack.pop()
    if (ret !== undefined) this.cursor = ret
  }

  private handleIf(attrs: Record<string, string>) {
    const exp = attrs.exp ?? ''
    if (!this.evalExp(exp)) {
      this.skipToElseOrEndif()
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
    // Skip to [endmacro]
    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++
      if (tok.type === 'Tag' && tok.name === 'endmacro') return
    }
  }

  private evalExp(exp: string): boolean {
    // Supported: f.name == val, f.name != val, f.name > N, f.name < N, && ||
    const tryEval = (e: string): boolean => {
      e = e.trim()
      if (e.includes('&&')) return e.split('&&').every(part => tryEval(part))
      if (e.includes('||')) return e.split('||').some(part => tryEval(part))
      const m = e.match(/^f\.(\w+)\s*(==|!=|>|<)\s*(.+)$/)
      if (!m) return false
      const [, key, op, rawVal] = m
      const actual = this.flags[key]
      const expected = this.parseValue(rawVal.trim().replace(/^["']|["']$/g, ''))
      if (op === '==') return actual === expected
      if (op === '!=') return actual !== expected
      if (op === '>') return Number(actual) > Number(expected)
      if (op === '<') return Number(actual) < Number(expected)
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
    const transition = this.pendingTransition
    this.pendingTransition = undefined

    const isWaiting = this.waitingTransition

    const waitTime = this.pendingWaitTime
    this.pendingWaitTime = undefined

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
