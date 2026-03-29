import React from 'react'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

export const Bgm: React.FC = () => {
  const bgmFile = useKAGScenarioStore(s => s.currentBgmFile)

  if (!bgmFile) return null

  return (
    <audio
      key={bgmFile}
      src={`/sounds/bgm/${bgmFile}`}
      autoPlay
      loop
      style={{ display: 'none' }}
    />
  )
}
