import { create } from 'zustand';
import { Config } from "@/types";

interface ConfigStore {
  config: Config;
  setConfig: (data: Partial<Config> | ((prev: Config) => Config)) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: {},
  setConfig: (data) => set((state) => ({
    config: typeof data === 'function' ? data(state.config) : { ...state.config, ...data }
  })),
}));
