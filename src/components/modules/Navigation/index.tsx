import React from "react";
import { useCallback, useMemo } from "react";
import { useNavigationStore } from "@/states/navigationStore";
import { useSkipActionStore } from "@/states/skipActionStore";
import { useKAGScenarioStore } from "@/states/kagScenarioStore";
import { SkipModal } from "../Modal/SkipModal";
import { useKAGScenarioManager } from "../Message/hooks/useKAGScenarioManager";
import { useSceneStore } from "@/scene-manager/sceneStore";

type NavigationItem = {
  label: string;
  graphic: string;
  action?: () => void;
  visible?: boolean;
};

export const Navigation: React.FC = () => {
  const { navigation, setNavigation } = useNavigationStore();
  const { skipAction } = useSkipActionStore();
  const { skipToNextChoice } = skipAction;
  const uiState = useKAGScenarioStore(s => s.uiState);
  const navigate = useSceneStore(s => s.navigate);
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
    navigate('title');
  }, [navigate]);

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
      { label: "SAVE",   graphic: "message_bt_save",   action: () => runButtonExp("message_bt_save"),                    visible: visibleButtons.has("message_bt_save") },
      { label: "LOAD",   graphic: "message_bt_load",   action: () => runButtonExp("message_bt_load"),                    visible: visibleButtons.has("message_bt_load") },
      { label: "AUTO",   graphic: "message_bt_auto",   action: () => runButtonExp("message_bt_auto", handleAutoPlay),    visible: visibleButtons.has("message_bt_auto") },
      { label: "SKIP",   graphic: "message_bt_skip",   action: () => runButtonExp("message_bt_skip", handleSkipOpen),    visible: visibleButtons.has("message_bt_skip") },
      { label: "LOG",    graphic: "message_bt_bklog",  action: () => runButtonExp("message_bt_bklog", handleLogOpen),    visible: uiState.historyEnabled && visibleButtons.has("message_bt_bklog") },
      { label: "CONFIG", graphic: "message_bt_config", action: () => runButtonExp("message_bt_config"),                  visible: visibleButtons.has("message_bt_config") },
      { label: "TITLE",  graphic: "message_bt_title",  action: () => runButtonExp("message_bt_title", handleTitle),      visible: uiState.startAnchorEnabled && visibleButtons.has("message_bt_title") },
    ],
    [handleAutoPlay, handleLogOpen, handleSkipOpen, handleTitle, runButtonExp, uiState.historyEnabled, uiState.startAnchorEnabled, visibleButtons]
  );

  return (
    <>
      <nav
        className="absolute flex flex-row items-center"
        style={{ top: 17, right: 8, gap: 8 }}
      >
        {items.filter(item => item.visible !== false).map((item, i) => (
          <button
            key={i}
            aria-label={item.label}
            onClick={() => item.action?.()}
            style={{
              width: 134,
              height: 47,
              background: "#F2F3F5",
              border: "1px solid #F2F3F5",
              borderRadius: 2,
              filter: "drop-shadow(0px 8px 4px rgba(0,0,0,0.25))",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              padding: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Rounded Mplus 1c Bold', sans-serif",
                fontWeight: 700,
                fontSize: 24,
                lineHeight: "36px",
                color: item.label === "AUTO" && navigation.isAutoPlay ? "#0099CC" : "#364A63",
                transform: "matrix(1, 0, -0.29, 0.96, 0, 0)",
                display: "inline-block",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <SkipModal isOpen={navigation.isSkipModalOpen} onClose={handleSkipClose} onConfirm={handleSkipConfirm} />
    </>
  );
};
