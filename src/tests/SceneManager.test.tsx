// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SceneManager } from '@/scene-manager/SceneManager'
import { useSceneStore } from '@/scene-manager/sceneStore'

describe('SceneManager', () => {
  it('renders nothing when currentScene has no matching module', () => {
    useSceneStore.setState({ currentScene: 'nonexistent', previousScene: null })
    // Pass an empty mock map — no scenes registered
    const { container } = render(<SceneManager modules={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when modules prop is omitted and scene is unknown', () => {
    useSceneStore.setState({ currentScene: 'also-nonexistent', previousScene: null })
    // No modules prop — SceneManager uses the Vite glob which has no match
    const { container } = render(<SceneManager modules={{}} />)
    expect(container.firstChild).toBeNull()
  })
})
