import React from "react";
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

export const Voice: React.FC = () => {
  const voiceFile = useKAGScenarioStore(s => s.currentVoiceFile)
  const voicePlayback = useKAGScenarioStore(s => s.currentVoicePlayback)
  const choices = useKAGScenarioStore(s => s.currentChoices)
  const audioWaitCompleteCallback = useKAGScenarioStore(s => s.audioWaitCompleteCallback)

  if (choices) return null  // no voice on choice screens

  if (voiceFile) {
    return (
      <audio
        key={`${voicePlayback?.playId ?? 0}:${voiceFile}`}
        src={`/sounds/voices/${voiceFile}`}
        autoPlay
        onEnded={() => {
          audioWaitCompleteCallback?.('voice', voicePlayback?.buf ?? 2)
        }}
        style={{ display: 'none' }}
      />
    );
  }
  return null;
};
