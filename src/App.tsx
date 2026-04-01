// src/App.tsx
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'
import { CONFIG } from '@/constants'
import { ThreeCanvas } from '@/components/ThreeCanvas'
import { SceneManager } from '@/scene-manager/SceneManager'
import { DebugMenu } from '@/components/DebugMenu'

const App = () => {
  const navigate = useSceneStore(s => s.navigate)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) navigate('sign-in')
    })
    return unsubscribe
  }, [navigate])

  return (
    <div className="relative h-[100svh] max-h-[100svh] overflow-hidden select-none">
      <ThreeCanvas />
      <SceneManager />
      {CONFIG.DEBUG && <DebugMenu />}
    </div>
  )
}

export default App
