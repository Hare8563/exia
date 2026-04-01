import React from 'react'
import { useSceneStore } from '@/scene-manager/sceneStore'

export default function EndingScene() {
  const navigate = useSceneStore(s => s.navigate)
  return (
    <button onClick={() => navigate('title')}>
      Back
    </button>
  )
}
