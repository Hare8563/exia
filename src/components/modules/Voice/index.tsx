import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";
import { CONFIG } from "@/constants";

export const Voice: React.FC = () => {
  const { scenario } = useScenarioStore();
  const currentLine = scenario.currentLine;

  if (!currentLine || currentLine.type === 2) return null;

  const voice = currentLine.voice;
  const speakerId = currentLine.character?.speakerId;

  // Line-level voice file takes precedence over VOICEVOX
  if (voice) {
    return (
      <audio
        key={voice}
        src={`/sounds/voices/${voice}`}
        autoPlay
        style={{ display: "none" }}
      />
    );
  }

  if (CONFIG.VOICEVOX && speakerId) {
    return (
      <audio
        src={`/voices/${speakerId}.mp3`}
        autoPlay
        style={{ display: "none" }}
      />
    );
  }

  return null;
};
