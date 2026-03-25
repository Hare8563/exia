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
- Setting `bgmFile: ""` (empty string) stops the BGM.
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

### When `currentBgmFile` is updated

| Trigger | New value |
|---------|-----------|
| Scenario file loads (initial load or cross-file jump with `keepState: false`) | `loaded.bgmFile ?? undefined` |
| Cross-file jump with `keepState: true` | Unchanged (current value retained) |
| Line with `bgmFile` field is shown | `line.bgmFile` (empty string stops BGM; truthy string changes BGM) |
| Line without `bgmFile` field is shown | Unchanged |

### Storing the update in useScenarioManager

`currentBgmFile` is updated alongside `currentLine` in `advanceToDisplayLine` and in the direct path of `goToNextLine`.

In `advanceToDisplayLine`, when a display line is found:
- If `line.bgmFile !== undefined`: include `currentBgmFile: line.bgmFile` in the `setScenario` call.
- Otherwise: do not include `currentBgmFile` in the call (Zustand partial merge preserves the existing value).

In `performJump`, `overrides` already accepts `bgmFile` for the scenario-level value. Rename the override key to `currentBgmFile` so it maps directly to the store field:
- `keepState: false`: `currentBgmFile: loaded.bgmFile ?? undefined`
- `keepState: true`: omit `currentBgmFile` from overrides

In `MainScreen`, when loading the entry scenario, set `currentBgmFile: loaded.bgmFile ?? undefined`.

In `goToNextLine` direct path (non-flag/jump next line), when calling `setScenario` with the new line:
- If `nextLine.bgmFile !== undefined`: include `currentBgmFile: nextLine.bgmFile`.

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

| `keepState` | BGM behavior |
|-------------|-------------|
| `false` (default) | `currentBgmFile` is set to the new scenario's `bgmFile` (or `undefined` if absent) |
| `true` | `currentBgmFile` is unchanged — BGM continues playing across file boundary |

---

## Error Handling

- If the audio file does not exist, the browser's native `<audio>` error handling applies (silent failure, no crash).
- No explicit error UI is added.

---

## File Structure

```
src/
  types/index.ts                                       CHANGE: bgmFile? on NarrationLine, DialogueLine
  states/scenarioStore.ts                              CHANGE: add currentBgmFile: string | undefined
  components/
    modules/
      Bgm/index.tsx                                    NEW: BGM playback component
    screens/MainScreen/index.tsx                       CHANGE: add <Bgm />, set currentBgmFile on load
  components/modules/Message/hooks/useScenarioManager.ts  CHANGE: update currentBgmFile on line display
```

---

## Out of Scope

- BGM fade-in / fade-out
- Volume control
- BGM preloading
- `ChoiceLine` BGM support
