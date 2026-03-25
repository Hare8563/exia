# BGM Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add BGM playback that plays looping audio files from `public/sounds/bgm/`, switchable at the scenario level and per-line mid-scene.

**Architecture:** `currentBgmFile` (the actively-playing BGM filename) is stored in Zustand. A new `Bgm` component reads it and renders `<audio key={currentBgmFile} loop autoPlay>` — the `key` prop stops the old audio and starts the new one whenever the BGM changes, while the same BGM continues uninterrupted across lines that don't change it. Five update paths in `useScenarioManager` write `currentBgmFile` when a line is shown or a scenario loads.

**Tech Stack:** TypeScript, React 18, Zustand, Vitest (`tsc --noEmit` for type verification — no jsdom)

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `bgmFile?: string` to `NarrationLine` and `DialogueLine` |
| `src/states/scenarioStore.ts` | Add `currentBgmFile: string \| undefined` to `ScenarioState` and initial state |
| `src/components/modules/Bgm/index.tsx` | NEW — BGM playback component |
| `src/components/modules/Message/hooks/useScenarioManager.ts` | Six targeted edits (overrides type, 4 setScenario calls, 1 read) |
| `src/components/screens/MainScreen/index.tsx` | Import `<Bgm />`, add to JSX, set `currentBgmFile` on initial load |

---

### Task 1: Add `bgmFile?` to TypeScript types

**Files:**
- Modify: `src/types/index.ts`

**Context:** `NarrationLine` is around line 55–65, `DialogueLine` is around line 67–77. Both already have `voice?: string` as the last field. `ChoiceLine` (type 2) does **not** get `bgmFile`.

- [ ] **Step 1: Add `bgmFile?: string` to `NarrationLine`**

After `voice?: string`, add `bgmFile?: string`:

```ts
export type NarrationLine = {
  id?: string;
  type: 0;
  text: string;
  character?: ScenarioLineCharacter;
  cutIn?: ScenarioCutIn;
  backgroundFile?: string;
  jumpTo?: string;
  if?: ScenarioCondition;
  voice?: string;
  bgmFile?: string;
};
```

- [ ] **Step 2: Add `bgmFile?: string` to `DialogueLine`**

```ts
export type DialogueLine = {
  id?: string;
  type: 1;
  text: string;
  character?: ScenarioLineCharacter;
  cutIn?: ScenarioCutIn;
  backgroundFile?: string;
  jumpTo?: string;
  if?: ScenarioCondition;
  voice?: string;
  bgmFile?: string;
};
```

- [ ] **Step 3: Run type check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add bgmFile field to NarrationLine and DialogueLine types"
```

---

### Task 2: Add `currentBgmFile` to scenarioStore

**Files:**
- Modify: `src/states/scenarioStore.ts`

**Context:** `ScenarioState` extends `Scenario`. `currentBgmFile` is a runtime-tracking field that belongs on `ScenarioState` only (not on the `Scenario` type — that already has a top-level `bgmFile` which is the scenario-level default).

Current file:

```ts
interface ScenarioState extends Scenario {
  currentCharacterIndex: number
  currentLine: DisplayLine | undefined
  logs: ScenarioLogEntry[]
  isFetched: boolean
  currentFilePath: string
  flags: Record<string, FlagValue>
}
```

Initial state object:

```ts
scenario: {
  id: '',
  backgroundFile: 'bg_01.webp',
  characters: [],
  lines: [],
  currentCharacterIndex: -1,
  currentLineIndex: 0,
  currentLine: undefined,
  logs: [],
  isFetched: false,
  currentFilePath: 'scenarios/main',
  flags: {},
},
```

- [ ] **Step 1: Add `currentBgmFile` to the `ScenarioState` interface**

```ts
interface ScenarioState extends Scenario {
  currentCharacterIndex: number
  currentLine: DisplayLine | undefined
  logs: ScenarioLogEntry[]
  isFetched: boolean
  currentFilePath: string
  flags: Record<string, FlagValue>
  currentBgmFile: string | undefined
}
```

- [ ] **Step 2: Add `currentBgmFile` to the initial state object**

```ts
scenario: {
  id: '',
  backgroundFile: 'bg_01.webp',
  characters: [],
  lines: [],
  currentCharacterIndex: -1,
  currentLineIndex: 0,
  currentLine: undefined,
  logs: [],
  isFetched: false,
  currentFilePath: 'scenarios/main',
  flags: {},
  currentBgmFile: undefined,
},
```

- [ ] **Step 3: Run type check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/states/scenarioStore.ts
git commit -m "feat: add currentBgmFile to scenarioStore"
```

---

### Task 3: Create Bgm component

**Files:**
- Create: `src/components/modules/Bgm/index.tsx`

**Context:** Mirrors the `Voice` component pattern. `key={currentBgmFile}` causes React to remount the `<audio>` element when the BGM changes (stopping the old audio, starting the new one). When the same BGM plays across consecutive lines, the key doesn't change and audio continues uninterrupted.

- [ ] **Step 1: Create the file**

```tsx
import React from 'react'
import { useScenarioStore } from '@/states/scenarioStore'

export const Bgm: React.FC = () => {
  const currentBgmFile = useScenarioStore((s) => s.scenario.currentBgmFile)

  if (!currentBgmFile) return null

  return (
    <audio
      key={currentBgmFile}
      src={`/sounds/bgm/${currentBgmFile}`}
      autoPlay
      loop
      style={{ display: 'none' }}
    />
  )
}
```

- `!currentBgmFile` handles both `undefined` (no BGM set) and `""` (BGM stopped explicitly).
- `loop` makes BGM repeat continuously.
- `style={{ display: 'none' }}` hides the element.

- [ ] **Step 2: Run type check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/Bgm/index.tsx
git commit -m "feat: add Bgm component for looping audio playback"
```

---

### Task 4: Update useScenarioManager

**Files:**
- Modify: `src/components/modules/Message/hooks/useScenarioManager.ts`

**Context:** Six targeted edits. Read the file before making changes to confirm line numbers.

**Edit 1 — `advanceToDisplayLine` overrides type (lines 120–125):**

Rename `bgmFile` to `currentBgmFile` in the overrides parameter type:

Old:
```ts
overrides?: {
  id?: string;
  backgroundFile?: string;
  bgmFile?: string;
  currentFilePath?: string;
}
```

New:
```ts
overrides?: {
  id?: string;
  backgroundFile?: string;
  currentBgmFile?: string;
  currentFilePath?: string;
}
```

**Edit 2 — `advanceToDisplayLine` `setScenario` call (lines 154–163):**

Add conditional `currentBgmFile` for the display line's own `bgmFile` field:

Old:
```ts
setScenario((prev) => ({
  ...prev,
  ...overrides,
  lines,
  currentLineIndex: index,
  currentLine: line,
  currentCharacterIndex: charIndex,
  characters: updatedChars,
  flags: currentFlags,
}));
```

New:
```ts
setScenario((prev) => ({
  ...prev,
  ...overrides,
  lines,
  currentLineIndex: index,
  currentLine: line,
  currentCharacterIndex: charIndex,
  characters: updatedChars,
  flags: currentFlags,
  ...(line.type !== 2 && line.bgmFile !== undefined ? { currentBgmFile: line.bgmFile } : {}),
}));
```

Note: The `line.type !== 2` guard is needed because `ChoiceLine` has no `bgmFile` field.
Note: Line-level `bgmFile` (from the spread at the end) takes precedence over the scenario-level `currentBgmFile` in `overrides` (spread earlier). This is the correct priority order.

**Edit 3 — `performJump` keepState read (line 201):**

Old:
```ts
const baseBgm = keepState ? scenario.bgmFile : loaded.bgmFile;
```

New:
```ts
const baseBgm = keepState ? scenario.currentBgmFile : loaded.bgmFile;
```

Reason: `scenario.bgmFile` holds the scenario-file default. After a per-line BGM override, `scenario.currentBgmFile` holds the actively playing track. Using `bgmFile` would incorrectly reset to the scenario default across a `keepState: true` jump.

**Edit 4 — `performJump` overrides literal (lines 208–213):**

The `currentBgmFile` key must only be included when `keepState: false`. When `keepState: true`, omit it entirely so Zustand partial merge preserves the existing value.

Old:
```ts
{
  id: loaded.id,
  backgroundFile: baseBackground,
  bgmFile: baseBgm,
  currentFilePath: filePath,
}
```

New:
```ts
{
  id: loaded.id,
  backgroundFile: baseBackground,
  ...(keepState ? {} : { currentBgmFile: baseBgm }),
  currentFilePath: filePath,
}
```

**Edit 5 — `goToNextLine` direct path `setScenario` (lines 276–282):**

Old:
```ts
setScenario({
  currentLineIndex: nextLineIndex,
  currentLine: nextLine,
  currentCharacterIndex: nextCharIndex,
  characters: updatedCharacters,
  logs: updatedLogs,
});
```

New:
```ts
setScenario({
  currentLineIndex: nextLineIndex,
  currentLine: nextLine,
  currentCharacterIndex: nextCharIndex,
  characters: updatedCharacters,
  logs: updatedLogs,
  ...(nextLine.type !== 2 && nextLine.bgmFile !== undefined ? { currentBgmFile: nextLine.bgmFile } : {}),
});
```

**Edit 6 — `skipToNextChoice` `setScenario` (lines 353–359):**

Old:
```ts
setScenario({
  currentLineIndex: targetIndex,
  currentLine: nextLine,
  currentCharacterIndex: skipCharIndex,
  characters: updatedCharacters,
  logs: updatedLogs,
});
```

New:
```ts
setScenario({
  currentLineIndex: targetIndex,
  currentLine: nextLine,
  currentCharacterIndex: skipCharIndex,
  characters: updatedCharacters,
  logs: updatedLogs,
  ...(nextLine.type !== 2 && nextLine.bgmFile !== undefined ? { currentBgmFile: nextLine.bgmFile } : {}),
});
```

- [ ] **Step 1: Apply all 6 edits to `useScenarioManager.ts`**

Apply each edit above in order. Use the Edit tool for precise replacements.

- [ ] **Step 2: Run type check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/Message/hooks/useScenarioManager.ts
git commit -m "feat: update useScenarioManager to track currentBgmFile on line display"
```

---

### Task 5: Update MainScreen

**Files:**
- Modify: `src/components/screens/MainScreen/index.tsx`

**Context:** Two changes: (1) import and render `<Bgm />`, (2) set `currentBgmFile` in the initial `setScenario` call. The entry line itself may have a `bgmFile` field — if so, it takes priority over the scenario-level `bgmFile`.

Current `setScenario` call (lines 32–43):
```ts
setScenario({
  id: loaded.id,
  backgroundFile: loaded.backgroundFile,
  bgmFile: loaded.bgmFile,
  lines: loaded.lines,
  characters: loaded.characters,
  currentFilePath: 'scenarios/main',
  currentCharacterIndex: getCurrentCharacterIndex(loaded.lines, entryIndex),
  currentLineIndex: entryIndex,
  currentLine: loaded.lines[entryIndex] as DisplayLine,
  isFetched: true,
})
```

- [ ] **Step 1: Add `Bgm` import**

Add to existing imports:
```ts
import { Bgm } from '@/components/modules/Bgm'
```

- [ ] **Step 2: Add `<Bgm />` to the return JSX**

Add `<Bgm />` alongside the existing `<Voice />`:
```tsx
return (
  <>
    <Voice />
    <Bgm />
    <ThreeCanvas />
    <Message />
    <Navigation />
    <Log />
    <Loading />
  </>
)
```

- [ ] **Step 3: Set `currentBgmFile` in the `setScenario` call**

The entry line may have its own `bgmFile` — if so, it takes priority over the scenario-level `bgmFile`. Compute it before the `setScenario` call:

```ts
const entryLine = loaded.lines[entryIndex] as { bgmFile?: string }
const initialBgm = entryLine.bgmFile ?? loaded.bgmFile ?? undefined

setScenario({
  id: loaded.id,
  backgroundFile: loaded.backgroundFile,
  bgmFile: loaded.bgmFile,
  lines: loaded.lines,
  characters: loaded.characters,
  currentFilePath: 'scenarios/main',
  currentCharacterIndex: getCurrentCharacterIndex(loaded.lines, entryIndex),
  currentLineIndex: entryIndex,
  currentLine: loaded.lines[entryIndex] as DisplayLine,
  isFetched: true,
  currentBgmFile: initialBgm,
})
```

- [ ] **Step 4: Run type check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/MainScreen/index.tsx
git commit -m "feat: add Bgm component to MainScreen and set currentBgmFile on load"
```
