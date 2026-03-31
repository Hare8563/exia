import React from 'react'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

export const Se: React.FC = () => {
  const seFiles = useKAGScenarioStore(s => s.currentSeFiles ?? {})

  return (
    <>
      {Object.entries(seFiles).map(([buf, channel]) => (
        <audio
          key={`${buf}:${channel.playId}:${channel.file}`}
          src={`/sounds/se/${channel.file}`}
          autoPlay
          style={{ display: 'none' }}
        />
      ))}
    </>
  )
}

export default Se
