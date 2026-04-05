// src/App.tsx
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'
import { CONFIG } from '@/constants'
import { ThreeCanvas } from '@/components/ThreeCanvas'
import { SceneManager } from '@/scene-manager/SceneManager'
import { DebugMenu } from '@/components/DebugMenu'
import { useTransitionStore } from '@/states/transitionStore'

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
      {/* Global Transition Overlay (Covers the gap between scene change) */}
      <GlobalTransitionOverlay />
      <div className="absolute inset-0 z-10">
        <SceneManager />
      </div>
      {CONFIG.DEBUG && <DebugMenu />}
    </div>
  )
}

const GlobalTransitionOverlay = () => {
  const type = useTransitionStore(s => s.type)
  const opacity = useTransitionStore(s => s.opacity)
  const isInProgress = useTransitionStore(s => s.isInProgress)

  if (!isInProgress || type === 'none') return null
  
  return (
    <div 
        className={`absolute inset-0 pointer-events-none z-[1000] transition-opacity duration-500 ease-in-out`}
        style={{ 
            backgroundColor: type, 
            opacity: opacity 
        }} 
    />
  )
}

export default App
