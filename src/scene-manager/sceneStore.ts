import { create } from 'zustand'
import type { SceneId } from '@/constants'

interface SceneStore {
  currentScene: SceneId
  previousScene: SceneId | null
  navigate: (to: SceneId) => void
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  currentScene: 'sign-in',
  previousScene: null,
  navigate: (to) => set({ currentScene: to, previousScene: get().currentScene }),
}))
