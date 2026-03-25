import React, { useEffect, useState } from "react";
import { useScreenStore } from "@/states/screenStore";
import { useSkipActionStore } from "@/states/skipActionStore";
import { Choice } from "../Choice";
import { MessageTypewriter } from "./MessageTypewriter";
import { useScenarioManager } from "./hooks/useScenarioManager";
import { DialogueLayout, NarrationLayout } from "./layouts";

export const Message: React.FC = () => {
  const { screenState } = useScreenStore();
  const { isLoaded } = screenState;
  const { setSkipAction } = useSkipActionStore();
  const {
    scenario,
    navigation,
    goToNextLine,
    getCurrentCharacterName,
    isScenarioEnd,
    isShowingChoices,
    handleChoiceSelect,
    skipToNextChoice,
  } = useScenarioManager(isLoaded);

  const [isShowArrowIcon, setIsShowArrowIcon] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [typewriterInstance, setTypewriterInstance] = useState<any>(null);

  // スキップ関数を外部（Navigation）から呼び出せるように登録
  useEffect(() => {
    setSkipAction({ skipToNextChoice });
  }, [skipToNextChoice, setSkipAction]);

  const handleNext = () => {
    if (isReading) {
      if (typewriterInstance) {
        // タイピング中なら最後まで表示
        const currentText = scenario.currentLine?.text || "";
        typewriterInstance.stop().typeString(currentText).start();
        setIsReading(false);
        setIsShowArrowIcon(true);
      }
      return;
    }

    if (!isScenarioEnd()) {
      void goToNextLine()
    }
  };

  if (!isLoaded || !scenario.currentLine) {
    return null;
  }

  const Layout = scenario.currentLine.type === 1 ? DialogueLayout : NarrationLayout;

  return (
    <div className="absolute bottom-0 left-0 z-40 w-full h-full pointer-events-none">
      <div className="pointer-events-auto cursor-pointer" onClick={handleNext}>
        <Layout
          characterName={getCurrentCharacterName()}
          showArrowIcon={isShowArrowIcon}
          isAutoPlay={navigation.isAutoPlay}
        >
          <MessageTypewriter
            navigation={navigation}
            text={scenario.currentLine.text}
            setIsShowArrowIcon={setIsShowArrowIcon}
            setIsReading={setIsReading}
            setTypewriterInstance={setTypewriterInstance}
          />
        </Layout>
      </div>

      {/* 選択肢の表示 */}
      {isShowingChoices && scenario.currentLine && scenario.currentLine.type === 2 && scenario.currentLine.choices && (
        <Choice choices={scenario.currentLine.choices} onSelect={handleChoiceSelect} />
      )}
    </div>
  );
};
