# Novel Scene UI Redesign — Design Spec

**Date:** 2026-04-02  
**Branch:** refactoring  
**Source:** Figma design + novel.css

---

## Overview

Apply the Figma design spec to the three Novel scene UI components:
`DialogueLayout`, `Choice`, `Navigation`.

---

## 1. DialogueLayout (`src/components/modules/Message/layouts.tsx`)

### Background
- Gradient: `linear-gradient(360deg, rgba(0, 18, 28, 0.49) 2.02%, rgba(0, 84, 130, 0) 100%)`
- Height: 248px (absolute, bottom-0)

### Character Name
- Font: `'Rounded Mplus 1c Bold'`, 700, 36px
- Color: white
- Left offset: ~133px from left edge of the full-width container

### Separator Line
- 1px solid white horizontal rule, between character name and dialogue text
- Width: spans dialogue text area (~1056px / full inner width minus left margin)

### Dialogue Text
- Font: `'Rounded Mplus 1c'`, 400, 24px
- Color: white
- Left offset matching character name

### Advance Indicator (diamond)
- Replaces current `ChevronDoubleDownIcon`
- Shape: 22×22px rotated square (CSS rotate 45deg or `rotate(-180deg)`)
- Fill: `#59F0FE`
- Border: 4px solid `#244B6E`
- Position: bottom-right of dialogue box, absolute

---

## 2. Choice (`src/components/modules/Choice/index.tsx`)

- Remove full-screen black overlay (`fixed inset-0 bg-black`)
- Choice container: centered vertically, flex-col, gap 25px
- Each button:
  - Width: min(656px, full) — `max-w-[656px] w-full`
  - Height: 63px
  - Background: `#F2F3F5`
  - Border-radius: 2px
  - Drop shadow: `drop-shadow(0px 4px 4px rgba(0,0,0,0.25))` × 2
  - Text: `'Rounded Mplus 1c'`, 500, 24px, color `#364A63`
  - Text align: center

---

## 3. Navigation (`src/components/modules/Navigation/index.tsx`)

- Replace `SpriteButton` component with a CSS-only styled button
- Container: `absolute top-0 right-0`, flex-row, gap, padding: right 8px, top 17px
- Each button:
  - Size: 134×47px
  - Background: `#F2F3F5`
  - Border: 1px solid `#F2F3F5`
  - Border-radius: 2px
  - Filter: `drop-shadow(0px 8px 4px rgba(0,0,0,0.25))`
  - Label text: `'Rounded Mplus 1c Bold'`, 700, 24px, color `#364A63`
  - Text transform (skew): `matrix(1, 0, -0.29, 0.96, 0, 0)`

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/modules/Message/layouts.tsx` | DialogueLayout gradient, separator, diamond indicator |
| `src/components/modules/Choice/index.tsx` | Remove overlay, restyle buttons |
| `src/components/modules/Navigation/index.tsx` | Replace SpriteButton with CSS button |
