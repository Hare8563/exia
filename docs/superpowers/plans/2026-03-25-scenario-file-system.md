# Scenario File System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static scenario import system with a dynamic file-based system supporting cross-file navigation, flags, and conditional branching.

**Architecture:** Scenarios are loaded at runtime via `fetch()` from `public/scenarios/`. A `jumpToResolver` utility parses path strings into `{ filePath, labelId }` using absolute-from-root or relative syntax. The `useScenarioManager` hook processes `flag`/`jump` line nodes silently and evaluates `if` conditions after line display.

**Tech Stack:** React 18, TypeScript 5 (strict), Zustand 4, Vite 5, Vitest (added in Task 1)

**Spec:** `docs/superpowers/specs/2026-03-25-scenario-file-system-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | Discriminated union for `ScenarioLine`; new types |
| `src/utils/jumpToResolver.ts` | Create | Parse jumpTo path string → `{ filePath, labelId }` |
| `src/utils/scenarioLoader.ts` | Create | `fetch()` JSON from `public/scenarios/` |
| `src/utils/index.ts` | Modify | Fix `getCurrentCharacterIndex` for new types |
| `src/states/scenarioStore.ts` | Modify | Add `currentFilePath` and `flags` fields |
| `src/components/modules/Message/hooks/useScenarioManager.ts` | Modify | flag/jump/if logic; cross-file jumps |
| `src/components/screens/MainScreen/index.tsx` | Modify | Dynamic load from entry point |
| `src/components/modules/Message/index.tsx` | Modify | Type narrowing for `currentLine.text` access |
| `public/scenarios/main.json` | Modify | Add `id: "entry"` line |
| `src/tests/jumpToResolver.test.ts` | Create | Unit tests for path resolution |

---

## Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/tests/jumpToResolver.test.ts` (stub only)

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Add vitest config to `vite.config.ts`**

Read `vite.config.ts` first, then add the `test` block:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Create stub test file to verify setup**

Create `src/tests/jumpToResolver.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('jumpToResolver', () => {
  it('placeholder', () => {
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 5: Run tests to verify vitest works**

```bash
npm test
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/tests/jumpToResolver.test.ts
git commit -m "chore: add vitest for unit testing"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace `ScenarioLine` with a discriminated union**

Open `src/types/index.ts`. Replace the existing `ScenarioChoice`, `ScenarioLine` types and add new types. The full updated types section should be:

```ts
export type FlagValue = boolean | number | string;

export type ScenarioCondition = {
  flag: string;
  equals?: FlagValue;
  gt?: number;
  lt?: number;
  then: string;
  else?: string;
};

export type ScenarioChoice = {
  text: string;
  jumpTo: string;
};

type ScenarioLineCharacter = {
  index: number;
  name?: string;
  imageFile?: string;
  animation?: string;
  isShow?: boolean;
  speakerId?: number;
};

export type NarrationLine = {
  id?: string;
  type: 0;
  text: string;
  character?: ScenarioLineCharacter;
  cutIn?: ScenarioCutIn;
  backgroundFile?: string;
  jumpTo?: string;
  if?: ScenarioCondition;
};

export type DialogueLine = {
  id?: string;
  type: 1;
  text: string;
  character?: ScenarioLineCharacter;
  cutIn?: ScenarioCutIn;
  backgroundFile?: string;
  jumpTo?: string;
  if?: ScenarioCondition;
};

export type ChoiceLine = {
  id?: string;
  type: 2;
  text: string;
  choices: ScenarioChoice[];
};

export type FlagLine = {
  id?: string;
  type: 'flag';
  set: Record<string, FlagValue>;
};

export type JumpLine = {
  id?: string;
  type: 'jump';
  to: string;
  keepState?: boolean;
};

export type DisplayLine = NarrationLine | DialogueLine | ChoiceLine;
export type ScenarioLine = DisplayLine | FlagLine | JumpLine;
```

Also remove the old inline `character` type definition from `ScenarioLine` (it is now `ScenarioLineCharacter`).

Update `ScenarioLogEntry` at the bottom:
```ts
export type ScenarioLogEntry = DisplayLine & {
  character?: CharacterInfo;
};
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: Errors appear in files that access `.text` or `.character` directly on `ScenarioLine` without narrowing. Note these files — they will be fixed in subsequent tasks.

- [ ] **Step 3: Commit types**

```bash
git add src/types/index.ts
git commit -m "feat: update ScenarioLine to discriminated union with flag/jump nodes"
```

---

## Task 3: Create `jumpToResolver`

**Files:**
- Create: `src/utils/jumpToResolver.ts`
- Modify: `src/tests/jumpToResolver.test.ts`

- [ ] **Step 1: Write failing tests**

Replace `src/tests/jumpToResolver.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { resolveJumpTo } from '@/utils/jumpToResolver'

describe('resolveJumpTo', () => {
  // Absolute paths (no ./ or ../ prefix)
  it('resolves absolute path from root', () => {
    expect(resolveJumpTo('main::entry', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/main', labelId: 'entry' })
  })

  it('resolves absolute nested path from root', () => {
    expect(resolveJumpTo('scenes/scene_01::scene', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/scenes/scene_01', labelId: 'scene' })
  })

  // Relative paths
  it('resolves ./ as current file', () => {
    expect(resolveJumpTo('./::end', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/chapter1/scene_1', labelId: 'end' })
  })

  it('resolves ./file as sibling file', () => {
    expect(resolveJumpTo('./scene_2::start', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/chapter1/scene_2', labelId: 'start' })
  })

  it('resolves ../ as parent directory', () => {
    expect(resolveJumpTo('../main::hub', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/main', labelId: 'hub' })
  })

  it('resolves deeply nested absolute path', () => {
    expect(resolveJumpTo('a/b/c::label', 'scenarios/x/y'))
      .toEqual({ filePath: 'scenarios/a/b/c', labelId: 'label' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '@/utils/jumpToResolver'`

- [ ] **Step 3: Implement `jumpToResolver.ts`**

Create `src/utils/jumpToResolver.ts`:

```ts
/**
 * Resolves a jumpTo path string into a filePath and labelId.
 *
 * Path rules:
 *   - Starts with "./" or "../": relative to the directory of currentFilePath
 *   - Otherwise: absolute from "scenarios/" root
 *
 * Format: "<path>::<labelId>"
 * The file path omits the .json extension.
 */
export function resolveJumpTo(
  jumpTo: string,
  currentFilePath: string
): { filePath: string; labelId: string } {
  const separatorIndex = jumpTo.lastIndexOf('::')
  if (separatorIndex === -1) {
    throw new Error(`[Exia] Invalid jumpTo format (missing '::'): "${jumpTo}"`)
  }

  const pathPart = jumpTo.slice(0, separatorIndex)
  const labelId = jumpTo.slice(separatorIndex + 2)

  if (!labelId) {
    throw new Error(`[Exia] Invalid jumpTo format (empty labelId): "${jumpTo}"`)
  }

  let filePath: string

  if (pathPart.startsWith('./') || pathPart.startsWith('../')) {
    // Relative path — resolve against current file's directory
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))

    if (pathPart === './') {
      filePath = currentFilePath
    } else if (pathPart.startsWith('./')) {
      filePath = `${currentDir}/${pathPart.slice(2)}`
    } else {
      // Handle ../ by splitting and resolving
      const parts = currentDir.split('/')
      const relParts = pathPart.split('/')
      const resolved = [...parts]
      for (const part of relParts) {
        if (part === '..') {
          resolved.pop()
        } else if (part !== '.') {
          resolved.push(part)
        }
      }
      filePath = resolved.join('/')
    }
  } else {
    // Absolute path from scenarios/ root
    filePath = pathPart ? `scenarios/${pathPart}` : 'scenarios/main'
  }

  return { filePath, labelId }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/jumpToResolver.ts src/tests/jumpToResolver.test.ts
git commit -m "feat: add jumpToResolver utility with path resolution"
```

---

## Task 4: Create `scenarioLoader`

**Files:**
- Create: `src/utils/scenarioLoader.ts`

- [ ] **Step 1: Implement `scenarioLoader.ts`**

Create `src/utils/scenarioLoader.ts`:

```ts
import type { Scenario } from '@/types'

/**
 * Loads a scenario JSON file from public/.
 *
 * @param filePath - Path without .json extension, e.g. "scenarios/main"
 * @returns Parsed Scenario object
 * @throws Error if fetch fails or response is not ok
 */
export async function loadScenario(filePath: string): Promise<Scenario> {
  const url = `/${filePath}.json`
  let response: Response

  try {
    response = await fetch(url)
  } catch {
    throw new Error(`[Exia] Failed to load scenario: ${filePath}.json (network error)`)
  }

  if (!response.ok) {
    throw new Error(`[Exia] Failed to load scenario: ${filePath}.json (HTTP ${response.status})`)
  }

  const data = await response.json() as Scenario
  return { ...data, logs: [] }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/scenarioLoader.ts
git commit -m "feat: add scenarioLoader utility"
```

---

## Task 5: Fix `getCurrentCharacterIndex` for new types

**Files:**
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Update the utility to narrow types**

Open `src/utils/index.ts`. Replace the existing function:

```ts
import { ScenarioLine } from '@/types'

export const getCurrentCharacterIndex = (lines: ScenarioLine[], currentLineIndex: number): number => {
  const line = lines[currentLineIndex]
  if (!line) return -1
  if (line.type === 'flag' || line.type === 'jump') return -1
  if (line.character === undefined) return -1
  return line.character.index
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: No errors in `src/utils/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/utils/index.ts
git commit -m "fix: update getCurrentCharacterIndex for discriminated ScenarioLine union"
```

---

## Task 6: Update `scenarioStore`

**Files:**
- Modify: `src/states/scenarioStore.ts`

- [ ] **Step 1: Add `currentFilePath` and `flags` to the store**

Open `src/states/scenarioStore.ts`. Replace the full file content:

```ts
import { create } from 'zustand'
import { DisplayLine, FlagValue, Scenario, ScenarioLogEntry } from '@/types'

interface ScenarioState extends Scenario {
  currentCharacterIndex: number
  currentLine: DisplayLine | undefined
  logs: ScenarioLogEntry[]
  isFetched: boolean
  currentFilePath: string
  flags: Record<string, FlagValue>
}

interface ScenarioStore {
  scenario: ScenarioState
  setScenario: (data: Partial<ScenarioState> | ((prev: ScenarioState) => ScenarioState)) => void
}

export const useScenarioStore = create<ScenarioStore>((set) => ({
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
  setScenario: (data) =>
    set((state) => ({
      scenario:
        typeof data === 'function'
          ? data(state.scenario)
          : { ...state.scenario, ...data },
    })),
}))
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: No errors in `src/states/scenarioStore.ts`. Errors may appear in consumers of `currentLine` — note them for Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/states/scenarioStore.ts
git commit -m "feat: add currentFilePath and flags to scenarioStore"
```

---

## Task 7: Update `useScenarioManager` — flag/jump/if logic

**Files:**
- Modify: `src/components/modules/Message/hooks/useScenarioManager.ts`

This is the core logic change. Read the full file before editing.

- [ ] **Step 1: Add imports**

At the top of `useScenarioManager.ts`, add:
```ts
import { resolveJumpTo } from '@/utils/jumpToResolver'
import { loadScenario } from '@/utils/scenarioLoader'
import { DisplayLine, FlagLine, JumpLine, ScenarioCondition } from '@/types'
```

- [ ] **Step 2: Add `isDisplayLine` type guard after imports**

```ts
function isDisplayLine(line: unknown): line is DisplayLine {
  const t = (line as { type?: unknown }).type
  return t === 0 || t === 1 || t === 2
}
```

- [ ] **Step 3: Add `evaluateCondition` helper**

Add this function inside the hook (after existing helpers):

```ts
const evaluateCondition = useCallback(
  (condition: ScenarioCondition): string | null => {
    const value = scenario.flags[condition.flag]
    let matched = false

    if ('equals' in condition && condition.equals !== undefined) {
      matched = value === condition.equals
    } else if ('gt' in condition && condition.gt !== undefined) {
      matched = typeof value === 'number' && value > condition.gt
    } else if ('lt' in condition && condition.lt !== undefined) {
      matched = typeof value === 'number' && value < condition.lt
    }

    if (matched) return condition.then
    return condition.else ?? null
  },
  [scenario.flags]
)
```

- [ ] **Step 4: Add `navigateRef` to break circular dependency**

`performJump` and `advanceToDisplayLine` call each other. To avoid a circular `useCallback` dependency, use a `useRef` to hold the `performJump` function and keep it in sync with `useEffect`. Add this near the top of the hook body (before either helper):

```ts
// Ref used by advanceToDisplayLine to call performJump without a circular useCallback dependency
const performJumpRef = useRef<(jumpTo: string, keepState?: boolean) => Promise<void>>(
  async () => {}
)
```

- [ ] **Step 5: Add `advanceToDisplayLine` helper**

This helper walks forward from a given index, silently applying `flag` nodes and following `jump` nodes, until it reaches a `DisplayLine` to show. It calls `performJumpRef.current` (not `performJump` directly) to avoid the circular dependency:

```ts
const advanceToDisplayLine = useCallback(
  async (
    startIndex: number,
    lines: typeof scenario.lines,
    characters: typeof scenario.characters,
    flags: typeof scenario.flags,
    overrides?: {
      id?: string
      backgroundFile?: string
      bgmFile?: string
      currentFilePath?: string
    }
  ) => {
    let index = startIndex
    let currentFlags = { ...flags }
    let currentChars = characters ? [...characters] : []

    while (index < lines.length) {
      const line = lines[index]

      if (line.type === 'flag') {
        currentFlags = { ...currentFlags, ...(line as FlagLine).set }
        index++
        continue
      }

      if (line.type === 'jump') {
        const jumpLine = line as JumpLine
        setScenario((prev) => ({ ...prev, flags: currentFlags }))
        await performJumpRef.current(jumpLine.to, jumpLine.keepState ?? false)
        return
      }

      if (!isDisplayLine(line)) {
        index++
        continue
      }

      // Found a display line — update state
      const updatedChars = updateCharacterInfo(line, currentChars)
      setScenario((prev) => ({
        ...prev,
        ...overrides,
        lines,
        currentLineIndex: index,
        currentLine: line,
        currentCharacterIndex: line.character !== undefined ? line.character.index : -1,
        characters: updatedChars,
        flags: currentFlags,
      }))
      return
    }

    setNavigation({ isAutoPlay: false })
  },
  [updateCharacterInfo, setScenario, setNavigation]
)
```

- [ ] **Step 6: Add `performJump` helper and sync it to the ref**

Add `performJump` after `advanceToDisplayLine`, then sync it to `performJumpRef` with a `useEffect`:

```ts
const performJump = useCallback(
  async (jumpTo: string, keepState: boolean = false) => {
    const { filePath, labelId } = resolveJumpTo(jumpTo, scenario.currentFilePath)
    const isSameFile = filePath === scenario.currentFilePath

    if (isSameFile) {
      const targetIndex = scenario.lines.findIndex((l) => l.id === labelId)
      if (targetIndex === -1) {
        console.error(`[Exia] Label '${labelId}' not found in ${filePath}.json`)
        return
      }
      await advanceToDisplayLine(targetIndex, scenario.lines, scenario.characters ?? [], scenario.flags)
    } else {
      let loaded
      try {
        loaded = await loadScenario(filePath)
      } catch (e) {
        console.error(e)
        return
      }

      const targetIndex = loaded.lines.findIndex((l) => l.id === labelId)
      if (targetIndex === -1) {
        console.error(`[Exia] Label '${labelId}' not found in ${filePath}.json`)
        return
      }

      const baseCharacters = keepState ? scenario.characters ?? [] : loaded.characters ?? []
      const baseBackground = keepState ? scenario.backgroundFile : loaded.backgroundFile
      const baseBgm = keepState ? scenario.bgmFile : loaded.bgmFile

      await advanceToDisplayLine(
        targetIndex,
        loaded.lines,
        baseCharacters,
        scenario.flags,
        {
          id: loaded.id,
          backgroundFile: baseBackground,
          bgmFile: baseBgm,
          currentFilePath: filePath,
        }
      )
    }
  },
  [scenario, advanceToDisplayLine]
)

// Keep the ref in sync so advanceToDisplayLine always calls the latest performJump
useEffect(() => {
  performJumpRef.current = performJump
}, [performJump])
```

- [ ] **Step 7: Note on `findLineIndexById`**

`findLineIndexById` is no longer called directly — cross-file logic lives in `performJump`. Same-file label lookup inside `performJump` uses `lines.findIndex` inline. You may remove `findLineIndexById` from the hook if it is unused after the above changes, or leave it — the type-check step will flag it if `noUnusedLocals` is enabled.

- [ ] **Step 8: Update `goToNextLine` to use new helpers** *(was Step 7)*

Replace the `goToNextLine` callback:

```ts
const goToNextLine = useCallback(async () => {
  if (isShowingChoices) return false

  const currentLine = scenario.currentLine
  if (!currentLine) return false

  // jumpTo takes precedence over if
  if (currentLine.jumpTo) {
    await performJump(currentLine.jumpTo)
    return true
  }

  // if condition
  if (currentLine.if) {
    const jumpTarget = evaluateCondition(currentLine.if)
    if (jumpTarget) {
      await performJump(jumpTarget)
      return true
    }
    // condition false and no else — fall through to next line
  }

  const nextLineIndex = scenario.currentLineIndex + 1
  if (nextLineIndex > scenario.lines.length - 1) {
    setNavigation({ isAutoPlay: false })
    return false
  }

  const nextLine = scenario.lines[nextLineIndex]

  // Handle flag/jump nodes silently
  if (nextLine.type === 'flag' || nextLine.type === 'jump') {
    const updatedLogs = addCurrentLineToLogs()
    setScenario((prev) => ({ ...prev, logs: updatedLogs }))
    await advanceToDisplayLine(nextLineIndex, scenario.lines, scenario.characters ?? [], scenario.flags)
    return true
  }

  if (!isDisplayLine(nextLine)) return false

  if (nextLine.type === 2) {
    setIsShowingChoices(true)
  } else {
    setIsShowingChoices(false)
  }

  const updatedCharacters = updateCharacterInfo(nextLine, scenario.characters ? [...scenario.characters] : [])
  const updatedLogs = addCurrentLineToLogs()

  setScenario({
    currentLineIndex: nextLineIndex,
    currentLine: nextLine,
    currentCharacterIndex: nextLine.character !== undefined ? nextLine.character.index : -1,
    characters: updatedCharacters,
    logs: updatedLogs,
  })

  return true
}, [
  scenario,
  isShowingChoices,
  performJump,
  evaluateCondition,
  setNavigation,
  addCurrentLineToLogs,
  advanceToDisplayLine,
  updateCharacterInfo,
  setScenario,
])
```

- [ ] **Step 8: Update `handleChoiceSelect` to support cross-file jumpTo**

Replace `handleChoiceSelect`:

```ts
const handleChoiceSelect = useCallback(
  async (choice: ScenarioChoice) => {
    setIsShowingChoices(false)
    const updatedLogs = addCurrentLineToLogs()
    updatedLogs.push({ type: 0, text: `選択: ${choice.text}` } as ScenarioLogEntry)
    setScenario((prev) => ({ ...prev, logs: updatedLogs }))
    await performJump(choice.jumpTo)
  },
  [addCurrentLineToLogs, performJump, setScenario]
)
```

- [ ] **Step 9: Update `addCurrentLineToLogs` and `skipToNextChoice` for new types**

`addCurrentLineToLogs` is fine — `currentLine` is always a `DisplayLine`, no change needed.

Update `isScenarioEnd` since `lines` can now end with flag/jump nodes:

```ts
const isScenarioEnd = useCallback(() => {
  const remaining = scenario.lines.slice(scenario.currentLineIndex + 1)
  return !remaining.some(isDisplayLine)
}, [scenario.currentLineIndex, scenario.lines])
```

Update `skipToNextChoice` to narrow types when looking for the next choice, so it does not break on flag/jump nodes (per spec: flag side-effects are NOT applied during skip):

```ts
const skipToNextChoice = useCallback(() => {
  let updatedLogs = addCurrentLineToLogs()
  let index = scenario.currentLineIndex + 1
  while (index < scenario.lines.length) {
    const line = scenario.lines[index]
    if (isDisplayLine(line) && line.type === 2) break
    index++
  }
  const targetIndex = Math.min(index, scenario.lines.length - 1)
  const nextLine = scenario.lines[targetIndex]

  // If the scenario ends on flag/jump nodes with no display line, halt gracefully
  if (!isDisplayLine(nextLine)) {
    setNavigation({ isAutoPlay: false })
    return undefined
  }

  // Log skipped display lines (not flag/jump)
  for (let i = scenario.currentLineIndex + 1; i < targetIndex; i++) {
    const skipped = scenario.lines[i]
    if (!isDisplayLine(skipped)) continue
    const isAlreadyLogged = updatedLogs.some((log) => log.text === skipped.text)
    if (!isAlreadyLogged) {
      updatedLogs.push({ ...skipped, character: getCharacterInfoForLog(skipped) } as ScenarioLogEntry)
    }
  }

  if (nextLine.type === 2) setIsShowingChoices(true)

  const updatedCharacters = updateCharacterInfo(nextLine, scenario.characters ? [...scenario.characters] : [])
  setScenario({
    currentLineIndex: targetIndex,
    currentLine: nextLine,
    currentCharacterIndex: nextLine.character !== undefined ? nextLine.character.index : -1,
    characters: updatedCharacters,
    logs: updatedLogs,
  })
  setNavigation({ isAutoPlay: false })
  return nextLine
}, [
  scenario,
  addCurrentLineToLogs,
  updateCharacterInfo,
  getCharacterInfoForLog,
  setScenario,
  setNavigation,
])

- [ ] **Step 10: Type-check**

```bash
npm run type-check
```

Fix any remaining type errors. Common ones:
- `goToNextLine` return type changed from `boolean` to `Promise<boolean>` — update callers if needed
- `handleChoiceSelect` is now async — update callers if needed

- [ ] **Step 11: Commit**

```bash
git add src/components/modules/Message/hooks/useScenarioManager.ts
git commit -m "feat: add flag/jump/if handling and cross-file navigation to useScenarioManager"
```

---

## Task 8: Update `MainScreen` — dynamic entry point loading

**Files:**
- Modify: `src/components/screens/MainScreen/index.tsx`

- [ ] **Step 1: Replace static import with dynamic load**

Open `src/components/screens/MainScreen/index.tsx`. Replace the `useEffect` body:

```ts
import React, { useEffect } from 'react'
import { useScenarioStore } from '@/states/scenarioStore'
import { getCurrentCharacterIndex } from '@/utils'
import { loadScenario } from '@/utils/scenarioLoader'
import { Message } from '@/components/modules/Message'
import { Navigation } from '@/components/modules/Navigation'
import { Loading } from '@/components/modules/Loading'
import { Voice } from '@/components/modules/Voice'
import { Log } from '@/components/modules/Log'
import { ThreeCanvas } from '@/components/ThreeCanvas'

export const MainScreen: React.FC = () => {
  const { scenario, setScenario } = useScenarioStore()

  useEffect(() => {
    const loadEntry = async () => {
      if (scenario.isFetched) return

      try {
        const loaded = await loadScenario('scenarios/main')
        const entryIndex = loaded.lines.findIndex((l) => l.id === 'entry')

        if (entryIndex === -1) {
          throw new Error(
            "[Exia] Failed to load entry point: scenarios/main.json must exist and contain a line with id: 'entry'."
          )
        }

        // Do NOT spread scenario here — Zustand's setScenario merges with existing state.
        // Spreading a stale scenario snapshot would overwrite fields changed elsewhere.
        setScenario({
          id: loaded.id,
          backgroundFile: loaded.backgroundFile,
          bgmFile: loaded.bgmFile,
          lines: loaded.lines,
          characters: loaded.characters,
          currentFilePath: 'scenarios/main',
          currentCharacterIndex: getCurrentCharacterIndex(loaded.lines, entryIndex),
          currentLineIndex: entryIndex,
          currentLine: loaded.lines[entryIndex] as import('@/types').DisplayLine,
          isFetched: true,
        })
      } catch (error) {
        console.error(error)
        // TODO: Show error UI in a future task
      }
    }

    loadEntry()
  }, [scenario.isFetched, setScenario])

  return (
    <>
      <Voice />
      <ThreeCanvas />
      <Message />
      <Navigation />
      <Log />
      <Loading />
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/screens/MainScreen/index.tsx
git commit -m "feat: load scenario dynamically from public/scenarios/main.json entry point"
```

---

## Task 9: Fix `Message` component type narrowing

**Files:**
- Modify: `src/components/modules/Message/index.tsx`

`currentLine` is now typed as `DisplayLine | undefined`. The existing `scenario.currentLine.text` access is safe but TypeScript may flag `scenario.currentLine.type === 1` since `DisplayLine` only has `0 | 1 | 2`. The `choices` access needs narrowing.

- [ ] **Step 1: Update type-unsafe accesses**

In `src/components/modules/Message/index.tsx`, the `Layout` line and `choices` access:

```tsx
// Before
const Layout = scenario.currentLine.type === 1 ? DialogueLayout : NarrationLayout

// After — same logic, but now type-safe since currentLine is DisplayLine
const Layout = scenario.currentLine.type === 1 ? DialogueLayout : NarrationLayout
```

For `choices`, add a type guard:
```tsx
{isShowingChoices && scenario.currentLine.type === 2 && scenario.currentLine.choices && (
  <Choice choices={scenario.currentLine.choices} onSelect={handleChoiceSelect} />
)}
```

Also update the `handleNext` handler since `goToNextLine` is now `async`:
```tsx
const handleNext = () => {
  if (isReading) {
    if (typewriterInstance) {
      const currentText = scenario.currentLine?.text || ''
      typewriterInstance.stop().typeString(currentText).start()
      setIsReading(false)
      setIsShowArrowIcon(true)
    }
    return
  }
  if (!isScenarioEnd()) {
    void goToNextLine()
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/modules/Message/index.tsx
git commit -m "fix: add type narrowing for DisplayLine in Message component"
```

---

## Task 10: Set up `public/scenarios/main.json` entry point

**Files:**
- Modify: `public/scenarios/main.json`

- [ ] **Step 1: Replace stub content with a valid entry scenario**

Write `public/scenarios/main.json`:

```json
{
  "id": "S_MAIN",
  "backgroundFile": "bg_01.webp",
  "characters": [
    {
      "index": 0,
      "name": "渚",
      "imageFile": "chara_01.webp",
      "isShow": true,
      "speakerId": 3
    },
    {
      "index": 1,
      "name": "凛",
      "imageFile": "chara_02.webp",
      "isShow": true,
      "speakerId": 2
    }
  ],
  "lines": [
    {
      "id": "entry",
      "type": 0,
      "text": "ようこそ、Exiaノベルゲームエンジンへ！"
    }
  ]
}
```

- [ ] **Step 2: Start the dev server and verify the game loads**

```bash
npm run dev
```

Open the browser. Confirm:
- Game starts without console errors
- The narration text `"ようこそ、Exiaノベルゲームエンジンへ！"` appears

- [ ] **Step 3: Commit**

```bash
git add public/scenarios/main.json
git commit -m "feat: add public/scenarios/main.json with entry point"
```

---

## Task 11: Manual integration tests

No automated tests for cross-file navigation (requires a running server). Verify manually.

- [ ] **Step 1: Add a second scenario file for testing**

Create `public/scenarios/chapter1/scene_1.json`:

```json
{
  "id": "S_CH1_SCENE1",
  "backgroundFile": "bg_01.webp",
  "characters": [
    {
      "index": 0,
      "name": "渚",
      "imageFile": "chara_01.webp",
      "isShow": true,
      "speakerId": 3
    }
  ],
  "lines": [
    {
      "id": "start",
      "type": 1,
      "character": { "index": 0 },
      "text": "第一章に来ました！"
    }
  ]
}
```

- [ ] **Step 2: Update `main.json` to jump to chapter1**

Note: `id: "entry"` must be on a `DisplayLine` (type 0, 1, or 2). Flag nodes cannot be the entry point since they are never set as `currentLine`. Put the `flag` node after the entry line:

```json
{
  "id": "S_MAIN",
  "backgroundFile": "bg_01.webp",
  "characters": [
    { "index": 0, "name": "渚", "imageFile": "chara_01.webp", "isShow": true, "speakerId": 3 },
    { "index": 1, "name": "凛", "imageFile": "chara_02.webp", "isShow": true, "speakerId": 2 }
  ],
  "lines": [
    { "id": "entry", "type": 0, "text": "メインメニューです。クリックで第一章へ。" },
    { "type": "flag", "set": { "visited_main": true } },
    { "type": "jump", "to": "chapter1/scene_1::start" }
  ]
}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Confirm:
1. The `flag` node is skipped silently
2. Narration text appears
3. Clicking advances to `chapter1/scene_1.json` and shows `"第一章に来ました！"`
4. No console errors

- [ ] **Step 4: Test `if` condition**

Update `main.json` to test conditional branching:

Note: `id: "entry"` must always be on a `DisplayLine`. Put the flag node after the entry line:

```json
{
  "lines": [
    { "id": "entry", "type": 0, "text": "ようこそ！（フラグテスト）" },
    { "type": "flag", "set": { "is_first_visit": true } },
    {
      "type": 0,
      "text": "ようこそ！",
      "if": {
        "flag": "is_first_visit",
        "equals": true,
        "then": "./::first_path",
        "else": "./::return_path"
      }
    },
    { "id": "first_path", "type": 0, "text": "初回訪問です。" },
    { "type": "jump", "to": "chapter1/scene_1::start" },
    { "id": "return_path", "type": 0, "text": "おかえりなさい。" },
    { "type": "jump", "to": "chapter1/scene_1::start" }
  ]
}
```

Confirm that clicking after "ようこそ！" goes to "初回訪問です。" (not "おかえりなさい。").

- [ ] **Step 5: Restore `main.json` to clean state**

```json
{
  "id": "S_MAIN",
  "backgroundFile": "bg_01.webp",
  "characters": [
    { "index": 0, "name": "渚", "imageFile": "chara_01.webp", "isShow": true, "speakerId": 3 },
    { "index": 1, "name": "凛", "imageFile": "chara_02.webp", "isShow": true, "speakerId": 2 }
  ],
  "lines": [
    { "id": "entry", "type": 0, "text": "ようこそ、Exiaノベルゲームエンジンへ！" }
  ]
}
```

- [ ] **Step 6: Commit**

```bash
git add public/scenarios/
git commit -m "feat: complete scenario file system implementation"
```
