// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/common.css'
import { assetManager } from '@/utils/assetManager'

async function main() {
  // Load manifest.json and app_data_dir into memory before render
  // This ensures assetManager.resolve() works synchronously during render
  await assetManager.initialize()

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

main().catch(console.error)
