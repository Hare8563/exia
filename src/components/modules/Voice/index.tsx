import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";

export const Voice: React.FC = () => {
  const { scenario } = useScenarioStore();

  return (
    <>
      {scenario.currentLine?.character?.speakerId && (
        <audio
          // controls
          src={`/voices/${scenario.currentLine.character.speakerId}.mp3`}
          autoPlay
          style={{ display: "none" }}
        />
      )}
    </>
  );
};
