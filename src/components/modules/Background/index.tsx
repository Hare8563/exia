import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";

export const Background: React.FC = () => {
  const { scenario } = useScenarioStore();
  const currentLine = scenario.currentLine;
  const lineBackgroundFile = currentLine && currentLine.type !== 2 ? currentLine.backgroundFile : undefined;

  return (
    <div className="absolute top-0 left-0 z-0 w-full h-full bg-black overflow-hidden pointer-events-none">
      <div className="relative w-full h-full">
        {scenario.backgroundFile && (
          <img
            src={`/images/backgrounds/${scenario.backgroundFile}`}
            alt="Background"
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        )}
        {lineBackgroundFile && (
          <img
            src={`/images/backgrounds/${lineBackgroundFile}`}
            alt="Background"
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        )}
      </div>
    </div>
  );
};
