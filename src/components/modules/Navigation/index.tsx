import React from "react";
import { useCallback, useMemo } from "react";
import { useNavigationStore } from "@/states/navigationStore";
import { useSkipActionStore } from "@/states/skipActionStore";
import { useKAGScenarioStore } from "@/states/kagScenarioStore";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { SkipModal } from "../Modal/SkipModal";
import { useScreenStore } from "@/states/screenStore";
import { SCREEN } from "@/constants";
import { useKAGScenarioManager } from "../Message/hooks/useKAGScenarioManager";

type NavigationItem = {
  label: string;
  action?: () => void;
  visible?: boolean;
};

export const Navigation: React.FC = () => {
  const { navigation, setNavigation } = useNavigationStore();
  const { skipAction } = useSkipActionStore();
  const { skipToNextChoice } = skipAction;
  const uiState = useKAGScenarioStore(s => s.uiState);
  const { setScreen } = useScreenStore();
  const { executeButtonExp } = useKAGScenarioManager();

  const visibleButtons = new Map(
    uiState.buttons.filter(button => button.visible).map(button => [button.graphic, button])
  );

  const handleAutoPlay = useCallback(() => {
    setNavigation({
      ...navigation,
      isAutoPlay: !navigation.isAutoPlay,
    });
  }, [navigation, setNavigation]);

  const handleLogOpen = useCallback(() => {
    setNavigation({
      ...navigation,
      isLogOpen: true,
    });
  }, [navigation, setNavigation]);

  const handleTitle = useCallback(() => {
    setScreen({ screen: SCREEN.START_SCREEN });
  }, [setScreen]);

  const runButtonExp = useCallback((graphic: string, fallback?: () => void) => {
    const button = visibleButtons.get(graphic);
    if (button?.exp) {
      void executeButtonExp(button.exp);
      return;
    }
    fallback?.();
  }, [executeButtonExp, visibleButtons]);

  const handleSkipOpen = useCallback(() => {
    setNavigation({
      ...navigation,
      isSkipModalOpen: true,
    });
  }, [navigation, setNavigation]);

  const handleSkipClose = useCallback(() => {
    setNavigation({
      ...navigation,
      isSkipModalOpen: false,
    });
  }, [navigation, setNavigation]);

  const handleSkipConfirm = useCallback(() => {
    // スキップを実行
    skipToNextChoice();
    // モーダルを閉じる
    handleSkipClose();
  }, [skipToNextChoice, handleSkipClose]);

  // ナビゲーションアイテムをメモ化
  const items = useMemo<NavigationItem[]>(
    () => [
      { label: "SAVE", action: () => runButtonExp("message_bt_save"), visible: visibleButtons.has("message_bt_save") },
      { label: "LOAD", action: () => runButtonExp("message_bt_load"), visible: visibleButtons.has("message_bt_load") },
      { label: "AUTO", action: () => runButtonExp("message_bt_auto", handleAutoPlay), visible: visibleButtons.has("message_bt_auto") },
      { label: "SKIP", action: () => runButtonExp("message_bt_skip", handleSkipOpen), visible: visibleButtons.has("message_bt_skip") },
      { label: "LOG", action: () => runButtonExp("message_bt_bklog", handleLogOpen), visible: uiState.historyEnabled && visibleButtons.has("message_bt_bklog") },
      { label: "CONFIG", action: () => runButtonExp("message_bt_config"), visible: visibleButtons.has("message_bt_config") },
      { label: "TITLE", action: () => runButtonExp("message_bt_title", handleTitle), visible: uiState.startAnchorEnabled && visibleButtons.has("message_bt_title") },
      { label: "GITHUB", action: () => window.open("https://github.com/kokushin/exia") },
    ],
    [handleAutoPlay, handleLogOpen, handleSkipOpen, handleTitle, runButtonExp, uiState.historyEnabled, uiState.startAnchorEnabled, visibleButtons]
  );

  return (
    <>
      <nav className="absolute top-0 right-0 z-50 flex items-center gap-4 text-white text-sm p-4">
        {items.filter(item => item.visible !== false).map((item, i) => (
          <button
            onClick={() => {
              if (item.action) {
                item.action();
              } else {
                window.alert("まだ未実装です😭");
              }
            }}
            key={i}
            className="relative"
            style={{
              textShadow: "1px 1px 0 rgba(0,0,0,.5)",
            }}
          >
            {item.label === "AUTO" && navigation.isAutoPlay && (
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <ArrowPathIcon className="size-4 text-white animate-spin" />
              </span>
            )}
            <span className={item.label === "AUTO" && navigation.isAutoPlay ? "opacity-30" : ""}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* スキップ確認モーダル */}
      <SkipModal isOpen={navigation.isSkipModalOpen} onClose={handleSkipClose} onConfirm={handleSkipConfirm} />
    </>
  );
};
