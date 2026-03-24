import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";

export const CutIn: React.FC = () => {
  const { scenario } = useScenarioStore();

  if (!scenario.currentLine?.cutIn) {
    return null;
  }

  const { cutIn } = scenario.currentLine;

  return (
    <div className="absolute top-0 left-0 z-10 flex items-center justify-center w-full h-full pointer-events-none">
      <div className={cutIn.isFullScreen ? "w-full h-full" : "w-1/2 h-1/2 bg-black p-4 rounded-lg shadow-2xl"}>
        <img src={`/images/cut_ins/${cutIn.imageFile}`} alt="Cut-in" className="w-full h-full object-cover rounded-lg" />
      </div>
    </div>
  );
};
