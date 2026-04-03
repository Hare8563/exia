import React from "react";
import { ArrowsPointingOutIcon, Bars3Icon, ChevronDoubleRightIcon } from "@heroicons/react/24/solid";

type MenuPanelProps = {
  onFullscreen: () => void;
  onLog: () => void;
  onSkip: () => void;
};

const ICON_BUTTONS = [
  { label: "fullscreen", Icon: ArrowsPointingOutIcon, prop: "onFullscreen" as const },
  { label: "log",        Icon: Bars3Icon,              prop: "onLog"        as const },
  { label: "skip",       Icon: ChevronDoubleRightIcon, prop: "onSkip"       as const },
];

export const MenuPanel: React.FC<MenuPanelProps> = ({ onFullscreen, onLog, onSkip }) => {
  const handlers = { onFullscreen, onLog, onSkip };

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        width: 256,
        height: 80,
        background: "rgba(242, 243, 245, 0.3)",
        boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
        borderRadius: 5,
        transform: "matrix(1, 0, -0.15, 0.99, 0, 0)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "8px 12px",
        gap: 8,
        zIndex: 100,
        marginTop: 17,
        marginRight: 5
      }}
    >
      {ICON_BUTTONS.map(({ label, Icon, prop }) => (
        <button
          key={label}
          aria-label={label}
          onClick={handlers[prop]}
          style={{
            width: 63,
            height: 55,
            background: "#2F4665",
            borderRadius: 5,
            border: "1px solid #2E4663",
            filter: "drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.25))",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 0,
          }}
        >
          <Icon style={{ width: 28, height: 28, color: "#F2F3F5" }} />
        </button>
      ))}
    </div>
  );
};
