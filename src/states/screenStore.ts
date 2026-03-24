import { create } from 'zustand';
import { Screen } from "@/types";
import { SCREEN } from "@/constants";

interface ScreenStore {
  screenState: Screen;
  setScreen: (data: Partial<Screen> | ((prev: Screen) => Screen)) => void;
}

export const useScreenStore = create<ScreenStore>((set) => ({
  screenState: {
    screen: SCREEN.MAIN_SCREEN,
    isLoaded: false,
  },
  setScreen: (data) => set((state) => ({
    screenState: typeof data === 'function' ? data(state.screenState) : { ...state.screenState, ...data }
  })),
}));
