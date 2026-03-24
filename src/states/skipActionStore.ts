import { create } from 'zustand';

type SkipAction = {
  skipToNextChoice: () => void;
};

interface SkipActionStore {
  skipAction: SkipAction;
  setSkipAction: (data: SkipAction) => void;
}

export const useSkipActionStore = create<SkipActionStore>((set) => ({
  skipAction: {
    skipToNextChoice: () => {
      console.warn("skipToNextChoice function is not yet implemented");
    },
  },
  setSkipAction: (data) => set({ skipAction: data }),
}));
