// src/tests/kagInterpreter.test.ts
import { describe, it, expect } from 'vitest'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import type { KagToken } from '@/types/kag'


describe('KAGInterpreter', () => {
  describe('text and pause points', () => {
    it('returns text at [l] pause point', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'こんにちは' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('こんにちは')
      expect(frame.isEnd).toBe(false)
    })

    it('accumulates text across multiple Text tokens before [l]', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'Hello' },
        { type: 'Text', content: ' World' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('Hello World')
    })

    it('clears text on [p] and waits', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'Page 1' },
        { type: 'Tag', name: 'p', attrs: {} },
        { type: 'Text', content: 'Page 2' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance()
      expect(frame1.text).toBe('Page 1')
      const frame2 = await interp.advance()
      expect(frame2.text).toBe('Page 2')
    })

    it('[cm] clears text buffer mid-page', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'old' },
        { type: 'Tag', name: 'cm', attrs: {} },
        { type: 'Text', content: 'new' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('new')
    })

    it('[s] pauses execution without ending the scenario', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'end' },
        { type: 'Tag', name: 's', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.isEnd).toBe(false)
      expect(frame.text).toBe('end')
    })

    it('[name] sets speakerName', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'name', attrs: { text: 'Alice' } },
        { type: 'Text', content: 'Hi' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.speakerName).toBe('Alice')
    })

    it('[r] inserts newline in text', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'line1' },
        { type: 'Tag', name: 'r', attrs: {} },
        { type: 'Text', content: 'line2' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('line1\nline2')
    })

    it('Newline tokens are always skipped', async () => {
      const tokens: KagToken[] = [
        { type: 'Newline' },
        { type: 'Text', content: 'text' },
        { type: 'Newline' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('text')
    })

    it('marks isEnd when the token stream is exhausted', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'fin' },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('fin')
      expect(frame.isEnd).toBe(true)
    })
  })

  describe('image and audio tags', () => {
    it('[image layer=base] sets background layer', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'image', attrs: { storage: 'bg.webp', layer: 'base' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      const bg = frame.layers.find(l => l.id === 'base')
      expect(bg?.file).toBe('bg.webp')
    })

    it('[image layer=0 visible=true] sets fg layer', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'image', attrs: { storage: 'chara.webp', layer: '0', visible: 'true' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      const layer = frame.layers.find(l => l.id === 0)
      expect(layer?.file).toBe('chara.webp')
      expect(layer?.visible).toBe(true)
    })

    it('[bgm] sets bgmFile', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'bgm', attrs: { storage: 'calm.mp3' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.bgmFile).toBe('calm.mp3')
    })

    it('[voice storage=x] sets voiceFile', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'voice', attrs: { storage: 'v001.wav' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.voiceFile).toBe('v001.wav')
    })

    it('[voice speaker=3] sets voiceSpeakerId', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'voice', attrs: { speaker: '3' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.voiceSpeakerId).toBe(3)
      expect(frame.voiceFile).toBeUndefined()
    })
  })

  describe('flow control', () => {
    it('[jump target=*label] jumps to label', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'jump', attrs: { target: '*end' } },
        { type: 'Text', content: 'skipped' },
        { type: 'Label', name: 'end' },
        { type: 'Text', content: 'reached' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('reached')
    })

    it('[jump] without target restarts from the beginning of the current file', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'jump', attrs: {} },
        { type: 'Text', content: 'head' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('head')
    })

    it('[if] true branch executes', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'flag', attrs: { name: 'test', value: 'true' } },
        { type: 'Tag', name: 'if', attrs: { exp: 'f.test == true' } },
        { type: 'Text', content: 'yes' },
        { type: 'Tag', name: 'endif', attrs: {} },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('yes')
    })

    it('[if] false branch skips to [else]', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'if', attrs: { exp: 'f.missing == true' } },
        { type: 'Text', content: 'no' },
        { type: 'Tag', name: 'else', attrs: {} },
        { type: 'Text', content: 'yes' },
        { type: 'Tag', name: 'endif', attrs: {} },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('yes')
    })

    it('evaluates TJS-style bracket assignment in [eval]', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'eval', attrs: { exp: 'sf[mp.back_cg] = 1' } },
        { type: 'Tag', name: 'if', attrs: { exp: 'sf[mp.back_cg] == 1' } },
        { type: 'Text', content: 'ok' },
        { type: 'Tag', name: 'endif', attrs: {} },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      ;(interp as unknown as { macroParamStack: Record<string, string>[] }).macroParamStack = [{ back_cg: 'bg_01.webp' }]
      const frame = await interp.advance()
      expect(frame.text).toBe('ok')
    })

    it('evaluates kag.* variables in [eval] and [if]', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'eval', attrs: { exp: 'kag.loaded_flag = true' } },
        { type: 'Tag', name: 'if', attrs: { exp: 'kag.loaded_flag == true && f.movie_flag != 1' } },
        { type: 'Text', content: 'loaded' },
        { type: 'Tag', name: 'endif', attrs: {} },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens, { movie_flag: 0 })
      const frame = await interp.advance()
      expect(frame.text).toBe('loaded')
    })

    it('nested [if] blocks: outer false skips entire nested structure', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'if', attrs: { exp: 'f.outer == true' } },  // false → skip
        { type: 'Tag', name: 'if', attrs: { exp: 'f.inner == true' } },  // nested — must also be counted
        { type: 'Text', content: 'inner' },
        { type: 'Tag', name: 'endif', attrs: {} },                        // depth-- but still > 0
        { type: 'Tag', name: 'else', attrs: {} },                         // depth=1 → resume
        { type: 'Text', content: 'outer_else' },
        { type: 'Tag', name: 'endif', attrs: {} },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('outer_else')
      expect(frame.text).not.toContain('inner')
    })

    it('[glink] + [s] produces choices', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'glink', attrs: { target: '*a', text: 'Choice A' } },
        { type: 'Tag', name: 'glink', attrs: { target: '*b', text: 'Choice B' } },
        { type: 'Tag', name: 's', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.choices).toHaveLength(2)
      expect(frame.choices![0].text).toBe('Choice A')
      expect(frame.choices![1].target).toBe('*b')
    })

    it('[call] + [return] restores cursor', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'call', attrs: { target: '*sub' } },
        { type: 'Text', content: 'after' },
        { type: 'Tag', name: 'l', attrs: {} },
        { type: 'Tag', name: 's', attrs: {} },
        { type: 'Label', name: 'sub' },
        { type: 'Text', content: 'sub_text' },
        { type: 'Tag', name: 'l', attrs: {} },
        { type: 'Tag', name: 'return', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance() // enters sub
      expect(frame1.text).toBe('sub_text')
      const frame2 = await interp.advance() // returns, continues
      expect(frame2.text).toBe('after')
    })

    it('[return target=*label] jumps to the requested in-file destination', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'call', attrs: { target: '*sub' } },
        { type: 'Text', content: 'after' },
        { type: 'Tag', name: 'l', attrs: {} },
        { type: 'Label', name: 'target' },
        { type: 'Text', content: 'rerouted' },
        { type: 'Tag', name: 'l', attrs: {} },
        { type: 'Label', name: 'sub' },
        { type: 'Text', content: 'sub_text' },
        { type: 'Tag', name: 'l', attrs: {} },
        { type: 'Tag', name: 'return', attrs: { target: '*target' } },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance()
      expect(frame1.text).toBe('sub_text')
      const frame2 = await interp.advance()
      expect(frame2.text).toBe('rerouted')
    })

    it('honors cond on normal tags', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'flag', attrs: { name: 'show', value: 'false' } },
        { type: 'Tag', name: 'name', attrs: { text: 'Alice', cond: 'f.show == true' } },
        { type: 'Text', content: 'Hi' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.speakerName).toBeUndefined()
      expect(frame.text).toBe('Hi')
    })

    it('expands macro parameter defaults with %param|default', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'macro', attrs: { name: 'sayname' } },
        { type: 'Tag', name: 'name', attrs: { text: '%who|Narrator' } },
        { type: 'Tag', name: 'endmacro', attrs: {} },
        { type: 'Tag', name: 'sayname', attrs: {} },
        { type: 'Text', content: 'hello' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.speakerName).toBe('Narrator')
    })

    it('evaluates [&...] attribute expressions as JavaScript-compatible TJS', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'eval', attrs: { exp: 'f.clearTime = 250' } },
        { type: 'Tag', name: 'wait', attrs: { time: '&f.clearTime', canskip: 'false' } },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.isWaitingTimer).toBe(true)
      expect(frame.waitTime).toBe(250)
      expect(frame.waitCanSkip).toBe(false)
    })

    it('[emb] injects evaluated expression results into text', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'eval', attrs: { exp: "f.value = 'world'" } },
        { type: 'Text', content: 'hello ' },
        { type: 'Tag', name: 'emb', attrs: { exp: 'f.value' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('hello world')
    })

    it('[ignore] skips content until [endignore] when expression is true', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'ignore', attrs: { exp: 'true' } },
        { type: 'Text', content: 'hidden' },
        { type: 'Tag', name: 'endignore', attrs: {} },
        { type: 'Text', content: 'shown' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('shown')
    })

    it('[iscript] body is skipped until [endscript]', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'iscript', attrs: {} },
        { type: 'Text', content: 'var hidden = 1;' },
        { type: 'Tag', name: 'endscript', attrs: {} },
        { type: 'Text', content: 'visible' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('visible')
    })

    it('[ct] resets message target and clears displayed text', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'name', attrs: { text: 'Alice' } },
        { type: 'Text', content: 'old' },
        { type: 'Tag', name: 'ct', attrs: {} },
        { type: 'Text', content: 'new' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('new')
      expect(frame.speakerName).toBeUndefined()
    })

    it('[waitclick] pauses like a click wait point', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'before' },
        { type: 'Tag', name: 'waitclick', attrs: {} },
        { type: 'Text', content: 'after' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance()
      expect(frame1.text).toBe('before')
      const frame2 = await interp.advance()
      expect(frame2.text).toBe('after')
    })
  })

  describe('[trans] and [wt]', () => {
    it('[trans] sets transition, [wt] pauses with isWaitingTransition', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'trans', attrs: { method: 'crossfade', time: '800' } },
        { type: 'Tag', name: 'wt', attrs: {} },
        { type: 'Text', content: 'after trans' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance()
      expect(frame1.isWaitingTransition).toBe(true)
      expect(frame1.transition?.method).toBe('crossfade')
      expect(frame1.transition?.time).toBe(800)

      interp.onTransitionComplete()
      const frame2 = await interp.advance()
      expect(frame2.text).toBe('after trans')
      expect(frame2.isWaitingTransition).toBe(false)
    })

    it('[wt] isWaitingTransition stays true until onTransitionComplete is called', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'trans', attrs: { method: 'crossfade', time: '800' } },
        { type: 'Tag', name: 'wt', attrs: {} },
        { type: 'Text', content: 'after' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance()
      expect(frame1.isWaitingTransition).toBe(true)
      // Without onTransitionComplete, next advance returns the same waiting frame
      const frame2 = await interp.advance()
      expect(frame2.isWaitingTransition).toBe(true)
      // After completing transition, advance proceeds
      interp.onTransitionComplete()
      const frame3 = await interp.advance()
      expect(frame3.text).toBe('after')
      expect(frame3.isWaitingTransition).toBe(false)
    })
  })

  describe('additional flow and timer tests', () => {
    it('[wait] sets isWaitingTimer and waitTime', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'wait', attrs: { time: '500' } },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.isWaitingTimer).toBe(true)
      expect(frame.waitTime).toBe(500)
      expect(frame.waitCanSkip).toBe(true)
    })

    it('[wait canskip=false] reports a non-skippable wait', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'wait', attrs: { time: '500', canskip: 'false' } },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.isWaitingTimer).toBe(true)
      expect(frame.waitCanSkip).toBe(false)
    })

    it('[wt canskip=false] reports a non-skippable transition wait', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'trans', attrs: { method: 'crossfade', time: '800' } },
        { type: 'Tag', name: 'wt', attrs: { canskip: 'false' } },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.isWaitingTransition).toBe(true)
      expect(frame.waitCanSkip).toBe(false)
    })

    it('selectChoice() jumps to chosen label', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'glink', attrs: { target: '*option_a', text: 'A' } },
        { type: 'Tag', name: 'glink', attrs: { target: '*option_b', text: 'B' } },
        { type: 'Tag', name: 's', attrs: {} },
        { type: 'Label', name: 'option_a' },
        { type: 'Text', content: 'chose A' },
        { type: 'Tag', name: 'l', attrs: {} },
        { type: 'Label', name: 'option_b' },
        { type: 'Text', content: 'chose B' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const choiceFrame = await interp.advance()
      expect(choiceFrame.choices).toHaveLength(2)
      interp.selectChoice('*option_b')
      const resultFrame = await interp.advance()
      expect(resultFrame.text).toBe('chose B')
    })

    it('updates UI state for history, rclick and startanchor tags', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'history', attrs: { output: 'false', enabled: 'false' } },
        { type: 'Tag', name: 'rclick', attrs: { enabled: 'true' } },
        { type: 'Tag', name: 'startanchor', attrs: { enabled: 'true' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.uiState.historyOutput).toBe(false)
      expect(frame.uiState.historyEnabled).toBe(false)
      expect(frame.uiState.rclickEnabled).toBe(true)
      expect(frame.uiState.startAnchorEnabled).toBe(true)
    })

    it('registers button tags and hides them through message-layer layopt', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'current', attrs: { layer: 'message8' } },
        { type: 'Tag', name: 'button', attrs: { graphic: 'message_bt_auto', exp: 'kag.enterAutoMode()' } },
        { type: 'Tag', name: 'current', attrs: { layer: 'message0' } },
        { type: 'Tag', name: 'layopt', attrs: { layer: 'message8', visible: 'false' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      const button = frame.uiState.buttons.find(entry => entry.graphic === 'message_bt_auto')
      expect(button).toBeDefined()
      expect(button?.visible).toBe(false)
      expect(button?.layer).toBe('message8')
    })
  })
})
