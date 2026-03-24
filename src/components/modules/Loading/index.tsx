import React, { useEffect, useState } from "react";
import { useScreenStore } from "@/states/screenStore";
import { useScenarioStore } from "@/states/scenarioStore";

export const Loading: React.FC = () => {
  const { screenState, setScreen } = useScreenStore();
  const { scenario } = useScenarioStore();
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (scenario.isFetched) {
      setTimeout(() => {
        setOpacity(0);
        setTimeout(() => {
          setScreen({
            ...screenState,
            isLoaded: true,
          });
        }, 500);
      }, 1000);
    }
  }, [scenario.isFetched, screenState, setScreen]);

  if (screenState.isLoaded) {
    return null;
  }

  return (
    <div
      className="absolute top-0 left-0 z-50 flex items-center justify-center w-full h-full bg-black transition-opacity duration-500"
      style={{ opacity }}
    >
      <div className="relative flex items-center justify-center w-16 h-16 animate-loading-spin">
        <div className="absolute top-0 left-0 w-2 h-2 bg-white rounded-full animate-loading-effect-odd" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-loading-effect-even" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-white rounded-full animate-loading-effect-even" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-white rounded-full animate-loading-effect-odd" />
      </div>
    </div>
  );
};
