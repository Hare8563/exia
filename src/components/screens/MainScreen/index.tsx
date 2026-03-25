import React, { useEffect } from "react";
import { useScenarioStore } from "@/states/scenarioStore";
import { getCurrentCharacterIndex } from "@/utils";
import type { DisplayLine, Scenario } from "@/types";
import { Message } from "@/components/modules/Message";
import { Navigation } from "@/components/modules/Navigation";
import { Loading } from "@/components/modules/Loading";
import { Voice } from "@/components/modules/Voice";
import { Log } from "@/components/modules/Log";
import { ThreeCanvas } from "@/components/ThreeCanvas";

export const MainScreen: React.FC = () => {
  const { scenario, setScenario } = useScenarioStore();

  // シナリオデータを動的にインポート
  useEffect(() => {
    const loadScenario = async () => {
      try {
        const mockScenarioData = await import("@/scenarios/S_000.json");
        const mockScenario = {
          ...mockScenarioData,
          logs: [], // logsプロパティを追加
        } as Scenario;
        if (!scenario.isFetched) {
          setScenario({
            ...scenario,
            id: mockScenario.id,
            backgroundFile: mockScenario.backgroundFile,
            lines: mockScenario.lines,
            characters: mockScenario.characters,
            currentCharacterIndex: getCurrentCharacterIndex(mockScenario.lines, mockScenario.currentLineIndex),
            currentLineIndex: mockScenario.currentLineIndex,
            currentLine: mockScenario.lines[mockScenario.currentLineIndex] as DisplayLine | undefined,
            isFetched: true,
          });
        }
      } catch (error) {
        console.error("Failed to load scenario:", error);
      }
    };
    loadScenario();
  }, [scenario.isFetched, setScenario]);

  return (
    <>
      <Voice />
      <ThreeCanvas />
      <Message />
      <Navigation />
      <Log />
      <Loading />
    </>
  );
};
