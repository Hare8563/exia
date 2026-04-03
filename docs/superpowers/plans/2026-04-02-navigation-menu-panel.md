# Navigation Menu Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a MENU dropdown panel (fullscreen/log/skip) and hover/pressed states to AUTO and MENU buttons in the Navigation component.

**Architecture:** Two tasks — first build the isolated `MenuPanel` component, then refactor `Navigation` to extract AUTO from the items loop, add MENU button with isMenuOpen state, and wire hover/pressed styles. Both AUTO and MENU become hardcoded buttons rendered outside the KAG items map.

**Tech Stack:** React, TypeScript, Tailwind CSS, inline styles, `@heroicons/react` (already installed), Vitest + @testing-library/react

---

## File Map

| File | Change |
|------|--------|
| `src/components/modules/Navigation/MenuPanel.tsx` | Create — 3 icon buttons (fullscreen, log, skip) |
| `src/components/modules/Navigation/index.tsx` | Modify — extract AUTO, add MENU + isMenuOpen, hover styles, import MenuPanel |
| `src/tests/MenuPanel.test.tsx` | Create — 4 tests: renders 3 buttons, each callback fires |
| `src/tests/Navigation.test.tsx` | Modify — extend with MENU button and panel open/close tests |

---

## Task 1: MenuPanel component

**Files:**
- Create: `src/components/modules/Navigation/MenuPanel.tsx`
- Create: `src/tests/MenuPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/tests/MenuPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MenuPanel } from '@/components/modules/Navigation/MenuPanel'

afterEach(cleanup)

describe('MenuPanel', () => {
  it('renders three icon buttons', () => {
    render(<MenuPanel onFullscreen={vi.fn()} onLog={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'fullscreen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'log' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'skip' })).not.toBeNull()
  })

  it('calls onFullscreen when fullscreen button clicked', () => {
    const onFullscreen = vi.fn()
    render(<MenuPanel onFullscreen={onFullscreen} onLog={vi.fn()} onSkip={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'fullscreen' }))
    expect(onFullscreen).toHaveBeenCalledOnce()
  })

  it('calls onLog when log button clicked', () => {
    const onLog = vi.fn()
    render(<MenuPanel onFullscreen={vi.fn()} onLog={onLog} onSkip={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'log' }))
    expect(onLog).toHaveBeenCalledOnce()
  })

  it('calls onSkip when skip button clicked', () => {
    const onSkip = vi.fn()
    render(<MenuPanel onFullscreen={vi.fn()} onLog={vi.fn()} onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: 'skip' }))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd F:/repo/exia && npx vitest run src/tests/MenuPanel.test.tsx
```

Expected: FAIL — `MenuPanel` does not exist yet.

- [ ] **Step 3: Implement MenuPanel**

Create `src/components/modules/Navigation/MenuPanel.tsx`:

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd F:/repo/exia && npx vitest run src/tests/MenuPanel.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/repo/exia && git add src/components/modules/Navigation/MenuPanel.tsx src/tests/MenuPanel.test.tsx
git commit -m "feat: add MenuPanel component with fullscreen/log/skip icon buttons"
```

---

## Task 2: Navigation refactor — AUTO extraction, MENU button, hover states

**Files:**
- Modify: `src/components/modules/Navigation/index.tsx`
- Modify: `src/tests/Navigation.test.tsx`

- [ ] **Step 1: Write new failing tests (append to existing file)**

Add these tests to `src/tests/Navigation.test.tsx` (after the existing two tests, inside the same `describe` block):

```tsx
  it('always renders a MENU button', () => {
    useKAGScenarioStore.setState({
      uiState: {
        buttons: [],
        historyEnabled: false,
        startAnchorEnabled: false,
      } as never,
    })
    render(<Navigation />)
    expect(screen.getByRole('button', { name: /MENU/i })).not.toBeNull()
  })

  it('shows MenuPanel when MENU button is clicked', () => {
    useKAGScenarioStore.setState({
      uiState: {
        buttons: [],
        historyEnabled: false,
        startAnchorEnabled: false,
      } as never,
    })
    render(<Navigation />)
    const menuBtn = screen.getByRole('button', { name: /MENU/i })
    fireEvent.click(menuBtn)
    expect(screen.getByRole('button', { name: 'fullscreen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'log' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'skip' })).not.toBeNull()
  })

  it('hides MenuPanel when document is clicked after MENU opens', () => {
    useKAGScenarioStore.setState({
      uiState: {
        buttons: [],
        historyEnabled: false,
        startAnchorEnabled: false,
      } as never,
    })
    render(<Navigation />)
    const menuBtn = screen.getByRole('button', { name: /MENU/i })
    fireEvent.click(menuBtn)
    // Panel is now open — click elsewhere
    fireEvent.click(document.body)
    expect(screen.queryByRole('button', { name: 'fullscreen' })).toBeNull()
  })
```

Also add `fireEvent` to the import at line 3:
```tsx
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
cd F:/repo/exia && npx vitest run src/tests/Navigation.test.tsx
```

Expected: 3 new tests FAIL — no MENU button, no MenuPanel.

- [ ] **Step 3: Implement Navigation changes**

Replace `src/components/modules/Navigation/index.tsx` with:

```tsx
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

  // AUTO is removed from items; KAG-controlled buttons only
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

  // AUTO button styles
  const autoActive = navigation.isAutoPlay;
  const autoStyle: React.CSSProperties = {
    ...BTN,
    background: autoActive ? "#ECE14B" : isAutoHovered ? "#FFF89E" : "#F2F3F5",
    border: autoActive ? "2px solid #FFF89E" : isAutoHovered ? "2px solid #ECE14B" : "1px solid #F2F3F5",
  };
  const autoSpanColor = autoActive || isAutoHovered ? "#4C2A20" : "#364A63";

  // MENU button styles
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
        {/* KAG-controlled buttons */}
        {items.filter(item => item.visible !== false).map((item, i) => (
          <button
            key={i}
            aria-label={item.label}
            onClick={() => item.action?.()}
            style={{ ...BTN, background: "#F2F3F5", border: "1px solid #F2F3F5" }}
          >
            <span style={{ ...SPAN, color: "#364A63" }}>{item.label}</span>
          </button>
        ))}

        {/* AUTO — hardcoded, visible when KAG enables message_bt_auto */}
        {visibleButtons.has("message_bt_auto") && (
          <button
            aria-label="AUTO"
            onClick={() => runButtonExp("message_bt_auto", handleAutoPlay)}
            onMouseEnter={() => setIsAutoHovered(true)}
            onMouseLeave={() => setIsAutoHovered(false)}
            style={autoStyle}
          >
            <span style={{ ...SPAN, color: autoSpanColor }}>AUTO</span>
          </button>
        )}

        {/* MENU — always visible, not KAG-controlled */}
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
```

- [ ] **Step 4: Run all Navigation tests**

```bash
cd F:/repo/exia && npx vitest run src/tests/Navigation.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd F:/repo/exia && npx vitest run
```

Expected: All tests PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
cd F:/repo/exia && git add src/components/modules/Navigation/index.tsx src/tests/Navigation.test.tsx
git commit -m "feat: add MENU panel, hover/pressed states, extract AUTO from items loop"
```
