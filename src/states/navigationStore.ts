import { create } from 'zustand';
import { Navigation } from "@/types";

interface NavigationStore {
  navigation: Navigation;
  setNavigation: (data: Partial<Navigation> | ((prev: Navigation) => Navigation)) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  navigation: {
    isAutoPlay: false,
    isLogOpen: false,
    isSkipModalOpen: false,
    isConfigOpen: false,
  },
  setNavigation: (data) => set((state) => ({
    navigation: typeof data === 'function' ? data(state.navigation) : { ...state.navigation, ...data }
  })),
}));
