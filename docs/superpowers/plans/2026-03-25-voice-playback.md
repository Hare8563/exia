# Voice Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `voice` field to scenario lines so that pre-recorded WAV files in `public/sounds/voices/` play automatically when a line is displayed, stopping immediately when the user advances.

**Architecture:** Two small changes only. First, add `voice?: string` to the `NarrationLine` and `DialogueLine` TypeScript types. Second, update the `Voice` React component to read `currentLine.voice` and render `<audio key={voice} autoPlay>` — the `key` prop causes React to stop the old audio and start the new one on every line change. VOICEVOX audio is suppressed when `voice` is present.

**Tech Stack:** TypeScript, React 18, Vitest (type-check only — no jsdom; tests are `tsc --noEmit`)

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `voice?: string` to `NarrationLine` (line ~55) and `DialogueLine` (line ~66) |
| `src/components/modules/Voice/index.tsx` | Read `currentLine.voice`; render file-based audio with correct path; suppress VOICEVOX when `voice` is present |

---

### Task 1: Add `voice?` to TypeScript types

**Files:**
- Modify: `src/types/index.ts`

**Context:** `NarrationLine` is `type: 0`, `DialogueLine` is `type: 1`. Both currently end before `ChoiceLine`. Add `voice?: string` to each. The `ChoiceLine` type does **not** get this field.

Current `NarrationLine` (around line 55):
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
};
```

Current `DialogueLine` (around line 66):
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
};
```

- [ ] **Step 1: Add `voice?` to `NarrationLine`**

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
};
```

- [ ] **Step 2: Add `voice?` to `DialogueLine`**

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
git commit -m "feat: add voice field to NarrationLine and DialogueLine types"
```

---

### Task 2: Update Voice component

**Files:**
- Modify: `src/components/modules/Voice/index.tsx`

**Context:**

The current component (`src/components/modules/Voice/index.tsx`):
```tsx
import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";

export const Voice: React.FC = () => {
  const { scenario } = useScenarioStore();
  const currentLine = scenario.currentLine;
  const speakerId = currentLine && currentLine.type !== 2 ? currentLine.character?.speakerId : undefined;

  return (
    <>
      {speakerId && (
        <audio
          // controls
          src={`/voices/${speakerId}.mp3`}
          autoPlay
          style={{ display: "none" }}
        />
      )}
    </>
  );
};
```

**Important notes for the implementer:**
- The existing `src` path `/voices/${speakerId}.mp3` is a **pre-existing bug** — the `sounds/` segment is missing. Do not copy it. For VOICEVOX (if ever enabled), the correct path would be `/sounds/voices/${speakerId}.mp3`, but fixing the VOICEVOX path is **out of scope**.
- The new file-based `voice` path is `/sounds/voices/${voice}`.
- `CONFIG.VOICEVOX` is imported from `@/constants` and is `false` by default.
- When `currentLine.voice` is set, do **not** render the VOICEVOX audio regardless of `CONFIG.VOICEVOX` value.

- [ ] **Step 1: Rewrite `Voice/index.tsx`**

Replace the entire file with:

```tsx
import React from "react";
import { useScenarioStore } from "@/states/scenarioStore";
import { CONFIG } from "@/constants";

export const Voice: React.FC = () => {
  const { scenario } = useScenarioStore();
  const currentLine = scenario.currentLine;

  if (!currentLine || currentLine.type === 2) return null;

  const voice = currentLine.voice;
  const speakerId = currentLine.character?.speakerId;

  // Line-level voice file takes precedence over VOICEVOX
  if (voice) {
    return (
      <audio
        key={voice}
        src={`/sounds/voices/${voice}`}
        autoPlay
        style={{ display: "none" }}
      />
    );
  }

  if (CONFIG.VOICEVOX && speakerId) {
    return (
      <audio
        src={`/voices/${speakerId}.mp3`}
        autoPlay
        style={{ display: "none" }}
      />
    );
  }

  return null;
};
```

- [ ] **Step 2: Run type check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/Voice/index.tsx
git commit -m "feat: play voice file from /sounds/voices/ when line has voice field"
```
