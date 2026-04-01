import { describe, it, expect, beforeEach } from 'vitest'
import { useSceneStore } from '@/scene-manager/sceneStore'

describe('sceneStore', () => {
  beforeEach(() => {
    useSceneStore.setState({ currentScene: 'sign-in', previousScene: null })
  })

  it('initializes to sign-in', () => {
    expect(useSceneStore.getState().currentScene).toBe('sign-in')
    expect(useSceneStore.getState().previousScene).toBeNull()
  })

  it('navigate updates currentScene and previousScene', () => {
    useSceneStore.getState().navigate('novel')
    expect(useSceneStore.getState().currentScene).toBe('novel')
    expect(useSceneStore.getState().previousScene).toBe('sign-in')
  })

  it('navigate chained tracks last previousScene', () => {
    useSceneStore.getState().navigate('title')
    useSceneStore.getState().navigate('novel')
    expect(useSceneStore.getState().currentScene).toBe('novel')
    expect(useSceneStore.getState().previousScene).toBe('title')
  })
})
