import { describe, it, expect, beforeEach } from 'vitest'
import { useThreeContentStore } from '@/states/threeContentStore'

function MockComponent() { return null }

describe('threeContentStore', () => {
  beforeEach(() => {
    useThreeContentStore.setState({ SceneThreeComponent: null })
  })

  it('initializes to null', () => {
    expect(useThreeContentStore.getState().SceneThreeComponent).toBeNull()
  })

  it('setSceneThreeComponent stores a component', () => {
    useThreeContentStore.getState().setSceneThreeComponent(MockComponent)
    expect(useThreeContentStore.getState().SceneThreeComponent).toBe(MockComponent)
  })

  it('setSceneThreeComponent(null) clears the component', () => {
    useThreeContentStore.getState().setSceneThreeComponent(MockComponent)
    useThreeContentStore.getState().setSceneThreeComponent(null)
    expect(useThreeContentStore.getState().SceneThreeComponent).toBeNull()
  })
})
