# Navigation Menu Panel — Design Spec

**Date:** 2026-04-02
**Branch:** refactoring
**Source:** Figma design + novel.css

---

## Overview

Add hover/pressed button states to AUTO and MENU buttons, and implement a dropdown panel that expands below MENU when clicked. The panel contains three icon buttons: Fullscreen, Log, and Skip.

---

## 1. Button States

### MENU button

| State | Background | Border | Text color |
|-------|-----------|--------|-----------|
| Default | `#F2F3F5` | `1px solid #F2F3F5` | `#364A63` |
| Hover | `#244B6F` | `1px solid #364A63` | `#F2F3F5` |
| Menu open (persistent) | `rgba(36, 75, 111, 0.7)` | `1px solid #364A63` | `#F2F3F5` |

- **No transient mouse-down pressed state needed for MENU.** The "open" state already occupies the pressed visual and persists while the panel is open. Only `onMouseEnter` / `onMouseLeave` are needed for hover.
- "Menu open" style is applied via `isMenuOpen` flag, not mouse handlers.

### AUTO button

| State | Background | Border | Text color |
|-------|-----------|--------|-----------|
| Default | `#F2F3F5` | `1px solid #F2F3F5` | `#364A63` |
| Hover | `#FFF89E` | `2px solid #ECE14B` | `#4C2A20` |
| Pressed / AutoPlay active | `#ECE14B` | `2px solid #FFF89E` | `#4C2A20` |

- "Pressed" state is maintained while `navigation.isAutoPlay === true`.

Both buttons retain the existing skew transform `matrix(1, 0, -0.29, 0.96, 0, 0)` and drop-shadow on all states.

---

## 2. MenuPanel Component

**File:** `src/components/modules/Navigation/MenuPanel.tsx`

### Layout

- Container: 256px wide, ~80px height
- Background: `rgba(242, 243, 245, 0.3)`
- Box shadow: `0px 4px 4px rgba(0, 0, 0, 0.25)`
- Border radius: 5px
- Transform: `matrix(1, 0, -0.15, 0.99, 0, 0)` (slight skew matching Figma)
- Position: The MENU button is wrapped in a `position: relative` `<div>`. `<MenuPanel>` is rendered as a sibling inside that wrapper with `position: absolute; top: 100%; right: 0` to anchor directly below the MENU button, right-aligned.

### Three icon buttons (equal width, horizontally arranged)

Each button:
- Background: `#2F4665`
- Border-radius: 5px
- Drop shadow: `filter: drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.25))`
- Size: ~63px × 55px (fills panel height with margin)
- Icon color: `#F2F3F5`

| Position | Icon (heroicons) | Action |
|----------|-----------------|--------|
| Left | `ArrowsPointingOutIcon` | Toggle fullscreen (`document.documentElement.requestFullscreen()` / `document.exitFullscreen()`) |
| Center | `Bars3Icon` | Open log (`handleLogOpen`) |
| Right | `ChevronDoubleRightIcon` | Open skip modal (`handleSkipOpen`) |

**Icon button interaction states:** No hover or pressed states for the three icon buttons — they are icon-only and respond only to `onClick`.

### Props

```ts
type MenuPanelProps = {
  onFullscreen: () => void
  onLog: () => void
  onSkip: () => void
}
```

---

## 3. Navigation Component Changes

**File:** `src/components/modules/Navigation/index.tsx`

### State

- Add `isMenuOpen: boolean` via `useState(false)`

### Interactions

- MENU button `onClick`: toggle `isMenuOpen`
- `useEffect`: when `isMenuOpen === true`, attach `document` click listener that sets `isMenuOpen(false)`. Clean up on unmount or when menu closes.
- The MENU button `onClick` calls `e.stopPropagation()` before toggling, preventing the document listener from immediately re-closing the panel on the same click.

### Rendering

**AUTO button** — is **extracted out of the `items` loop** and rendered as a hardcoded button alongside MENU (both rendered after the items loop). **Remove the AUTO entry from the `items` array** to avoid duplicate rendering. Visibility is still guarded by `visibleButtons.has("message_bt_auto")`. The button carries `aria-label="AUTO"`. Gains hover state via `onMouseEnter` / `onMouseLeave` on its own local `useState`. Pressed style applied when `navigation.isAutoPlay === true`. The skew transform `matrix(1, 0, -0.29, 0.96, 0, 0)` is applied to the inner `<span>` (text label only), not the `<button>` element — same as the current implementation.

**MENU button** — is a new, hardcoded button always visible and not KAG-controlled, rendered after the items loop alongside AUTO. It is wrapped in a `position: relative` `<div>` (the wrapper itself has no skew or transform). Inside that wrapper:
- The MENU `<button>` with hover style via `onMouseEnter` / `onMouseLeave`. No `onMouseDown`/`onMouseUp` needed — open state already provides the pressed visual.
- `<MenuPanel>` rendered as sibling when `isMenuOpen === true`, with `position: absolute; top: 100%; right: 0`.

**Existing KAG-controlled buttons** (SAVE, LOAD, SKIP, LOG, CONFIG, TITLE) remain in the items loop unchanged. The MENU panel's Log and Skip actions call the same `handleLogOpen` / `handleSkipOpen` handlers already present in Navigation.

### Fullscreen handler

```ts
const handleFullscreen = useCallback(() => {
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen()
  } else {
    void document.exitFullscreen()
  }
}, [])
```

---

## 4. Files Changed

| File | Change |
|------|--------|
| `src/components/modules/Navigation/index.tsx` | Add hover/pressed states for AUTO, add MENU button outside items loop, isMenuOpen logic |
| `src/components/modules/Navigation/MenuPanel.tsx` | New component — 3 icon buttons (fullscreen, log, skip) |
| `src/tests/MenuPanel.test.tsx` | New tests: renders 3 buttons, calls correct callbacks (onFullscreen, onLog, onSkip) |
| `src/tests/Navigation.test.tsx` | Extend: MENU button renders, clicking MENU opens panel, clicking document closes panel |
