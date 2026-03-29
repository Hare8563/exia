import React from "react";
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

export const Voice: React.FC = () => {
  const voiceFile = useKAGScenarioStore(s => s.currentVoiceFile)
  const choices = useKAGScenarioStore(s => s.currentChoices)

  if (choices) return null  // no voice on choice screens

  if (voiceFile) {
    return (
      <audio
        key={voiceFile}
        src={`/sounds/voices/${voiceFile}`}
        autoPlay
        style={{ display: 'none' }}
      />
    );
  }
  return null;
};
