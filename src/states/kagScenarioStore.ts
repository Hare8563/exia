// src/states/kagScenarioStore.ts
import { create } from 'zustand'
import type { KAGScenarioState, KAGLayer } from '@/types/kag'

const DEFAULT_LAYERS: KAGLayer[] = [
  { id: 'base', file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
  { id: 0, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
  { id: 1, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
  { id: 2, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
  { id: 3, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
]

const INITIAL: KAGScenarioState = {
  layers: DEFAULT_LAYERS,
  currentText: '',
  currentSpeakerName: undefined,
  currentBgmFile: undefined,
  currentSeFile: undefined,
  currentSeFiles: {},
  currentVoiceFile: undefined,
  currentVoicePlayback: undefined,
  currentVoiceSpeakerId: undefined,
  currentChoices: undefined,
  isWaitingTransition: false,
  currentTransition: undefined,
  currentMoves: undefined,
  currentQuake: undefined,
  isEnd: false,
  uiState: {
    historyOutput: true,
    historyEnabled: true,
    rclickEnabled: false,
    startAnchorEnabled: false,
    buttons: [],
    clickableMap: {
      enabled: false,
      page: 'fore',
    },
  },
  flags: {},
  logs: [],
  transitionCompleteCallback: null,
  audioWaitCompleteCallback: null,
}

type KAGScenarioStore = KAGScenarioState & {
  setFrame: (updates: Partial<KAGScenarioState>) => void
  reset: () => void
  setTransitionCompleteCallback: (fn: (() => void) | null) => void
  setAudioWaitCompleteCallback: (fn: ((kind: 'se' | 'voice', buf: number) => void) | null) => void
  audioWaitCompleteCallback: ((kind: 'se' | 'voice', buf: number) => void) | null
}

export const useKAGScenarioStore = create<KAGScenarioStore>(set => ({
  ...INITIAL,
  setFrame: updates => set(state => ({ ...state, ...updates })),
  reset: () => set(INITIAL),
  setTransitionCompleteCallback: fn => set({ transitionCompleteCallback: fn }),
  audioWaitCompleteCallback: null,
  setAudioWaitCompleteCallback: fn => set({ audioWaitCompleteCallback: fn }),
}))
