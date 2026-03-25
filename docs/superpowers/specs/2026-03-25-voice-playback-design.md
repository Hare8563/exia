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

```json
{ "type": 1, "character": { "index": 0 }, "text": "こんにちは！", "voice": "n0001.wav" }
```

- `voice` (optional `string`): filename of the audio file under `public/sounds/voices/`. Extension is included (e.g. `"n0001.wav"`).
- Omitting `voice` means no audio plays for that line.
- `ChoiceLine` (type 2) does not support `voice`.

### TypeScript type changes

```ts
// NarrationLine — add:
voice?: string;

// DialogueLine — add:
voice?: string;
```

---

## Playback Behavior

- When `currentLine` becomes a line with a `voice` field, the audio file at `/sounds/voices/{voice}` starts playing immediately (autoplay).
- When the user advances to the next line (before audio finishes), the current audio stops and the next line's audio (if any) starts.
- If a line has no `voice` field, nothing plays and any previously-playing audio stops.

### Stop-on-advance implementation

Use React's `key` prop on the `<audio>` element set to the `voice` filename. When `key` changes, React unmounts the old element (stopping playback) and mounts a new one (starting the new audio). When `voice` is `undefined`, no `<audio>` element is rendered.

---

## VOICEVOX coexistence

The existing VOICEVOX mechanism (driven by `character.speakerId` and `CONFIG.VOICEVOX`) is left unchanged. When a line has a `voice` field, the line-level `voice` takes precedence and VOICEVOX does not play for that line. VOICEVOX remains off by default (`CONFIG.VOICEVOX: false`).

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
