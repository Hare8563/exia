import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";

export const Character: React.FC = () => {
  const { scenario } = useScenarioStore();
  const { characters, currentCharacterIndex } = scenario;

  return (
    <div className="absolute top-0 left-0 z-10 flex items-end justify-center w-full h-full pointer-events-none">
      {characters && characters.map(
        (character, i) =>
          character.isShow && (
            <div
              key={i}
              className={`relative transition-all duration-500 transform ${
                currentCharacterIndex === i ? "scale-105 brightness-105" : "scale-100 brightness-75"
              }`}
              style={{
                width: "40%",
                height: "80%",
              }}
            >
              <img
                src={`/images/characters/${character.imageFile}`}
                alt={character.name}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full object-contain"
              />
            </div>
          )
      )}
    </div>
  );
};
