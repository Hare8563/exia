import React from "react";
import { useKAGScenarioStore } from "@/states/kagScenarioStore";

export const DebugMenu: React.FC = () => {
  const { currentText, currentSpeakerName, logs, flags } = useKAGScenarioStore();

  return (
    <ul className="absolute top-1 left-1 z-20 flex flex-col gap-2 bg-black bg-opacity-80 text-white text-xs p-2">
      <li>speaker: {currentSpeakerName ?? "(none)"}</li>
      <li>logs: {logs.length}</li>
      <li>flags: {Object.keys(flags).length}</li>
      <li>text: {currentText.slice(0, 40)}{currentText.length > 40 ? "…" : ""}</li>
    </ul>
  );
};
