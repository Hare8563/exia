# BGM Playback Design

**Date:** 2026-03-25
**Branch:** replace-to-tauri
**Status:** Approved

---

## Overview

Add BGM playback to the Exia engine. BGM files live in `public/sounds/bgm/`. BGM can be set at the scenario level (plays when the scenario loads) and overridden on individual lines (changes mid-scene). The currently-playing BGM is tracked in the Zustand store as `currentBgmFile`.

---

## JSON Schema

### Scenario-level BGM (existing field)

```json
{
  "id": "S_000",
  "bgmFile": "b0001.mp3",
  "backgroundFile": "bg_01.webp",
  ...
}
```

`bgmFile` at the top level of a scenario file is the initial BGM that plays when the scenario loads. This field already exists in the `Scenario` type — no type change needed here.

### Per-line BGM (new fields on NarrationLine and DialogueLine)

```json
{ "type": 0, "text": "戦闘が始まった。", "bgmFile": "b0002.mp3" }
```

- `bgmFile` (optional `string`): filename of the BGM file under `public/sounds/bgm/`. Extension included (e.g. `"b0001.mp3"`).
- Omitting `bgmFile` on a line means the current BGM continues unchanged.
- Setting `bgmFile: ""` (empty string) stops the BGM. The `Bgm` component renders `null` when `!currentBgmFile`, so the `<audio>` element is removed and playback stops. A subsequent truthy `bgmFile` line will start fresh.
- `ChoiceLine` (type 2) does not support `bgmFile`.

### TypeScript type changes

```ts
// NarrationLine — add:
bgmFile?: string;

// DialogueLine — add:
bgmFile?: string;
```

---

## State

Add `currentBgmFile` to `ScenarioState` in `scenarioStore.ts`:

```ts
currentBgmFile: string | undefined;
```

Default value: `undefined` (no BGM).

`currentBgmFile` is a runtime-tracking field on `ScenarioState` only — it is not added to the `Scenario` type. The existing `Scenario.bgmFile` field (used in `performJump` for `keepState` logic — see below) is left unchanged.

### When `currentBgmFile` is updated

| Trigger | New value |
|---------|-----------|
| Scenario file loads (initial load or cross-file jump with `keepState: false`) | `loaded.bgmFile ?? undefined` |
| Cross-file jump with `keepState: true` | Unchanged (current value retained) |
| Same-file jump (always) | Unchanged (Zustand partial merge preserves value; no override passed) |
| Line with `bgmFile` field is shown (any of: `goToNextLine` direct path, `advanceToDisplayLine`, `skipToNextChoice`) | `line.bgmFile` (empty string stops BGM; truthy string changes BGM) |
| Line without `bgmFile` field is shown | Unchanged |

### Update paths in useScenarioManager

**`advanceToDisplayLine`** — when a display line is found and `setScenario` is called:
- If `line.bgmFile !== undefined`: include `currentBgmFile: line.bgmFile`.
- Otherwise: omit `currentBgmFile` (Zustand partial merge preserves the existing value).

**`performJump`** — the `overrides` object currently has `bgmFile?: string`. Rename this key to `currentBgmFile` so it maps directly to the store field:
- `keepState: false`: `currentBgmFile: loaded.bgmFile ?? undefined`
- `keepState: true`: omit `currentBgmFile` from overrides entirely

Also update the `keepState: true` read on line 201 of the manager from `scenario.bgmFile` to `scenario.currentBgmFile`. After a per-line BGM override fires, `scenario.bgmFile` holds the scenario-level default while `scenario.currentBgmFile` holds the actively playing BGM. Using `scenario.bgmFile` would incorrectly restore the scenario default instead of the currently-playing track.

Concretely, change:
```ts
const baseBgm = keepState ? scenario.bgmFile : loaded.bgmFile;
```
to:
```ts
const baseBgm = keepState ? scenario.currentBgmFile : loaded.bgmFile;
```

**`goToNextLine` direct path** (non-flag/jump next line, the `setScenario` call at lines 276–282):
- If `nextLine.bgmFile !== undefined`: include `currentBgmFile: nextLine.bgmFile`.

**`skipToNextChoice`** (the `setScenario` call at lines 353–359):
- If `nextLine.bgmFile !== undefined`: include `currentBgmFile: nextLine.bgmFile`.

**`MainScreen` initial load** — when calling `setScenario` after loading `scenarios/main`:
- Set `currentBgmFile: loaded.bgmFile ?? undefined`.
- If the entry line itself has a `bgmFile` field, it takes priority. Read it as: `(loaded.lines[entryIndex] as NarrationLine | DialogueLine | ChoiceLine).bgmFile ?? loaded.bgmFile ?? undefined` — cast to `DisplayLine` and check for `bgmFile` (only exists on type 0/1; `ChoiceLine` does not have it, so use optional chaining). Simpler: access `(loaded.lines[entryIndex] as { bgmFile?: string }).bgmFile ?? loaded.bgmFile ?? undefined`.

---

## Bgm Component

New file: `src/components/modules/Bgm/index.tsx`

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

- `key={currentBgmFile}`: React remounts the element when the BGM changes — old audio stops, new starts. When the same BGM plays across multiple lines, the key stays the same and audio continues uninterrupted.
- `loop`: BGM loops continuously.
- `!currentBgmFile` check covers both `undefined` (no BGM set) and `""` (BGM explicitly stopped).

### MainScreen

Add `<Bgm />` to `MainScreen/index.tsx`:

```tsx
import { Bgm } from '@/components/modules/Bgm'

// Inside return:
<Bgm />
```

---

## Cross-file Jump Behavior

| Jump type | BGM behavior |
|-----------|-------------|
| Cross-file, `keepState: false` (default) | `currentBgmFile` set to new scenario's `bgmFile` (or `undefined` if absent) |
| Cross-file, `keepState: true` | `currentBgmFile` unchanged — BGM continues across file boundary |
| Same-file jump | `currentBgmFile` unchanged — no override passed; Zustand preserves value |

---

## Error Handling

- If the audio file does not exist, the browser's native `<audio>` error handling applies (silent failure, no crash).
- No explicit error UI is added.

---

## File Structure

```
src/
  types/index.ts                                           CHANGE: bgmFile? on NarrationLine, DialogueLine
  states/scenarioStore.ts                                  CHANGE: add currentBgmFile: string | undefined
  components/
    modules/
      Bgm/index.tsx                                        NEW: BGM playback component
    screens/MainScreen/index.tsx                           CHANGE: add <Bgm />, set currentBgmFile on load
  components/modules/Message/hooks/useScenarioManager.ts  CHANGE: update currentBgmFile on line display
```

---

## Out of Scope

- BGM fade-in / fade-out
- Volume control
- BGM preloading
- `ChoiceLine` BGM support
