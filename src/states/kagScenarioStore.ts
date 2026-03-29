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
  currentVoiceFile: undefined,
  currentVoiceSpeakerId: undefined,
  currentChoices: undefined,
  isWaitingTransition: false,
  currentTransition: undefined,
  isEnd: false,
  flags: {},
  logs: [],
  transitionCompleteCallback: null,
}

type KAGScenarioStore = KAGScenarioState & {
  setFrame: (updates: Partial<KAGScenarioState>) => void
  reset: () => void
  setTransitionCompleteCallback: (fn: (() => void) | null) => void
}

export const useKAGScenarioStore = create<KAGScenarioStore>(set => ({
  ...INITIAL,
  setFrame: updates => set(state => ({ ...state, ...updates })),
  reset: () => set(INITIAL),
  setTransitionCompleteCallback: fn => set({ transitionCompleteCallback: fn }),
}))
