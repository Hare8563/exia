// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/common.css'
import { assetManager } from '@/utils/assetManager'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useSceneStore } from '@/scene-manager/sceneStore'

async function main() {
  await assetManager.initialize()

  await new Promise<void>(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe()
      if (user) {
        useSceneStore.getState().navigate('asset-update')
      } else {
        useSceneStore.getState().navigate('sign-in')
      }
      resolve()
    })
  })

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

main().catch(console.error)
