import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";
import { useNavigationStore } from "@/states/navigationStore";
import rawMockScenario from "@/scenarios/S_000.json";
import type { DisplayLine, Scenario } from "@/types";

const mockScenario = rawMockScenario as unknown as Scenario;

export const DebugMenu: React.FC = () => {
  const { scenario, setScenario } = useScenarioStore();
  const { navigation, setNavigation } = useNavigationStore();

  return (
    <ul className="absolute top-1 left-1 z-20 flex flex-col gap-2 bg-black bg-opacity-80 text-white text-xs p-2">
      <li>scenarioId: {scenario.id}</li>
      <li>
        currentLineIndex: {scenario.currentLineIndex} / {scenario.lines.length - 1}
      </li>
      <li>
        <button
          onClick={() => {
            setScenario({
              ...scenario,
              ...mockScenario,
              currentCharacterIndex: -1,
              currentLineIndex: 0,
              currentLine: scenario.lines[0] as DisplayLine | undefined,
            });
            setNavigation({
              ...navigation,
              isAutoPlay: false,
            });
          }}
        >
          Reset
        </button>
      </li>
      <li>---</li>
      <li>currentCharacterIndex: {scenario.currentCharacterIndex}</li>
      {(mockScenario.characters ?? [])
        .filter((character) => character.isShow)
        .map((character, i) => (
          <li key={i}>
            <button
              onClick={() =>
                setScenario({
                  ...scenario,
                  currentCharacterIndex: i,
                })
              }
            >
              Set: {character.name}
            </button>
          </li>
        ))}
    </ul>
  );
};
