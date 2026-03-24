import React from "react";
import { useScreenStore } from "@/states/screenStore";
import { SCREEN } from "@/constants";

export const StartScreen: React.FC = () => {
  const { screenState, setScreen } = useScreenStore();

  return (
    <>
      <button
        onClick={() =>
          setScreen({
            ...screenState,
            screen: SCREEN.MAIN_SCREEN,
          })
        }
      >
        Start
      </button>
    </>
  );
};
