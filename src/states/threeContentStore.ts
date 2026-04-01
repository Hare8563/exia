import { create } from 'zustand'
import type { ComponentType } from 'react'

interface ThreeContentStore {
  SceneThreeComponent: ComponentType | null
  setSceneThreeComponent: (component: ComponentType | null) => void
}

export const useThreeContentStore = create<ThreeContentStore>((set) => ({
  SceneThreeComponent: null,
  setSceneThreeComponent: (component) => set({ SceneThreeComponent: component }),
}))
