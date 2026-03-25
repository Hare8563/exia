import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";

export const Voice: React.FC = () => {
  const { scenario } = useScenarioStore();
  const currentLine = scenario.currentLine;
  const speakerId = currentLine && currentLine.type !== 2 ? currentLine.character?.speakerId : undefined;

  return (
    <>
      {speakerId && (
        <audio
          // controls
          src={`/voices/${speakerId}.mp3`}
          autoPlay
          style={{ display: "none" }}
        />
      )}
    </>
  );
};
