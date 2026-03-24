import React from "react";
import { useScreenStore } from "@/states/screenStore";
import { SCREEN } from "@/constants";

export const EndingScreen: React.FC = () => {
  const { screenState, setScreen } = useScreenStore();

  return (
    <>
      <button
        onClick={() =>
          setScreen({
            ...screenState,
            screen: SCREEN.START_SCREEN,
          })
        }
      >
        Back
      </button>
    </>
  );
};
