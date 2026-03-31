import React from 'react'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

export const Se: React.FC = () => {
  const seFiles = useKAGScenarioStore(s => s.currentSeFiles ?? {})
  const audioWaitCompleteCallback = useKAGScenarioStore(s => s.audioWaitCompleteCallback)

  return (
    <>
      {Object.entries(seFiles).map(([buf, channel]) => (
        <audio
          key={`${buf}:${channel.playId}:${channel.file}`}
          src={`/sounds/se/${channel.file}`}
          autoPlay
          loop={channel.loop}
          onEnded={() => {
            audioWaitCompleteCallback?.('se', parseInt(buf))
          }}
          style={{ display: 'none' }}
        />
      ))}
    </>
  )
}

export default Se
