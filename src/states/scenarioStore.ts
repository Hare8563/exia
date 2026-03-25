import { create } from 'zustand'
import { DisplayLine, FlagValue, Scenario, ScenarioLogEntry } from '@/types'

interface ScenarioState extends Scenario {
  currentCharacterIndex: number
  currentLine: DisplayLine | undefined
  logs: ScenarioLogEntry[]
  isFetched: boolean
  currentFilePath: string
  flags: Record<string, FlagValue>
  currentBgmFile: string | undefined
}

interface ScenarioStore {
  scenario: ScenarioState
  setScenario: (data: Partial<ScenarioState> | ((prev: ScenarioState) => ScenarioState)) => void
}

export const useScenarioStore = create<ScenarioStore>((set) => ({
  scenario: {
    id: '',
    backgroundFile: 'bg_01.webp',
    characters: [],
    lines: [],
    currentCharacterIndex: -1,
    currentLineIndex: 0,
    currentLine: undefined,
    logs: [],
    isFetched: false,
    currentFilePath: 'scenarios/main',
    flags: {},
    currentBgmFile: undefined,
  },
  setScenario: (data) =>
    set((state) => ({
      scenario:
        typeof data === 'function'
          ? data(state.scenario)
          : { ...state.scenario, ...data },
    })),
}))
