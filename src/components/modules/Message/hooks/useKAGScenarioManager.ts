// src/components/modules/Message/hooks/useKAGScenarioManager.ts
import { useRef, useCallback, useState } from 'react'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import { loadKAGTokens } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { useNavigationStore } from '@/states/navigationStore'
import type { KAGDisplayFrame, KAGLogEntry } from '@/types/kag'

// Module-level singleton so all hook instances share the same interpreter
const sharedInterpreterRef = { current: null as KAGInterpreter | null }
const sharedSessionRef = { current: 0 }

export function useKAGScenarioManager() {
  const { setFrame } = useKAGScenarioStore()
  const interpreterRef = sharedInterpreterRef
  const sessionRef = sharedSessionRef
  const [isScenarioEnd, setIsScenarioEnd] = useState(false)

  const doAdvanceRef = useRef<() => Promise<void>>(async () => {})
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const waitCanSkipRef = useRef(true)

  const applyFrame = useCallback((frame: KAGDisplayFrame, sessionId = sessionRef.current) => {
    if (sessionId !== sessionRef.current) return

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
      uiState: frame.uiState,
      isEnd: frame.isEnd,
    }

    // Append to log if there's text
    if (frame.text.trim() && frame.uiState.historyOutput) {
      const entry: KAGLogEntry = { text: frame.text, speakerName: frame.speakerName }
      updates.logs = [...useKAGScenarioStore.getState().logs, entry]
    }

    setFrame(updates)
    if (frame.isEnd) {
      console.warn('[KAG] frame marked isEnd=true', {
        text: frame.text,
        choices: frame.choices?.length ?? 0,
        isWaitingTransition: frame.isWaitingTransition,
        isWaitingTimer: frame.isWaitingTimer,
      })
      setIsScenarioEnd(true)
    } else {
      console.info('[KAG] frame applied', {
        text: frame.text,
        choices: frame.choices?.length ?? 0,
        isWaitingTransition: frame.isWaitingTransition,
        isWaitingTimer: frame.isWaitingTimer,
        hasTransition: !!frame.transition,
      })
    }
    waitCanSkipRef.current = frame.waitCanSkip

    // Handle [wait time=N] timer (also used for foreground [wt] auto-complete)
    if (frame.isWaitingTimer && frame.waitTime) {
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null
        interpreterRef.current?.onForegroundTransitionComplete()
        void doAdvanceRef.current()
      }, frame.waitTime)
    }
  }, [setFrame, sessionRef])

  const doAdvance = useCallback(async (sessionId = sessionRef.current) => {
    if (sessionId !== sessionRef.current) return
    const interp = interpreterRef.current
    if (!interp) return
    try {
      const frame = await interp.advance()
      if (sessionId !== sessionRef.current) return
      applyFrame(frame, sessionId)
    } catch (err) {
      if (sessionId !== sessionRef.current) return
      const msg = String(err)
      if (msg.startsWith('Error: CROSS_FILE_JUMP:')) {
        const [file, target] = msg.replace('Error: CROSS_FILE_JUMP:', '').split(':')
        const tokens = await loadKAGTokens(`scenarios/${file.replace('.ks', '')}`)
        if (sessionId !== sessionRef.current) return
        const label = (target ?? '').replace(/^\*/, '')
        const flags = useKAGScenarioStore.getState().flags
        interp.loadTokens(tokens, label, flags)
        await doAdvanceRef.current()
      } else if (msg.startsWith('Error: CROSS_FILE_CALL:')) {
        const [file, target] = msg.replace('Error: CROSS_FILE_CALL:', '').split(':')
        const tokens = await loadKAGTokens(`scenarios/${file.replace('.ks', '')}`)
        if (sessionId !== sessionRef.current) return
        const offset = interp.appendTokens(tokens)
        interp.callCrossFile(offset, target ?? '')
        await doAdvanceRef.current()
      } else if (msg.startsWith('Error: CROSS_FILE_RETURN:')) {
        const [file, target] = msg.replace('Error: CROSS_FILE_RETURN:', '').split(':')
        const tokens = await loadKAGTokens(`scenarios/${file.replace('.ks', '')}`)
        if (sessionId !== sessionRef.current) return
        const offset = interp.appendTokens(tokens)
        interp.returnCrossFile(offset, target ?? '')
        await doAdvanceRef.current()
      } else {
        console.error('[KAG] advance error:', err)
      }
    }
  }, [applyFrame, sessionRef])
  doAdvanceRef.current = doAdvance

  const openLog = useCallback(() => {
    const { navigation, setNavigation } = useNavigationStore.getState()
    setNavigation({
      ...navigation,
      isLogOpen: true,
    })
  }, [])

  const closeLog = useCallback(() => {
    const { navigation, setNavigation } = useNavigationStore.getState()
    setNavigation({
      ...navigation,
      isLogOpen: false,
    })
  }, [])

  const setAutoPlay = useCallback((enabled: boolean) => {
    const { navigation, setNavigation } = useNavigationStore.getState()
    setNavigation({
      ...navigation,
      isAutoPlay: enabled,
    })
    interpreterRef.current?.setKagValue('autoMode', enabled)
  }, [interpreterRef])

  const callExtraConductor = useCallback(async (file: unknown, target: unknown) => {
    const interp = interpreterRef.current
    if (!interp || typeof file !== 'string') return
    try {
      const normalizedFile = file.replace(/\.ks$/i, '')
      const tokens = await loadKAGTokens(`scenarios/${normalizedFile}`)
      const offset = interp.appendTokens(tokens)
      interp.callCrossFile(offset, typeof target === 'string' ? target : '')
      await doAdvanceRef.current()
    } catch (error) {
      console.warn('[KAG] callExtraConductor failed', { file, target, error })
    }
  }, [interpreterRef])

  const goToNextLine = useCallback(async () => {
    if (isScenarioEnd) return
    const interp = interpreterRef.current
    // Cancel any pending foreground timer
    if (pendingTimerRef.current !== null) {
      if (!waitCanSkipRef.current) return
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
      interp?.onForegroundTransitionComplete()
    }
    if (interp?.isWaitingTransition()) {
      if (!interp.canSkipWaitingTransition()) return
      // [wt canskip=true]: user clicked during background transition — skip it immediately
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

  const registerKagHandlers = useCallback((interp: KAGInterpreter) => {
    interp.setKagHandler('callExtraConductor', (file, target) => {
      void callExtraConductor(file, target)
    })
    interp.setKagHandler('enterAutoMode', () => {
      setAutoPlay(true)
    })
    interp.setKagHandler('skipToStop', () => {
      interp.setKagValue('skipMode', true)
      void skipToNextChoice().finally(() => {
        interp.setKagValue('skipMode', false)
      })
    })
    interp.setKagHandler('showHistoryByKey', () => {
      openLog()
    })
    interp.setKagHandler('onPrimaryRightClick', () => {
      const uiState = useKAGScenarioStore.getState().uiState
      if (!uiState.rclickEnabled) return
      if (uiState.historyEnabled) {
        openLog()
      } else {
        closeLog()
      }
    })
  }, [callExtraConductor, closeLog, openLog, setAutoPlay, skipToNextChoice])

  const executeButtonExp = useCallback(async (exp?: string) => {
    if (!exp) return
    const interp = interpreterRef.current
    if (!interp) return
    registerKagHandlers(interp)
    interp.executeTjsStatement(exp)
  }, [registerKagHandlers])

  const getCurrentSpeakerName = useCallback(() => {
    return useKAGScenarioStore.getState().currentSpeakerName
  }, [])

  // Call this once after loading the interpreter
  const init = useCallback((interp: KAGInterpreter) => {
    sessionRef.current += 1
    interpreterRef.current = interp
    setIsScenarioEnd(false)
    registerKagHandlers(interp)
    // Register the onTransitionComplete callback in the store so Background3D can call it
    useKAGScenarioStore.getState().setTransitionCompleteCallback(() => {
      interpreterRef.current?.onTransitionComplete()
      useKAGScenarioStore.getState().setFrame({ isWaitingTransition: false, currentTransition: undefined })
      void doAdvanceRef.current()
    })
    void doAdvance(sessionRef.current)
  }, [doAdvance, registerKagHandlers, sessionRef])

  return {
    goToNextLine,
    handleChoiceSelect,
    onTransitionComplete,
    skipToNextChoice,
    getCurrentSpeakerName,
    isScenarioEnd,
    init,
    executeButtonExp,
  }
}
