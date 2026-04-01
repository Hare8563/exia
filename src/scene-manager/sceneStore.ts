import { create } from 'zustand'

interface SceneStore {
  currentScene: string
  previousScene: string | null
  navigate: (to: string) => void
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  currentScene: 'sign-in',
  previousScene: null,
  navigate: (to) => set({ currentScene: to, previousScene: get().currentScene }),
}))
