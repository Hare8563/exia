# Voice Playback Design

**Date:** 2026-03-25
**Branch:** replace-to-tauri
**Status:** Approved

---

## Overview

Add a `voice` field to scenario lines so that pre-recorded audio files in `public/sounds/voices/` are played automatically when a line is displayed.

---

## JSON Schema

### New field on NarrationLine and DialogueLine

DialogueLine example (type 1, with character):
```json
{ "type": 1, "character": { "index": 0 }, "text": "こんにちは！", "voice": "n0001.wav" }
```

NarrationLine example (type 0, no character required):
```json
{ "type": 0, "text": "静寂が続いた。", "voice": "n0002.wav" }
```

- `voice` (optional `string`): filename of the audio file under `public/sounds/voices/`. Extension is included (e.g. `"n0001.wav"`).
- Omitting `voice` means no audio plays for that line. When two consecutive lines both omit `voice`, nothing plays for either — no fallback is needed.
- `ChoiceLine` (type 2) does not support `voice`.

### TypeScript type changes

```ts
// NarrationLine — add:
voice?: string;

// DialogueLine — add:
voice?: string;
```

`ScenarioLogEntry` is defined as `DisplayLine & { character?: CharacterInfo }`, so it will inherit `voice?` automatically. This is intentional; the log UI does not render audio and ignores the field.

---

## Playback Behavior

- When `currentLine` becomes a line with a `voice` field, the audio file at `/sounds/voices/{voice}` starts playing immediately (autoplay).
- When the user advances to the next line (before audio finishes), the current audio stops and the next line's audio (if any) starts.
- If a line has no `voice` field, nothing plays and any previously-playing audio stops.

### Stop-on-advance implementation

Use React's `key` prop on the `<audio>` element set to the `voice` filename. When `key` changes, React unmounts the old element (stopping playback) and mounts a new one (starting the new audio). When `voice` is `undefined`, no `<audio>` element is rendered.

**Note:** The existing Voice component uses the path `/voices/{speakerId}.mp3`, which is a pre-existing bug (the `sounds/` segment is missing). Do not copy that path. The correct base path for the new feature is `/sounds/voices/{voice}`.

---

## VOICEVOX coexistence

The existing VOICEVOX mechanism (driven by `character.speakerId` and `CONFIG.VOICEVOX`) is left unchanged. The precedence check lives inside the Voice component:

- If `currentLine.voice` is set, render only the file-based `<audio>` element. Do **not** render the VOICEVOX `<audio>` element, regardless of the value of `CONFIG.VOICEVOX`.
- If `currentLine.voice` is absent and `CONFIG.VOICEVOX` is true and `speakerId` is present, render the VOICEVOX `<audio>` element as before.

This prevents double-audio if VOICEVOX is ever enabled alongside the new voice field.

VOICEVOX remains off by default (`CONFIG.VOICEVOX: false`).

---

## Error handling

- If the audio file does not exist, the browser's native `<audio>` error handling applies (no crash, silent failure).
- No explicit error UI is added.

---

## File Structure

```
src/
  types/index.ts                       CHANGE: add voice? to NarrationLine, DialogueLine
  components/modules/Voice/index.tsx   CHANGE: read currentLine.voice, play from /sounds/voices/
```

---

## Out of Scope

- Volume control
- Audio preloading / caching
- BGM playback
- Stopping audio mid-sentence (voice plays to completion unless user advances)
