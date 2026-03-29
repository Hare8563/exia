import React from "react";
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { CONFIG } from "@/constants";

export const Voice: React.FC = () => {
  const voiceFile = useKAGScenarioStore(s => s.currentVoiceFile)
  const speakerId = useKAGScenarioStore(s => s.currentVoiceSpeakerId)
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
  if (CONFIG.VOICEVOX && speakerId !== undefined) {
    return (
      <audio
        key={speakerId}
        src={`/voices/${speakerId}.mp3`}
        autoPlay
        style={{ display: 'none' }}
      />
    );
  }
  return null;
};
