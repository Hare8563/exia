# Scenario File System Design

**Date:** 2026-03-25
**Branch:** replace-to-tauri
**Status:** Approved

---

## Overview

Redesign the scenario loading system to:
1. Load scenario JSON files dynamically from `public/scenarios/` via `fetch()`
2. Support cross-file navigation with a path-relative `jumpTo` syntax
3. Add `type: "flag"` and `type: "jump"` line nodes
4. Add `if`/`then`/`else` conditional branching per line
5. Manage game flags in Zustand (in-memory, no persistence yet)

---

## JSON Schema

### jumpTo Path Syntax

| Pattern | Meaning |
|---------|---------|
| `./::label` | Label in the current file |
| `./scene_2::start` | `scene_2.json` in the current directory, label `start` |
| `../main::entry` | `main.json` in the parent directory, label `entry` |

The separator between file path and label is `::`. The file path omits the `.json` extension. Paths are resolved relative to `currentFilePath` stored in the scenario store.

### New Line Nodes

#### `type: "flag"` — Set flags (no display, no click required)

```json
{ "type": "flag", "set": { "talked_to_nagi": true, "count": 3 } }
```

- Processed silently; the engine advances to the next line immediately.
- Values can be `boolean`, `number`, or `string`.

#### `type: "jump"` — Jump to another location (no display, no click required)

```json
{ "type": "jump", "to": "./scene_2::start" }
{ "type": "jump", "to": "../main::hub", "keepState": true }
```

- `to`: jumpTo path (supports cross-file syntax).
- `keepState` (default `false`): when `false`, resets characters and background to the target file's definitions; when `true`, carries over the current character/background state.
- Executed immediately without waiting for user input.

#### `if` property on any existing line — Conditional branching

```json
{
  "type": 1,
  "text": "...",
  "if": {
    "flag": "talked_to_nagi",
    "equals": true,
    "then": "./::good_path",
    "else": "./::bad_path"
  }
}
```

- The line is displayed normally first, then the condition is evaluated.
- Supported operators: `equals`, `gt` (greater than), `lt` (less than).
- Both `then` and `else` are jumpTo paths.
- `else` is optional; if omitted and the condition is false, execution continues to the next line.

### Entry Point

The game always starts by loading `public/scenarios/main.json` and finding the line with `id: "entry"`.

```json
{
  "id": "S_MAIN",
  "lines": [
    { "id": "entry", "type": 0, "text": "..." },
    ...
  ]
}
```

---

## Architecture

### Zustand Store Changes (`scenarioStore.ts`)

Add two fields to `ScenarioState`:

```ts
currentFilePath: string;              // e.g. "scenarios/chapter1/scene_2"
flags: Record<string, boolean | number | string>;  // game flag storage
```

Flags live in `scenarioStore` (not a separate store) so they are included in a future save snapshot automatically.

### New Utilities

#### `src/utils/scenarioLoader.ts`

Fetches a scenario JSON file from `public/`.

```ts
async function loadScenario(filePath: string): Promise<Scenario>
// filePath example: "scenarios/main", "scenarios/chapter1/scene_2"
// Fetches: /scenarios/main.json
```

#### `src/utils/jumpToResolver.ts`

Parses a jumpTo string into `{ filePath, labelId }`.

```ts
function resolveJumpTo(
  jumpTo: string,
  currentFilePath: string
): { filePath: string; labelId: string }
```

Examples:
- `resolveJumpTo("./::end", "scenarios/chapter1/scene_1")` → `{ filePath: "scenarios/chapter1/scene_1", labelId: "end" }`
- `resolveJumpTo("./scene_2::start", "scenarios/chapter1/scene_1")` → `{ filePath: "scenarios/chapter1/scene_2", labelId: "start" }`
- `resolveJumpTo("../main::hub", "scenarios/chapter1/scene_1")` → `{ filePath: "scenarios/main", labelId: "hub" }`

### `useScenarioManager.ts` Changes

#### New: `evaluateCondition(if, flags)`

Evaluates an `if` block against the current `flags` state. Returns `then` or `else` jumpTo string (or `null` if no jump).

#### Modified: `goToNextLine()`

1. Check `type: "flag"` → update flags, skip to next line automatically.
2. Check `type: "jump"` → call `resolveJumpTo`, then either update line index (same file) or call `loadScenario` + replace scenario state.
3. Check `if` property → after line display, evaluate condition and jump to `then` or `else`.
4. Check `jumpTo` on current line (existing behavior, upgraded to use `resolveJumpTo`).

#### Modified: `handleChoiceSelect()`

Uses `resolveJumpTo` instead of `findLineIndexById` directly. Supports cross-file choices.

#### Cross-file jump behavior

When jumping to a different file:
- **`keepState: false` (default):** Replace `characters` and `backgroundFile` with the target file's top-level definitions. Reset `currentLineIndex` to the target label's index.
- **`keepState: true`:** Retain current `characters` and `backgroundFile`. Only update `lines`, `id`, `currentFilePath`, and seek to the target label.

### `MainScreen/index.tsx` Changes

Remove the static `import("@/scenarios/S_000.json")`. Replace with:

```ts
const scenario = await loadScenario("scenarios/main");
const entryIndex = scenario.lines.findIndex(l => l.id === "entry");
```

---

## File Structure

```
public/
  scenarios/
    main.json                    # Entry point (must contain id: "entry")
    chapter1/
      scene_1.json               # Example: migrated from S_000.json

src/
  utils/
    scenarioLoader.ts            # NEW
    jumpToResolver.ts            # NEW
  states/
    scenarioStore.ts             # CHANGE: add currentFilePath, flags
  types/
    index.ts                     # CHANGE: new types for flag/jump nodes, if property
  components/
    screens/MainScreen/index.tsx              # CHANGE: dynamic load
    modules/Message/hooks/useScenarioManager.ts  # CHANGE: flag/jump/if logic
```

---

## Out of Scope

- Skip function cross-file support (`skipToNextChoice` remains within current file only)
- Flag persistence (deferred to future save system)
- Compound conditions (`AND`/`OR`) — single flag comparison only
- Save/load integration
