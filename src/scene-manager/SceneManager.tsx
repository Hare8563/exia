import React, { Suspense, useMemo } from 'react'
import { useSceneStore } from './sceneStore'

type SceneModules = Record<string, () => Promise<unknown>>

const defaultModules: SceneModules = import.meta.glob('../scenes/*/index.tsx')

interface Props {
  modules?: SceneModules
}

export const SceneManager: React.FC<Props> = ({ modules = defaultModules }) => {
  const currentScene = useSceneStore(s => s.currentScene)

  const SceneComponent = useMemo(() => {
    const loader = modules[`../scenes/${currentScene}/index.tsx`]
    if (!loader) return null
    return React.lazy(loader as () => Promise<{ default: React.ComponentType }>)
  }, [currentScene, modules])

  if (!SceneComponent) return null
  return (
    <Suspense fallback={null}>
      <SceneComponent />
    </Suspense>
  )
}
