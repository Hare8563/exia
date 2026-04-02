import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigationStore } from "@/states/navigationStore";
import { useSkipActionStore } from "@/states/skipActionStore";
import { useKAGScenarioStore } from "@/states/kagScenarioStore";
import { SkipModal } from "../Modal/SkipModal";
import { useKAGScenarioManager } from "../Message/hooks/useKAGScenarioManager";
import { useSceneStore } from "@/scene-manager/sceneStore";
import { MenuPanel } from "./MenuPanel";

type NavigationItem = {
  label: string;
  action?: () => void;
  visible?: boolean;
};

const BTN: React.CSSProperties = {
  width: 134,
  height: 47,
  borderRadius: 2,
  filter: "drop-shadow(0px 8px 4px rgba(0,0,0,0.25))",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: 0,
};

const SPAN: React.CSSProperties = {
  fontFamily: "'Rounded Mplus 1c Bold', sans-serif",
  fontWeight: 700,
  fontSize: 24,
  lineHeight: "36px",
  transform: "matrix(1, 0, -0.29, 0.96, 0, 0)",
  display: "inline-block",
};

export const Navigation: React.FC = () => {
  const { navigation, setNavigation } = useNavigationStore();
  const { skipAction } = useSkipActionStore();
  const { skipToNextChoice } = skipAction;
  const uiState = useKAGScenarioStore(s => s.uiState);
  const navigate = useSceneStore(s => s.navigate);
  const { executeButtonExp } = useKAGScenarioManager();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAutoHovered, setIsAutoHovered] = useState(false);
  const [isMenuHovered, setIsMenuHovered] = useState(false);

  const visibleButtons = new Map(
    uiState.buttons.filter(button => button.visible).map(button => [button.graphic, button])
  );

  const handleAutoPlay = useCallback(() => {
    setNavigation({ ...navigation, isAutoPlay: !navigation.isAutoPlay });
  }, [navigation, setNavigation]);

  const handleLogOpen = useCallback(() => {
    setNavigation({ ...navigation, isLogOpen: true });
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
    setNavigation({ ...navigation, isSkipModalOpen: true });
  }, [navigation, setNavigation]);

  const handleSkipClose = useCallback(() => {
    setNavigation({ ...navigation, isSkipModalOpen: false });
  }, [navigation, setNavigation]);

  const handleSkipConfirm = useCallback(() => {
    skipToNextChoice();
    handleSkipClose();
  }, [skipToNextChoice, handleSkipClose]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const close = () => setIsMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [isMenuOpen]);

  const items = useMemo<NavigationItem[]>(
    () => [
      { label: "SAVE",   action: () => runButtonExp("message_bt_save"),                 visible: visibleButtons.has("message_bt_save") },
      { label: "LOAD",   action: () => runButtonExp("message_bt_load"),                 visible: visibleButtons.has("message_bt_load") },
      { label: "SKIP",   action: () => runButtonExp("message_bt_skip", handleSkipOpen), visible: visibleButtons.has("message_bt_skip") },
      { label: "LOG",    action: () => runButtonExp("message_bt_bklog", handleLogOpen), visible: uiState.historyEnabled && visibleButtons.has("message_bt_bklog") },
      { label: "CONFIG", action: () => runButtonExp("message_bt_config"),               visible: visibleButtons.has("message_bt_config") },
      { label: "TITLE",  action: () => runButtonExp("message_bt_title", handleTitle),   visible: uiState.startAnchorEnabled && visibleButtons.has("message_bt_title") },
    ],
    [handleLogOpen, handleSkipOpen, handleTitle, runButtonExp, uiState.historyEnabled, uiState.startAnchorEnabled, visibleButtons]
  );

  const autoActive = navigation.isAutoPlay;
  const autoStyle: React.CSSProperties = {
    ...BTN,
    background: autoActive ? "#ECE14B" : isAutoHovered ? "#FFF89E" : "#F2F3F5",
    border: autoActive ? "2px solid #FFF89E" : isAutoHovered ? "2px solid #ECE14B" : "1px solid #F2F3F5",
  };
  const autoSpanColor = autoActive || isAutoHovered ? "#4C2A20" : "#364A63";

  const menuStyle: React.CSSProperties = {
    ...BTN,
    background: isMenuOpen ? "rgba(36, 75, 111, 0.7)" : isMenuHovered ? "#244B6F" : "#F2F3F5",
    border: isMenuOpen || isMenuHovered ? "1px solid #364A63" : "1px solid #F2F3F5",
  };
  const menuSpanColor = isMenuOpen || isMenuHovered ? "#F2F3F5" : "#364A63";

  return (
    <>
      <nav
        className="absolute flex flex-row items-center"
        style={{ top: 17, right: 8, gap: 8 }}
      >
        <button
          aria-label="AUTO"
          onClick={handleAutoPlay}
          onMouseEnter={() => setIsAutoHovered(true)}
          onMouseLeave={() => setIsAutoHovered(false)}
          style={autoStyle}
        >
          <span style={{ ...SPAN, color: autoSpanColor }}>AUTO</span>
        </button>

        <div style={{ position: "relative" }}>
          <button
            aria-label="MENU"
            onClick={handleMenuToggle}
            onMouseEnter={() => setIsMenuHovered(true)}
            onMouseLeave={() => setIsMenuHovered(false)}
            style={menuStyle}
          >
            <span style={{ ...SPAN, color: menuSpanColor }}>MENU</span>
          </button>
          {isMenuOpen && (
            <MenuPanel
              onFullscreen={handleFullscreen}
              onLog={handleLogOpen}
              onSkip={handleSkipOpen}
            />
          )}
        </div>
      </nav>

      <SkipModal isOpen={navigation.isSkipModalOpen} onClose={handleSkipClose} onConfirm={handleSkipConfirm} />
    </>
  );
};
