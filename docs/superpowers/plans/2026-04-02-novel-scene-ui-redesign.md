# Novel Scene UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Figma design styles to DialogueLayout, Choice, and Navigation components in the novel scene.

**Architecture:** Three focused in-place edits — no new files. DialogueLayout gets a blue gradient + separator line + diamond indicator; Choice drops the dark overlay and gets light-styled buttons; Navigation replaces the PNG sprite system with CSS-only styled buttons.

**Tech Stack:** React, Tailwind CSS, inline styles for Figma-exact values, Vitest + @testing-library/react

---

## File Map

| File | Change |
|------|--------|
| `src/components/modules/Message/layouts.tsx` | Gradient, separator line, diamond indicator |
| `src/components/modules/Choice/index.tsx` | Remove overlay, restyle buttons |
| `src/components/modules/Navigation/index.tsx` | Replace `SpriteButton` with CSS button |
| `src/tests/layouts.test.tsx` | New test file |
| `src/tests/Choice.test.tsx` | New test file |
| `src/tests/Navigation.test.tsx` | New test file |

---

## Task 1: DialogueLayout — blue gradient + separator + diamond

**Files:**
- Modify: `src/components/modules/Message/layouts.tsx`
- Create: `src/tests/layouts.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/tests/layouts.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DialogueLayout } from '@/components/modules/Message/layouts'

describe('DialogueLayout', () => {
  it('applies blue gradient background', () => {
    const { container } = render(
      <DialogueLayout showArrowIcon={false} isAutoPlay={false}>text</DialogueLayout>
    )
    const box = container.firstElementChild as HTMLElement
    expect(box.style.background).toContain('rgba(0, 18, 28')
  })

  it('renders separator line when characterName is provided', () => {
    const { container } = render(
      <DialogueLayout characterName="星野" showArrowIcon={false} isAutoPlay={false}>text</DialogueLayout>
    )
    const hr = container.querySelector('[data-testid="dialogue-separator"]')
    expect(hr).not.toBeNull()
  })

  it('does not render separator line when characterName is absent', () => {
    const { container } = render(
      <DialogueLayout showArrowIcon={false} isAutoPlay={false}>text</DialogueLayout>
    )
    const hr = container.querySelector('[data-testid="dialogue-separator"]')
    expect(hr).toBeNull()
  })

  it('renders diamond indicator when showArrowIcon=true and not autoplay', () => {
    const { container } = render(
      <DialogueLayout showArrowIcon={true} isAutoPlay={false}>text</DialogueLayout>
    )
    const diamond = container.querySelector('[data-testid="dialogue-diamond"]')
    expect(diamond).not.toBeNull()
  })

  it('hides diamond indicator during autoplay', () => {
    const { container } = render(
      <DialogueLayout showArrowIcon={true} isAutoPlay={true}>text</DialogueLayout>
    )
    const diamond = container.querySelector('[data-testid="dialogue-diamond"]')
    expect(diamond).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd F:/repo/exia && npx vitest run src/tests/layouts.test.tsx
```

Expected: FAIL — `data-testid` attributes and gradient not yet present.

- [ ] **Step 3: Implement DialogueLayout**

Replace the content of `src/components/modules/Message/layouts.tsx`:

```tsx
import { FC } from "react";
import { MessageLayoutProps } from "@/types";

export const DialogueLayout: FC<MessageLayoutProps> = ({ characterName, children, showArrowIcon, isAutoPlay }) => (
  <div
    className="absolute bottom-0 left-0 w-full"
    style={{
      height: 248,
      background: "linear-gradient(360deg, rgba(0, 18, 28, 0.49) 2.02%, rgba(0, 84, 130, 0) 100%)",
    }}
  >
    <div
      className="absolute bottom-0 left-0 w-full px-[133px] pb-8 flex flex-col gap-2"
      style={{ fontFamily: "'Rounded Mplus 1c', sans-serif" }}
    >
      {characterName && (
        <>
          <div
            style={{
              fontFamily: "'Rounded Mplus 1c Bold', sans-serif",
              fontWeight: 700,
              fontSize: 36,
              lineHeight: "53px",
              color: "#FFFFFF",
            }}
          >
            {characterName}
          </div>
          <hr
            data-testid="dialogue-separator"
            className="border-0"
            style={{ height: 1, background: "#FFFFFF", margin: 0 }}
          />
        </>
      )}
      <div
        style={{
          fontWeight: 400,
          fontSize: 24,
          lineHeight: "36px",
          color: "#FFFFFF",
        }}
      >
        {children}&nbsp;
      </div>
    </div>

    {showArrowIcon && !isAutoPlay && (
      <div
        data-testid="dialogue-diamond"
        className="absolute"
        style={{
          width: 22,
          height: 22,
          right: 110,
          bottom: 16,
          background: "#59F0FE",
          border: "4px solid #244B6E",
          transform: "rotate(45deg)",
        }}
      />
    )}
  </div>
);

// ナレーション表示レイアウト（変更なし）
export const NarrationLayout: FC<MessageLayoutProps> = ({ children, showArrowIcon, isAutoPlay }) => (
  <div className="absolute bottom-0 left-0 p-4 w-full text-center">
    <div
      className="relative flex flex-col justify-center items-center gap-4 text-white md:text-lg w-full bg-black bg-opacity-80 min-h-24 py-6 px-4 drop-shadow-md"
      style={{
        textShadow: "1px 1px 0 rgba(0,0,0,.5)",
      }}
    >
      <div className="leading-relaxed">{children}</div>
      {showArrowIcon && !isAutoPlay && (
        <div
          data-testid="dialogue-diamond"
          className="absolute bottom-2 right-2"
          style={{
            width: 22,
            height: 22,
            background: "#59F0FE",
            border: "4px solid #244B6E",
            transform: "rotate(45deg)",
          }}
        />
      )}
    </div>
  </div>
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd F:/repo/exia && npx vitest run src/tests/layouts.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/repo/exia && git add src/components/modules/Message/layouts.tsx src/tests/layouts.test.tsx
git commit -m "feat: apply Figma design to DialogueLayout (blue gradient, separator, diamond)"
```

---

## Task 2: Choice — remove dark overlay, light-styled buttons

**Files:**
- Modify: `src/components/modules/Choice/index.tsx`
- Create: `src/tests/Choice.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/tests/Choice.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Choice } from '@/components/modules/Choice'

const choices = [
  { text: "Hello, Hoshino!", jumpTo: "label1" },
  { text: "Goodbye!", jumpTo: "label2" },
]

describe('Choice', () => {
  it('does not render a full-screen black overlay', () => {
    const { container } = render(<Choice choices={choices} onSelect={() => {}} />)
    // Must not have a fixed inset-0 bg-black element
    const overlay = container.querySelector('.fixed.inset-0.bg-black')
    expect(overlay).toBeNull()
  })

  it('renders all choice texts', () => {
    render(<Choice choices={choices} onSelect={() => {}} />)
    expect(screen.getByText("Hello, Hoshino!")).not.toBeNull()
    expect(screen.getByText("Goodbye!")).not.toBeNull()
  })

  it('renders buttons with light background color', () => {
    const { container } = render(<Choice choices={choices} onSelect={() => {}} />)
    const buttons = container.querySelectorAll('button')
    buttons.forEach(btn => {
      expect(btn.style.background).toBe('#F2F3F5')
    })
  })

  it('renders button text in dark blue color', () => {
    const { container } = render(<Choice choices={choices} onSelect={() => {}} />)
    const spans = container.querySelectorAll('span')
    spans.forEach(span => {
      expect(span.style.color).toBe('#364A63')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd F:/repo/exia && npx vitest run src/tests/Choice.test.tsx
```

Expected: FAIL — overlay exists, colors are wrong.

- [ ] **Step 3: Implement Choice**

Replace `src/components/modules/Choice/index.tsx`:

```tsx
import React from "react";
import { ScenarioChoice } from "@/types";

type ChoiceProps = {
  choices: ScenarioChoice[];
  onSelect: (choice: ScenarioChoice) => void;
};

export const Choice: React.FC<ChoiceProps> = ({ choices, onSelect }) => {
  return (
    <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-auto"
      style={{ gap: 25 }}>
      {choices.map((choice, index) => (
        <button
          key={index}
          onClick={() => onSelect(choice)}
          className="w-full pointer-events-auto"
          style={{
            maxWidth: 656,
            height: 63,
            background: "#F2F3F5",
            borderRadius: 2,
            border: "none",
            filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.25)) drop-shadow(0px 4px 4px rgba(0,0,0,0.25))",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Rounded Mplus 1c', sans-serif",
              fontWeight: 500,
              fontSize: 24,
              color: "#364A63",
              textAlign: "center",
            }}
          >
            {choice.text}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Choice;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd F:/repo/exia && npx vitest run src/tests/Choice.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/repo/exia && git add src/components/modules/Choice/index.tsx src/tests/Choice.test.tsx
git commit -m "feat: apply Figma design to Choice (light buttons, remove dark overlay)"
```

---

## Task 3: Navigation — CSS-only styled buttons replacing SpriteButton

**Files:**
- Modify: `src/components/modules/Navigation/index.tsx`
- Create: `src/tests/Navigation.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/tests/Navigation.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Navigation } from '@/components/modules/Navigation'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

// Minimal mock store setup
vi.mock('@/states/navigationStore', () => ({
  useNavigationStore: () => ({
    navigation: { isAutoPlay: false, isLogOpen: false, isSkipModalOpen: false },
    setNavigation: vi.fn(),
  }),
}))
vi.mock('@/states/skipActionStore', () => ({
  useSkipActionStore: () => ({ skipAction: { skipToNextChoice: vi.fn() } }),
}))
vi.mock('@/scene-manager/sceneStore', () => ({
  useSceneStore: () => vi.fn(),
}))
vi.mock('@/components/modules/Message/hooks/useKAGScenarioManager', () => ({
  useKAGScenarioManager: () => ({ executeButtonExp: vi.fn(), skipToNextChoice: vi.fn() }),
}))

describe('Navigation', () => {
  it('renders visible buttons as text labels, not background images', () => {
    useKAGScenarioStore.setState({
      uiState: {
        buttons: [
          { graphic: 'message_bt_auto', visible: true },
          { graphic: 'message_bt_skip', visible: true },
        ],
        historyEnabled: false,
        startAnchorEnabled: false,
      } as never,
    })
    const { container } = render(<Navigation />)
    const buttons = container.querySelectorAll('button')
    buttons.forEach(btn => {
      // CSS button: no backgroundImage sprite
      expect(btn.style.backgroundImage).toBe('')
    })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders AUTO button with Figma dimensions', () => {
    useKAGScenarioStore.setState({
      uiState: {
        buttons: [{ graphic: 'message_bt_auto', visible: true }],
        historyEnabled: false,
        startAnchorEnabled: false,
      } as never,
    })
    render(<Navigation />)
    const btn = screen.getByRole('button', { name: /AUTO/i })
    expect(btn.style.width).toBe('134px')
    expect(btn.style.height).toBe('47px')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd F:/repo/exia && npx vitest run src/tests/Navigation.test.tsx
```

Expected: FAIL — buttons currently use `backgroundImage` sprite URLs.

- [ ] **Step 3: Implement CSS Navigation button**

In `src/components/modules/Navigation/index.tsx`:

1. Remove the `FRAME_SIZE` constant and the entire `SpriteButton` component.
2. Replace `SpriteButton` usage in the `<nav>` with a new inline CSS button.

The new `<nav>` section becomes:

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd F:/repo/exia && npx vitest run src/tests/Navigation.test.tsx
```

Expected: Both tests PASS.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd F:/repo/exia && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/repo/exia && git add src/components/modules/Navigation/index.tsx src/tests/Navigation.test.tsx
git commit -m "feat: replace SpriteButton with CSS-only styled buttons in Navigation"
```
