import { create } from 'zustand'

type TransitionType = 'none' | 'white' | 'black'

interface TransitionState {
  type: TransitionType
  opacity: number
  isInProgress: boolean
  setType: (type: TransitionType) => void
  setOpacity: (opacity: number) => void
  setInProgress: (inProgress: boolean) => void
  fadeOut: (type: TransitionType, duration?: number) => Promise<void>
  fadeIn: (duration?: number) => Promise<void>
}

export const useTransitionStore = create<TransitionState>((set) => ({
  type: 'none',
  opacity: 0,
  isInProgress: false,
  setType: (type) => set({ type }),
  setOpacity: (opacity) => set({ opacity }),
  setInProgress: (inProgress) => set({ isInProgress: inProgress }),
  fadeOut: async (type, duration = 500) => {
    set({ type, isInProgress: true })
    // In a real implementation we might animate this state, 
    // but here we can just use the state to trigger a CSS animation in the UI.
    set({ opacity: 1 })
    return new Promise(resolve => setTimeout(resolve, duration))
  },
  fadeIn: async (duration = 500) => {
    set({ opacity: 0 })
    return new Promise(resolve => setTimeout(resolve, duration)).then(() => {
        set({ isInProgress: false, type: 'none' })
    })
  }
}))
