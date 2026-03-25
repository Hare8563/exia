import React from 'react'
import { useScenarioStore } from '@/states/scenarioStore'

export const Bgm: React.FC = () => {
  const currentBgmFile = useScenarioStore((s) => s.scenario.currentBgmFile)

  if (!currentBgmFile) return null

  return (
    <audio
      key={currentBgmFile}
      src={`/sounds/bgm/${currentBgmFile}`}
      autoPlay
      loop
      style={{ display: 'none' }}
    />
  )
}
