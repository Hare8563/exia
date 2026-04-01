import React from 'react'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { assetManager } from '@/utils/assetManager'

export const Bgm: React.FC = () => {
  const bgmFile = useKAGScenarioStore(s => s.currentBgmFile)

  if (!bgmFile) return null

  return (
    <audio
      key={bgmFile}
      src={assetManager.resolve(bgmFile, 'sounds/bgm')}
      autoPlay
      loop
      style={{ display: 'none' }}
    />
  )
}
