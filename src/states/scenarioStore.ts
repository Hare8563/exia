import { create } from 'zustand';
import { Scenario, ScenarioLine, ScenarioLogEntry } from "@/types";

interface ScenarioState extends Scenario {
  currentCharacterIndex: number;
  currentLine: ScenarioLine | undefined;
  logs: ScenarioLogEntry[];
  isFetched: boolean;
}

interface ScenarioStore {
  scenario: ScenarioState;
  setScenario: (data: Partial<ScenarioState> | ((prev: ScenarioState) => ScenarioState)) => void;
}

export const useScenarioStore = create<ScenarioStore>((set) => ({
  scenario: {
    id: "",
    backgroundFile: "bg_01.webp",
    characters: [],
    lines: [],
    currentCharacterIndex: -1,
    currentLineIndex: 0,
    currentLine: undefined,
    logs: [],
    isFetched: false,
  },
  setScenario: (data) => set((state) => ({
    scenario: typeof data === 'function' ? data(state.scenario) : { ...state.scenario, ...data }
  })),
}));
