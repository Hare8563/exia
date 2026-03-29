// src/tests/kagInterpreter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

    it('[s] marks isEnd', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'end' },
        { type: 'Tag', name: 's', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.isEnd).toBe(true)
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
  })
})
