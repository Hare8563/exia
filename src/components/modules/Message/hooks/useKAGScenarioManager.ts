// src/components/modules/Message/hooks/useKAGScenarioManager.ts
import { useRef, useCallback, useState } from 'react'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import { loadKAGTokens } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { useNavigationStore } from '@/states/navigationStore'
import type { KAGDisplayFrame, KAGLogEntry } from '@/types/kag'
import type { ClickableMapAction } from '@/utils/clickableMap'

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
  const pendingQuakeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const waitCanSkipRef = useRef(true)

  const commitTransitionToStore = useCallback(() => {
    const state = useKAGScenarioStore.getState()
    const transition = state.currentTransition
    if (!transition) return

    const backLayersById = new Map(transition.backLayers.map(layer => [layer.id, layer]))
    const committedLayers = state.layers.map(layer => {
      if (!transition.layers.includes(layer.id)) return layer
      return backLayersById.get(layer.id) ?? layer
    })

    setFrame({
      layers: committedLayers,
      isWaitingTransition: false,
      currentTransition: undefined,
      currentMoves: undefined,
      currentQuake: undefined,
    })
  }, [setFrame])

  const applyFrame = useCallback((frame: KAGDisplayFrame, sessionId = sessionRef.current) => {
    if (sessionId !== sessionRef.current) return

    // Ensure new foreground layers requested in the frame exist in store
    const updates: Parameters<typeof setFrame>[0] = {
      layers: frame.layers,
      currentText: frame.text,
      currentSpeakerName: frame.speakerName,
      currentBgmFile: frame.bgmFile ?? useKAGScenarioStore.getState().currentBgmFile,
      currentSeFile: frame.seFile,
      currentSeFiles: frame.seFiles ?? useKAGScenarioStore.getState().currentSeFiles,
      currentVoiceFile: frame.voiceFile,
      currentVoicePlayback: frame.voicePlayback,
      currentVoiceSpeakerId: frame.voiceSpeakerId,
      currentChoices: frame.choices,
      isWaitingTransition: frame.isWaitingTransition,
      currentTransition: frame.transition,
      currentMoves: frame.moves,
      currentQuake: frame.quake ?? useKAGScenarioStore.getState().currentQuake,
      uiState: frame.uiState,
      isEnd: frame.isEnd,
    }

    // Append to log if there's text
    if (frame.text.trim() && frame.uiState.historyOutput) {
      const entry: KAGLogEntry = { text: frame.text, speakerName: frame.speakerName }
      updates.logs = [...useKAGScenarioStore.getState().logs, entry]
    }

    setFrame(updates)
    if (pendingQuakeRef.current !== null) {
      clearTimeout(pendingQuakeRef.current)
      pendingQuakeRef.current = null
    }
    if (frame.quake) {
      const remaining = Math.max(0, frame.quake.time - (Date.now() - frame.quake.startedAt))
      pendingQuakeRef.current = setTimeout(() => {
        const state = useKAGScenarioStore.getState()
        if (state.currentQuake?.playId === frame.quake?.playId) {
          setFrame({ currentQuake: undefined })
        }
        pendingQuakeRef.current = null
      }, remaining)
    }
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
        interpreterRef.current?.onTimedWaitComplete()
        commitTransitionToStore()
        void doAdvanceRef.current()
      }, frame.waitTime)
    }
  }, [commitTransitionToStore, setFrame, sessionRef])

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
        const { offset, labels } = interp.appendTokens(tokens)
        interp.jumpCrossFile(offset, labels, label, flags)
        await doAdvanceRef.current()
      } else if (msg.startsWith('Error: CROSS_FILE_CALL:')) {
        const [file, target] = msg.replace('Error: CROSS_FILE_CALL:', '').split(':')
        const tokens = await loadKAGTokens(`scenarios/${file.replace('.ks', '')}`)
        if (sessionId !== sessionRef.current) return
        const { offset, labels } = interp.appendTokens(tokens)
        interp.callCrossFile(offset, labels, target ?? '')
        await doAdvanceRef.current()
      } else if (msg.startsWith('Error: CROSS_FILE_RETURN:')) {
        const [file, target] = msg.replace('Error: CROSS_FILE_RETURN:', '').split(':')
        const tokens = await loadKAGTokens(`scenarios/${file.replace('.ks', '')}`)
        if (sessionId !== sessionRef.current) return
        const { offset, labels } = interp.appendTokens(tokens)
        interp.returnCrossFile(offset, labels, target ?? '')
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
      const { offset, labels } = interp.appendTokens(tokens)
      interp.callCrossFile(offset, labels, typeof target === 'string' ? target : '')
      await doAdvanceRef.current()
    } catch (error) {
      console.warn('[KAG] callExtraConductor failed', { file, target, error })
    }
  }, [interpreterRef])

  const jumpByStorage = useCallback(async (storage: string | undefined, target: string | undefined) => {
    const interp = interpreterRef.current
    if (!interp) return

    if (storage) {
      const normalizedFile = storage.replace(/\.ks$/i, '')
      const tokens = await loadKAGTokens(`scenarios/${normalizedFile}`)
      const label = (target ?? '').replace(/^\*/, '')
      const flags = useKAGScenarioStore.getState().flags
      const { offset, labels } = interp.appendTokens(tokens)
      interp.jumpCrossFile(offset, labels, label, flags)
      await doAdvanceRef.current()
      return
    }

    if (target) {
      interp.jumpToLabel(target.replace(/^\*/, ''))
      await doAdvanceRef.current()
    }
  }, [interpreterRef])

  const goToNextLine = useCallback(async () => {
    if (isScenarioEnd) return
    const interp = interpreterRef.current
    if (interp?.isWaitingAudio()) {
      const waitingAudio = interp.getWaitingAudio()
      if (!waitingAudio?.canSkip) return
      interp.onAudioPlaybackComplete(waitingAudio.kind, waitingAudio.buf, true)
      const state = useKAGScenarioStore.getState()
      if (waitingAudio.kind === 'voice') {
        setFrame({ currentVoiceFile: undefined, currentVoicePlayback: undefined })
      } else {
        const nextSeFiles = { ...(state.currentSeFiles ?? {}) }
        delete nextSeFiles[waitingAudio.buf]
        setFrame({ currentSeFiles: nextSeFiles })
      }
      await doAdvance()
      return
    }
    // Cancel any pending foreground timer
    if (pendingTimerRef.current !== null) {
      if (!waitCanSkipRef.current) return
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
      interp?.onTimedWaitComplete()
      commitTransitionToStore()
    }
    if (interp?.isWaitingTransition()) {
      if (!interp.canSkipWaitingTransition()) return
      // [wt canskip=true]: user clicked during background transition — skip it immediately
      interp.onTransitionComplete()
      commitTransitionToStore()
    }
    await doAdvance()
  }, [commitTransitionToStore, isScenarioEnd, doAdvance, setFrame])

  const handleChoiceSelect = useCallback(async (target: string) => {
    interpreterRef.current?.selectChoice(target)
    setFrame({ currentChoices: undefined })
    await doAdvance()
  }, [setFrame, doAdvance])

  const onTransitionComplete = useCallback(() => {
    interpreterRef.current?.onTransitionComplete()
    commitTransitionToStore()
    void doAdvanceRef.current()
  }, [commitTransitionToStore])

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
      if (frame.isWaitingTransition) {
        interp.onTransitionComplete()
        commitTransitionToStore()
      }
      frame = await interp.advance()
    }
    applyFrame(frame)
  }, [applyFrame, commitTransitionToStore, setFrame])

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

  const executeClickableMapAction = useCallback(async (action: ClickableMapAction) => {
    if (action.exp) {
      await executeButtonExp(action.exp)
    }
    if (action.storage || action.target) {
      await jumpByStorage(action.storage, action.target)
    }
  }, [executeButtonExp, jumpByStorage])

  const getCurrentSpeakerName = useCallback(() => {
    return useKAGScenarioStore.getState().currentSpeakerName
  }, [])

  // Call this once after loading the interpreter
  const init = useCallback((interp: KAGInterpreter) => {
    sessionRef.current += 1
    interpreterRef.current = interp
    setIsScenarioEnd(false)
    if (pendingQuakeRef.current !== null) {
      clearTimeout(pendingQuakeRef.current)
      pendingQuakeRef.current = null
    }
    registerKagHandlers(interp)
    // Register the onTransitionComplete callback in the store so Background3D can call it
    useKAGScenarioStore.getState().setTransitionCompleteCallback(() => {
      interpreterRef.current?.onTransitionComplete()
      commitTransitionToStore()
      void doAdvanceRef.current()
    })
    useKAGScenarioStore.getState().setAudioWaitCompleteCallback((kind, buf) => {
      const waiting = interpreterRef.current?.getWaitingAudio()
      const wasWaiting = waiting?.kind === kind && waiting?.buf === buf
      interpreterRef.current?.onAudioPlaybackComplete(kind, buf)
      if (wasWaiting) {
        void doAdvanceRef.current()
      }
    })
    void doAdvance(sessionRef.current)
  }, [commitTransitionToStore, doAdvance, registerKagHandlers, sessionRef])

  return {
    goToNextLine,
    handleChoiceSelect,
    onTransitionComplete,
    skipToNextChoice,
    getCurrentSpeakerName,
    isScenarioEnd,
    init,
    executeButtonExp,
    executeClickableMapAction,
  }
}
