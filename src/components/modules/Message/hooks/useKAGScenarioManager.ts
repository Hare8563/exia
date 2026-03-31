// src/components/modules/Message/hooks/useKAGScenarioManager.ts
import { useRef, useCallback, useState } from 'react'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import { loadKAGTokens } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import type { KAGDisplayFrame, KAGLogEntry } from '@/types/kag'

// Module-level singleton so all hook instances share the same interpreter
const sharedInterpreterRef = { current: null as KAGInterpreter | null }

export function useKAGScenarioManager() {
  const { setFrame } = useKAGScenarioStore()
  const interpreterRef = sharedInterpreterRef
  const [isScenarioEnd, setIsScenarioEnd] = useState(false)

  const doAdvanceRef = useRef<() => Promise<void>>(async () => {})

  const applyFrame = useCallback((frame: KAGDisplayFrame) => {
    // Ensure new foreground layers requested in the frame exist in store
    const updates: Parameters<typeof setFrame>[0] = {
      layers: frame.layers,
      currentText: frame.text,
      currentSpeakerName: frame.speakerName,
      currentBgmFile: frame.bgmFile ?? useKAGScenarioStore.getState().currentBgmFile,
      currentSeFile: frame.seFile,
      currentVoiceFile: frame.voiceFile,
      currentVoiceSpeakerId: frame.voiceSpeakerId,
      currentChoices: frame.choices,
      isWaitingTransition: frame.isWaitingTransition,
      currentTransition: frame.transition,
      isEnd: frame.isEnd,
    }

    // Append to log if there's text
    if (frame.text.trim()) {
      const entry: KAGLogEntry = { text: frame.text, speakerName: frame.speakerName }
      updates.logs = [...useKAGScenarioStore.getState().logs, entry]
    }

    setFrame(updates)
    if (frame.isEnd) setIsScenarioEnd(true)

    // Handle [wait time=N] timer
    if (frame.isWaitingTimer && frame.waitTime) {
      setTimeout(() => {
        interpreterRef.current?.onTransitionComplete() // reuse same callback for timer
        void doAdvanceRef.current()
      }, frame.waitTime)
    }
  }, [setFrame])

  const doAdvance = useCallback(async () => {
    const interp = interpreterRef.current
    if (!interp) return
    try {
      const frame = await interp.advance()
      applyFrame(frame)
    } catch (err) {
      const msg = String(err)
      if (msg.startsWith('Error: CROSS_FILE_JUMP:')) {
        const [file, target] = msg.replace('Error: CROSS_FILE_JUMP:', '').split(':')
        const tokens = await loadKAGTokens(`scenarios/${file.replace('.ks', '')}`)
        const label = (target ?? '').replace(/^\*/, '')
        const flags = useKAGScenarioStore.getState().flags
        interp.loadTokens(tokens, label, flags)
        await doAdvanceRef.current()
      } else if (msg.startsWith('Error: CROSS_FILE_CALL:')) {
        const [file, target] = msg.replace('Error: CROSS_FILE_CALL:', '').split(':')
        const tokens = await loadKAGTokens(`scenarios/${file.replace('.ks', '')}`)
        const offset = interp.appendTokens(tokens)
        interp.callCrossFile(offset, target ?? '')
        await doAdvanceRef.current()
      } else {
        console.error('KAG advance error:', err)
      }
    }
  }, [applyFrame])
  doAdvanceRef.current = doAdvance

  const goToNextLine = useCallback(async () => {
    if (isScenarioEnd) return
    const interp = interpreterRef.current
    if (interp?.isWaitingTransition()) {
      // [wt canskip=true]: user clicked during transition — skip it immediately
      interp.onTransitionComplete()
      setFrame({ isWaitingTransition: false, currentTransition: undefined })
    }
    await doAdvance()
  }, [isScenarioEnd, doAdvance, setFrame])

  const handleChoiceSelect = useCallback(async (target: string) => {
    interpreterRef.current?.selectChoice(target)
    setFrame({ currentChoices: undefined })
    await doAdvance()
  }, [setFrame, doAdvance])

  const onTransitionComplete = useCallback(() => {
    interpreterRef.current?.onTransitionComplete()
    setFrame({ isWaitingTransition: false, currentTransition: undefined })
    void doAdvanceRef.current()
  }, [setFrame])

  const skipToNextChoice = useCallback(async () => {
    // Fast-forward: keep advancing until choices appear or end
    const interp = interpreterRef.current
    if (!interp) return
    let frame = await interp.advance()
    while (!frame.choices && !frame.isEnd) {
      if (frame.text.trim()) {
        const entry: KAGLogEntry = { text: frame.text, speakerName: frame.speakerName }
        setFrame({ logs: [...useKAGScenarioStore.getState().logs, entry] })
      }
      if (frame.isWaitingTransition) interp.onTransitionComplete()
      frame = await interp.advance()
    }
    applyFrame(frame)
  }, [applyFrame, setFrame])

  const getCurrentSpeakerName = useCallback(() => {
    return useKAGScenarioStore.getState().currentSpeakerName
  }, [])

  // Call this once after loading the interpreter
  const init = useCallback((interp: KAGInterpreter) => {
    interpreterRef.current = interp
    setIsScenarioEnd(false)
    // Register the onTransitionComplete callback in the store so Background3D can call it
    useKAGScenarioStore.getState().setTransitionCompleteCallback(() => {
      interpreterRef.current?.onTransitionComplete()
      useKAGScenarioStore.getState().setFrame({ isWaitingTransition: false, currentTransition: undefined })
      void doAdvanceRef.current()
    })
    void doAdvance()
  }, [doAdvance])

  return {
    goToNextLine,
    handleChoiceSelect,
    onTransitionComplete,
    skipToNextChoice,
    getCurrentSpeakerName,
    isScenarioEnd,
    init,
  }
}
