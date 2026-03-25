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

### TypeScript Type Definitions

The existing `ScenarioLine` type uses `type: number`. The new node types use string literals. These are reconciled via a discriminated union:

```ts
// Existing numeric line types (unchanged)
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

// New string-typed line nodes — no `text` field
export type FlagLine = {
  id?: string;
  type: "flag";
  set: Record<string, boolean | number | string>;
};

export type JumpLine = {
  id?: string;
  type: "jump";
  to: string;
  keepState?: boolean;
};

export type ScenarioLine = NarrationLine | DialogueLine | ChoiceLine | FlagLine | JumpLine;

// Condition block used in if property
export type ScenarioCondition = {
  flag: string;
  equals?: boolean | number | string;
  gt?: number;
  lt?: number;
  then: string;    // jumpTo path
  else?: string;   // jumpTo path, optional
};

export type FlagValue = boolean | number | string;
```

All existing consumers of `ScenarioLine` that access `.text` must narrow the type first (e.g. `if (line.type === 0 || line.type === 1 || line.type === 2)`).

### New Line Nodes

#### `type: "flag"` — Set flags (no display, no click required)

```json
{ "type": "flag", "set": { "talked_to_nagi": true, "count": 3 } }
```

- **Never set as `currentLine`** in the store. The engine processes and advances synchronously in the same `goToNextLine` call without triggering a React re-render with this node.
- Values can be `boolean`, `number`, or `string`.
- Never added to the backlog log.

#### `type: "jump"` — Jump to another location (no display, no click required)

```json
{ "type": "jump", "to": "./scene_2::start" }
{ "type": "jump", "to": "../main::hub", "keepState": true }
```

- `to`: jumpTo path (supports cross-file syntax).
- `keepState` (default `false`): see Cross-file jump behavior below.
- **Never set as `currentLine`**. Processed synchronously without triggering render.
- Never added to the backlog log.

#### `if` property on NarrationLine / DialogueLine — Conditional branching

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

- The line is displayed normally first, then the condition is evaluated after the user advances.
- Supported operators: `equals`, `gt` (greater than), `lt` (less than). Only one operator per condition block.
- `else` is optional; if omitted and the condition is false, execution continues to the next line.
- `if` is only valid on `type: 0` and `type: 1` lines. It is not supported on `type: 2` (choice) lines — use choice `jumpTo` for branching from choices.
- When both `jumpTo` and `if` are present on the same line, `jumpTo` takes precedence and `if` is ignored.

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

If `main.json` cannot be fetched or does not contain a line with `id: "entry"`, the engine throws an error and displays a developer-facing error message: `"[Exia] Failed to load entry point: scenarios/main.json must exist and contain a line with id: 'entry'."` The game does not start.

---

## Architecture

### Zustand Store Changes (`scenarioStore.ts`)

Add two fields to `ScenarioState`:

```ts
currentFilePath: string;                          // e.g. "scenarios/chapter1/scene_2"
flags: Record<string, FlagValue>;                 // game flag storage
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

**Error handling:**
- If the `fetch` fails (network error, 404, non-ok status): throw an `Error` with message `"[Exia] Failed to load scenario: <filePath>.json"`.
- The caller (`useScenarioManager`) catches this and sets an error state visible in the UI (e.g. a full-screen error message). The game halts.

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

#### New: `evaluateCondition(condition, flags)`

Evaluates a `ScenarioCondition` block against the current `flags` state. Returns the `then` or `else` jumpTo string, or `null` if no jump should occur (condition is false and `else` is absent).

#### Modified: `goToNextLine()`

Priority order for processing the **next** line (i.e. `lines[nextIndex]`):

1. If `nextLine.type === "flag"`: apply `set` to `flags` in store, advance index again. Repeat until a non-flag node is found. Do **not** set `currentLine` to any flag node.
2. If `nextLine.type === "jump"`: resolve `to` path, load file if needed, seek to label. Do **not** set `currentLine` to the jump node.
3. Otherwise, set `currentLine` to `nextLine` and render normally.

After user advances from a rendered line:

4. If `currentLine.jumpTo` is set: resolve and jump (takes precedence over `if`).
5. Else if `currentLine.if` is set: evaluate condition and jump to `then` or `else` (or continue if `else` absent and condition false).

#### Modified: `handleChoiceSelect()`

Uses `resolveJumpTo` instead of `findLineIndexById` directly. Supports cross-file choices.

#### Cross-file jump behavior

When `resolveJumpTo` returns a `filePath` different from `currentFilePath`:

1. Call `loadScenario(filePath)`.
2. Find the index of `labelId` in the loaded scenario's `lines`. If not found, throw `"[Exia] Label '<labelId>' not found in <filePath>.json"`. The game halts.
3. Apply state based on `keepState`:
   - **`keepState: false` (default):** Replace `characters`, `backgroundFile`, and `bgmFile` with the target file's top-level definitions. Reset to the target label's index.
   - **`keepState: true`:** Retain current `characters`, `backgroundFile`, and `bgmFile`. Only update `lines`, `id`, and `currentFilePath`, then seek to the target label's index.

#### Log system behavior

- `flag` and `jump` nodes are **never** added to the backlog log.
- Only `type: 0`, `type: 1`, and `type: 2` lines are logged.

#### Skip behavior (`skipToNextChoice`)

- The skip function iterates lines but does **not** apply `flag` side-effects during the skip. Flags are only set when the player reaches and passes through a `flag` node during normal play.
- `jump` nodes encountered during skip are also not followed; the skip simply continues iterating lines in the current file until it finds the next `type: 2` line.
- This is consistent with the existing behavior and acceptable for the current scope.

### `MainScreen/index.tsx` Changes

Remove the static `import("@/scenarios/S_000.json")`. Replace with:

```ts
const scenario = await loadScenario("scenarios/main");
const entryIndex = scenario.lines.findIndex(l => l.id === "entry");
if (entryIndex === -1) {
  throw new Error("[Exia] Failed to load entry point: scenarios/main.json must exist and contain a line with id: 'entry'.");
}
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
    index.ts                     # CHANGE: discriminated union for ScenarioLine; new types
  components/
    screens/MainScreen/index.tsx              # CHANGE: dynamic load from entry point
    modules/Message/hooks/useScenarioManager.ts  # CHANGE: flag/jump/if logic
```

---

## Out of Scope

- Skip function cross-file support (`skipToNextChoice` remains within current file only; flags are not applied during skip)
- Flag persistence (deferred to future save system)
- Compound conditions (`AND`/`OR`) — single flag comparison only
- `if` property on `type: 2` (choice) lines
- Save/load integration
