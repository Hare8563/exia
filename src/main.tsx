// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/common.css'
import { assetManager } from '@/utils/assetManager'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useScreenStore } from '@/states/screenStore'
import { SCREEN } from '@/constants'

async function main() {
  // Load manifest.json and app_data_dir into memory before render
  // This ensures assetManager.resolve() works synchronously during render
  await assetManager.initialize()

  // Wait for Firebase Auth to restore the persisted session before rendering.
  // onAuthStateChanged fires once immediately with the cached user (or null).
  // If already signed in, skip the sign-in screen and go straight to asset update check.
  await new Promise<void>(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe()
      if (user) {
        useScreenStore.getState().setScreen({ screen: SCREEN.ASSET_UPDATE })
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
