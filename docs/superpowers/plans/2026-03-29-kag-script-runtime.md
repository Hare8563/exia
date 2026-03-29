# KAG Script Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Exia's JSON scenario format with KAG3 script (`.ks`) as the sole runtime format, adding layer-based rendering and transition support.

**Architecture:** Rust Tauri backend parses `.ks` text into a flat `KagToken[]` stream; a TypeScript `KAGInterpreter` class processes tokens into display frames using a stateful cursor; a new Zustand store (`kagScenarioStore`) holds `KAGLayer[]`-based state consumed by updated Three.js renderers.

**Tech Stack:** Rust (Tauri 2.x, serde), TypeScript, Vitest, React Three Fiber, Zustand 4, Three.js

**Spec:** `docs/superpowers/specs/2026-03-29-kag-script-runtime-design.md`
**krkrz reference:** `krkrz/visual/LayerIntf.cpp`, `krkrz/visual/transhandler.h`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src-tauri/src/kag_parser.rs` | KAG text → `Vec<KagToken>` |
| Modify | `src-tauri/src/lib.rs` | Register `parse_kag_text` command |
| Create | `src/types/kag.ts` | `KagToken`, `KAGLayer`, `KAGDisplayFrame` types |
| Create | `src/utils/kagInterpreter.ts` | Stateful token processor |
| Create | `src/utils/kagLoader.ts` | Fetch `.ks` → call Rust → return `KAGInterpreter` |
| Create | `src/states/kagScenarioStore.ts` | New Zustand store with `KAGLayer[]` |
| Create | `src/components/modules/Message/hooks/useKAGScenarioManager.ts` | Hook wiring interpreter to store |
| Create | `src/components/modules/ForegroundLayer/ForegroundLayer.tsx` | Renders layers 0-9 (replaces Character3D + CutIn3D) |
| Modify | `src/components/modules/Background/Background3D.tsx` | Add crossfade transition |
| Modify | `src/components/ThreeCanvas.tsx` | Swap to ForegroundLayer, remove CutIn3D |
| Modify | `src/components/screens/MainScreen/index.tsx` | Load `main.ks` via kagLoader |
| Modify | `src/components/modules/Message/index.tsx` | Use `useKAGScenarioManager` |
| Modify | `src/components/modules/Voice/index.tsx` | Read from `kagScenarioStore` |
| Modify | `src/components/modules/Bgm/index.tsx` | Read from `kagScenarioStore` |
| Create | `public/scenarios/S_000.ks` | KAG port of S_000.json |
| Create | `public/scenarios/main.ks` | Entry point (replaces main.json) |
| Delete | `src/states/scenarioStore.ts` | Replaced by `kagScenarioStore.ts` |
| Delete | `src/utils/scenarioLoader.ts` | Replaced by `kagLoader.ts` |
| Delete | `src/utils/jumpToResolver.ts` | Logic moved into `KAGInterpreter` |
| Delete | `src/components/modules/Character/Character3D.tsx` | Replaced by `ForegroundLayer` |
| Delete | `src/components/modules/CutIn/CutIn3D.tsx` | Replaced by layer 3+ in `ForegroundLayer` |
| Delete | `src/components/modules/Message/hooks/useScenarioManager.ts` | Replaced by `useKAGScenarioManager` |
| Modify | `.agent/skills/scripter/SKILL.md` | Output `.ks` instead of JSON |

---

## Task 1: Rust KAG Lexer

**Files:**
- Create: `src-tauri/src/kag_parser.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create `kag_parser.rs` with types and failing tests**

```rust
// src-tauri/src/kag_parser.rs
use std::collections::HashMap;
use serde::Serialize;

#[derive(Debug, Serialize, Clone, PartialEq)]
#[serde(tag = "type")]
pub enum KagToken {
    Label { name: String, page_name: Option<String> },
    Tag { name: String, attrs: HashMap<String, String> },
    Text { content: String },
    Newline,
}

pub fn parse_kag_text(content: &str) -> Result<Vec<KagToken>, String> {
    // TODO: implement
    Err("not implemented".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_label() {
        let tokens = parse_kag_text("*scene_start").unwrap();
        assert_eq!(tokens, vec![KagToken::Label { name: "scene_start".to_string(), page_name: None }]);
    }

    #[test]
    fn parses_label_with_page() {
        let tokens = parse_kag_text("*label|page").unwrap();
        assert_eq!(tokens, vec![KagToken::Label {
            name: "label".to_string(),
            page_name: Some("page".to_string()),
        }]);
    }

    #[test]
    fn parses_tag_no_attrs() {
        let tokens = parse_kag_text("[l]").unwrap();
        assert_eq!(tokens, vec![KagToken::Tag { name: "l".to_string(), attrs: HashMap::new() }]);
    }

    #[test]
    fn parses_tag_with_attrs() {
        let tokens = parse_kag_text("[image storage=bg.webp layer=base]").unwrap();
        let tag = &tokens[0];
        if let KagToken::Tag { name, attrs } = tag {
            assert_eq!(name, "image");
            assert_eq!(attrs.get("storage").unwrap(), "bg.webp");
            assert_eq!(attrs.get("layer").unwrap(), "base");
        } else { panic!("Expected Tag"); }
    }

    #[test]
    fn parses_tag_with_quoted_attr() {
        let tokens = parse_kag_text("[name text=\"Alice\"]").unwrap();
        if let KagToken::Tag { attrs, .. } = &tokens[0] {
            assert_eq!(attrs.get("text").unwrap(), "Alice");
        } else { panic!(); }
    }

    #[test]
    fn parses_at_tag_at_line_start() {
        let tokens = parse_kag_text("@bgm storage=calm.mp3").unwrap();
        assert_eq!(tokens[0], KagToken::Tag { name: "bgm".to_string(), attrs: [("storage".to_string(), "calm.mp3".to_string())].iter().cloned().collect() });
    }

    #[test]
    fn skips_comments() {
        let tokens = parse_kag_text("; this is a comment\n[l]").unwrap();
        // comment + newline skipped, just [l]
        assert!(tokens.iter().any(|t| matches!(t, KagToken::Tag { name, .. } if name == "l")));
        assert!(!tokens.iter().any(|t| matches!(t, KagToken::Text { content } if content.contains("comment"))));
    }

    #[test]
    fn parses_text() {
        let tokens = parse_kag_text("こんにちは").unwrap();
        assert_eq!(tokens, vec![KagToken::Text { content: "こんにちは".to_string() }]);
    }

    #[test]
    fn emits_newline_token() {
        let tokens = parse_kag_text("abc\ndef").unwrap();
        assert!(tokens.iter().any(|t| matches!(t, KagToken::Newline)));
    }

    #[test]
    fn at_sign_mid_text_is_text() {
        // @ not at line start is treated as text
        let tokens = parse_kag_text("test@example.com").unwrap();
        let text: String = tokens.iter().filter_map(|t| {
            if let KagToken::Text { content } = t { Some(content.as_str()) } else { None }
        }).collect();
        assert!(text.contains('@'));
    }
}
```

- [ ] **Step 2: Run tests — expect ALL to fail**

```bash
cd f:/repo/exia/src-tauri && cargo test kag_parser 2>&1 | tail -10
```
Expected: `error: not implemented` or compilation errors.

- [ ] **Step 3: Implement `parse_kag_text`**

```rust
pub fn parse_kag_text(content: &str) -> Result<Vec<KagToken>, String> {
    let mut tokens: Vec<KagToken> = Vec::new();
    let lines: Vec<&str> = content.split('\n').collect();

    for line in lines {
        let line = line.trim_end_matches('\r');
        if line.is_empty() {
            tokens.push(KagToken::Newline);
            continue;
        }
        // Comment
        if line.starts_with(';') {
            tokens.push(KagToken::Newline);
            continue;
        }
        // Label
        if line.starts_with('*') {
            let rest = &line[1..];
            let (name, page_name) = if let Some(pipe) = rest.find('|') {
                (rest[..pipe].to_string(), Some(rest[pipe+1..].to_string()))
            } else {
                (rest.to_string(), None)
            };
            tokens.push(KagToken::Label { name, page_name });
            tokens.push(KagToken::Newline);
            continue;
        }
        // @ line-form tag
        if line.starts_with('@') {
            let rest = &line[1..];
            tokens.push(parse_inline_tag(rest)?);
            tokens.push(KagToken::Newline);
            continue;
        }
        // Line with mixed text and [tags]
        parse_inline_content(line, &mut tokens)?;
        tokens.push(KagToken::Newline);
    }

    Ok(tokens)
}

fn parse_inline_content(line: &str, tokens: &mut Vec<KagToken>) -> Result<(), String> {
    let mut chars = line.chars().peekable();
    let mut text_buf = String::new();

    while let Some(&ch) = chars.peek() {
        if ch == '[' {
            if !text_buf.is_empty() {
                tokens.push(KagToken::Text { content: text_buf.clone() });
                text_buf.clear();
            }
            chars.next(); // consume '['
            let mut tag_content = String::new();
            let mut depth = 1;
            for c in chars.by_ref() {
                if c == '[' { depth += 1; }
                if c == ']' {
                    depth -= 1;
                    if depth == 0 { break; }
                }
                tag_content.push(c);
            }
            tokens.push(parse_inline_tag(&tag_content)?);
        } else {
            text_buf.push(ch);
            chars.next();
        }
    }
    if !text_buf.is_empty() {
        tokens.push(KagToken::Text { content: text_buf });
    }
    Ok(())
}

fn parse_inline_tag(content: &str) -> Result<KagToken, String> {
    let content = content.trim();
    let mut parts = content.splitn(2, |c: char| c.is_whitespace());
    let name = parts.next().unwrap_or("").to_string();
    let attrs_str = parts.next().unwrap_or("");
    let attrs = parse_attrs(attrs_str)?;
    Ok(KagToken::Tag { name, attrs })
}

fn parse_attrs(s: &str) -> Result<HashMap<String, String>, String> {
    let mut attrs = HashMap::new();
    let mut rest = s.trim();
    while !rest.is_empty() {
        // find key=value
        if let Some(eq) = rest.find('=') {
            let key = rest[..eq].trim().to_string();
            rest = &rest[eq+1..];
            let (value, remaining) = if rest.starts_with('"') {
                // quoted value: rest[0]=opening quote, rest[1..end+1]=content, rest[end+1]=closing quote
                let end = rest[1..].find('"').ok_or("Unclosed quote")?;
                let val = rest[1..end+1].to_string();
                (val, &rest[end+2..])   // (value, remaining_unparsed)
            } else {
                // unquoted: ends at whitespace
                let end = rest.find(|c: char| c.is_whitespace()).unwrap_or(rest.len());
                let val = rest[..end].to_string();
                (val, &rest[end..])   // (value, remaining_unparsed)
            };
            attrs.insert(key, value.to_string());
            rest = remaining.trim_start();
        } else {
            break;
        }
    }
    Ok(attrs)
}
```

- [ ] **Step 4: Register `mod kag_parser` and Tauri command in `lib.rs`**

```rust
// src-tauri/src/lib.rs — add at top:
mod kag_parser;

// Add command:
#[tauri::command]
fn parse_kag_text(content: String) -> Result<Vec<kag_parser::KagToken>, String> {
    kag_parser::parse_kag_text(&content)
}

// In run() builder, add to invoke_handler:
.invoke_handler(tauri::generate_handler![save_scenario, parse_kag_text])
```

- [ ] **Step 5: Run tests — expect all to pass**

```bash
# Run from repo root (absolute path avoids cd state issues)
cd f:/repo/exia/src-tauri && cargo test kag_parser 2>&1 | tail -10
```
Expected: `test result: ok. N passed`

- [ ] **Step 6: Verify Tauri build still compiles**

```bash
cd f:/repo/exia && npm run tauri build -- --debug 2>&1 | tail -5
```
Expected: `Finished` with no errors.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/kag_parser.rs src-tauri/src/lib.rs
git commit -m "feat(rust): add KAG text lexer with parse_kag_text Tauri command"
```

---

## Task 2: TypeScript KAG Types

**Files:**
- Create: `src/types/kag.ts`

- [ ] **Step 1: Create `src/types/kag.ts`**

```typescript
// src/types/kag.ts

// Matches KagToken enum from Rust (serde tag = "type")
export type KagToken =
  | { type: 'Label'; name: string; page_name?: string }
  | { type: 'Tag'; name: string; attrs: Record<string, string> }
  | { type: 'Text'; content: string }
  | { type: 'Newline' }

// A single layer in the visual stack.
// id='base' is the background; 0-9 are foreground layers (characters, overlays).
export type KAGLayer = {
  id: 'base' | number
  file?: string        // storage= parameter
  visible: boolean
  x: number            // left= in pixels
  y: number            // top= in pixels
  opacity: number      // 0-255
  scale: number
}

// State returned after each advance() call (one "click unit")
export type KAGDisplayFrame = {
  text: string
  speakerName?: string
  layers: KAGLayer[]
  bgmFile?: string
  seFile?: string
  voiceFile?: string
  voiceSpeakerId?: number           // VOICEVOX speaker id
  choices?: { text: string; target: string }[]
  transition?: {
    method: string                  // 'crossfade' | 'scroll' | 'dissolve'
    time: number                    // ms
    layer?: 'base' | number         // undefined = background (base)
  }
  isWaitingTransition: boolean
  isWaitingTimer: boolean
  waitTime?: number
  isEnd: boolean
}

// Log entry for backlog
export type KAGLogEntry = {
  text: string
  speakerName?: string
}

// Zustand store shape
export type FlagValue = boolean | number | string

export type KAGScenarioState = {
  layers: KAGLayer[]
  currentText: string
  currentSpeakerName?: string
  currentBgmFile?: string
  currentSeFile?: string
  currentVoiceFile?: string
  currentVoiceSpeakerId?: number
  currentChoices?: { text: string; target: string }[]
  isWaitingTransition: boolean
  currentTransition?: KAGDisplayFrame['transition']
  isEnd: boolean
  flags: Record<string, FlagValue>
  logs: KAGLogEntry[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/kag.ts
git commit -m "feat(types): add KAG type definitions"
```

---

## Task 3: KAGInterpreter — Core

**Files:**
- Create: `src/utils/kagInterpreter.ts`
- Create: `src/tests/kagInterpreter.test.ts`

- [ ] **Step 1: Write failing tests for core interpreter behavior**

```typescript
// src/tests/kagInterpreter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import type { KagToken } from '@/types/kag'

// Helper: build a token array directly (bypasses Tauri in tests)
function makeTokens(tokens: KagToken[]): KagToken[] {
  return tokens
}

describe('KAGInterpreter', () => {
  describe('text and pause points', () => {
    it('returns text at [l] pause point', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'こんにちは' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('こんにちは')
      expect(frame.isEnd).toBe(false)
    })

    it('accumulates text across multiple Text tokens before [l]', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'Hello' },
        { type: 'Text', content: ' World' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('Hello World')
    })

    it('clears text on [p] and waits', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'Page 1' },
        { type: 'Tag', name: 'p', attrs: {} },
        { type: 'Text', content: 'Page 2' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance()
      expect(frame1.text).toBe('Page 1')
      const frame2 = await interp.advance()
      expect(frame2.text).toBe('Page 2')
    })

    it('[cm] clears text buffer mid-page', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'old' },
        { type: 'Tag', name: 'cm', attrs: {} },
        { type: 'Text', content: 'new' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('new')
    })

    it('[s] marks isEnd', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'end' },
        { type: 'Tag', name: 's', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.isEnd).toBe(true)
    })

    it('[name] sets speakerName', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'name', attrs: { text: 'Alice' } },
        { type: 'Text', content: 'Hi' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.speakerName).toBe('Alice')
    })

    it('[r] inserts newline in text', async () => {
      const tokens: KagToken[] = [
        { type: 'Text', content: 'line1' },
        { type: 'Tag', name: 'r', attrs: {} },
        { type: 'Text', content: 'line2' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('line1\nline2')
    })

    it('Newline tokens are always skipped', async () => {
      const tokens: KagToken[] = [
        { type: 'Newline' },
        { type: 'Text', content: 'text' },
        { type: 'Newline' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('text')
    })
  })

  describe('image and audio tags', () => {
    it('[image layer=base] sets background layer', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'image', attrs: { storage: 'bg.webp', layer: 'base' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      const bg = frame.layers.find(l => l.id === 'base')
      expect(bg?.file).toBe('bg.webp')
    })

    it('[image layer=0 visible=true] sets fg layer', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'image', attrs: { storage: 'chara.webp', layer: '0', visible: 'true' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      const layer = frame.layers.find(l => l.id === 0)
      expect(layer?.file).toBe('chara.webp')
      expect(layer?.visible).toBe(true)
    })

    it('[bgm] sets bgmFile', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'bgm', attrs: { storage: 'calm.mp3' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.bgmFile).toBe('calm.mp3')
    })

    it('[voice storage=x] sets voiceFile', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'voice', attrs: { storage: 'v001.wav' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.voiceFile).toBe('v001.wav')
    })

    it('[voice speaker=3] sets voiceSpeakerId', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'voice', attrs: { speaker: '3' } },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.voiceSpeakerId).toBe(3)
      expect(frame.voiceFile).toBeUndefined()
    })
  })

  describe('flow control', () => {
    it('[jump target=*label] jumps to label', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'jump', attrs: { target: '*end' } },
        { type: 'Text', content: 'skipped' },
        { type: 'Label', name: 'end' },
        { type: 'Text', content: 'reached' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('reached')
    })

    it('[if] true branch executes', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'flag', attrs: { name: 'test', value: 'true' } },
        { type: 'Tag', name: 'if', attrs: { exp: 'f.test == true' } },
        { type: 'Text', content: 'yes' },
        { type: 'Tag', name: 'endif', attrs: {} },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('yes')
    })

    it('[if] false branch skips to [else]', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'if', attrs: { exp: 'f.missing == true' } },
        { type: 'Text', content: 'no' },
        { type: 'Tag', name: 'else', attrs: {} },
        { type: 'Text', content: 'yes' },
        { type: 'Tag', name: 'endif', attrs: {} },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('yes')
    })

    it('nested [if] blocks: outer false skips entire nested structure', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'if', attrs: { exp: 'f.outer == true' } },  // false → skip
        { type: 'Tag', name: 'if', attrs: { exp: 'f.inner == true' } },  // nested — must also be counted
        { type: 'Text', content: 'inner' },
        { type: 'Tag', name: 'endif', attrs: {} },                        // depth-- but still > 0
        { type: 'Tag', name: 'else', attrs: {} },                         // depth=1 → resume
        { type: 'Text', content: 'outer_else' },
        { type: 'Tag', name: 'endif', attrs: {} },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.text).toBe('outer_else')
      expect(frame.text).not.toContain('inner')
    })

    it('[glink] + [s] produces choices', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'glink', attrs: { target: '*a', text: 'Choice A' } },
        { type: 'Tag', name: 'glink', attrs: { target: '*b', text: 'Choice B' } },
        { type: 'Tag', name: 's', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame = await interp.advance()
      expect(frame.choices).toHaveLength(2)
      expect(frame.choices![0].text).toBe('Choice A')
      expect(frame.choices![1].target).toBe('*b')
    })

    it('[call] + [return] restores cursor', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'call', attrs: { target: '*sub' } },
        { type: 'Text', content: 'after' },
        { type: 'Tag', name: 'l', attrs: {} },
        { type: 'Tag', name: 's', attrs: {} },
        { type: 'Label', name: 'sub' },
        { type: 'Text', content: 'sub_text' },
        { type: 'Tag', name: 'l', attrs: {} },
        { type: 'Tag', name: 'return', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance() // enters sub
      expect(frame1.text).toBe('sub_text')
      const frame2 = await interp.advance() // returns, continues
      expect(frame2.text).toBe('after')
    })
  })

  describe('[trans] and [wt]', () => {
    it('[trans] sets transition, [wt] pauses with isWaitingTransition', async () => {
      const tokens: KagToken[] = [
        { type: 'Tag', name: 'trans', attrs: { method: 'crossfade', time: '800' } },
        { type: 'Tag', name: 'wt', attrs: {} },
        { type: 'Text', content: 'after trans' },
        { type: 'Tag', name: 'l', attrs: {} },
      ]
      const interp = new KAGInterpreter(tokens)
      const frame1 = await interp.advance()
      expect(frame1.isWaitingTransition).toBe(true)
      expect(frame1.transition?.method).toBe('crossfade')
      expect(frame1.transition?.time).toBe(800)

      interp.onTransitionComplete()
      const frame2 = await interp.advance()
      expect(frame2.text).toBe('after trans')
      expect(frame2.isWaitingTransition).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run — expect all to fail (KAGInterpreter doesn't exist)**

```bash
npm run test -- src/tests/kagInterpreter.test.ts 2>&1 | head -20
```
Expected: `Cannot find module '@/utils/kagInterpreter'`

- [ ] **Step 3: Implement `src/utils/kagInterpreter.ts`**

```typescript
// src/utils/kagInterpreter.ts
import type { KagToken, KAGLayer, KAGDisplayFrame, FlagValue } from '@/types/kag'

const DEFAULT_LAYER = (id: 'base' | number): KAGLayer => ({
  id, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1,
})

export class KAGInterpreter {
  private tokens: KagToken[]
  private cursor = 0
  private layers = new Map<'base' | number, KAGLayer>([
    ['base', DEFAULT_LAYER('base')],
    [0, DEFAULT_LAYER(0)], [1, DEFAULT_LAYER(1)], [2, DEFAULT_LAYER(2)],
    [3, DEFAULT_LAYER(3)],
  ])
  private flags: Record<string, FlagValue> = {}
  private textBuffer = ''
  private speakerName: string | undefined
  private voiceFile: string | undefined
  private voiceSpeakerId: number | undefined
  private seFile: string | undefined
  private bgmFile: string | undefined
  private choiceBuffer: { text: string; target: string }[] = []
  private callStack: number[] = []
  private macros = new Map<string, number>()      // name → body start index
  private macroRanges = new Map<string, [number, number]>() // name → [start, end]
  private labelMap = new Map<string, number>()
  private pendingTransition: KAGDisplayFrame['transition'] | undefined
  private pendingWaitTime: number | undefined
  private waitingTransitionResolve: (() => void) | undefined

  constructor(tokens: KagToken[], flags?: Record<string, FlagValue>) {
    this.tokens = tokens
    if (flags) this.flags = flags
    this.buildMaps()
  }

  private buildMaps() {
    let i = 0
    while (i < this.tokens.length) {
      const tok = this.tokens[i]
      if (tok.type === 'Label') {
        this.labelMap.set(tok.name, i)
      } else if (tok.type === 'Tag' && tok.name === 'macro' && tok.attrs.name) {
        const macroName = tok.attrs.name
        const bodyStart = i + 1
        let j = i + 1
        while (j < this.tokens.length) {
          const t = this.tokens[j]
          if (t.type === 'Tag' && t.name === 'endmacro') break
          j++
        }
        this.macros.set(macroName, bodyStart)
        this.macroRanges.set(macroName, [i, j])
      }
      i++
    }
  }

  getFlags() { return this.flags }
  setFlag(name: string, value: FlagValue) { this.flags[name] = value }
  onTransitionComplete() { this.waitingTransitionResolve?.() }
  getLayersArray(): KAGLayer[] { return Array.from(this.layers.values()) }

  jumpToLabel(label: string) {
    const idx = this.labelMap.get(label)
    if (idx !== undefined) this.cursor = idx
    else throw new Error(`Label not found: ${label}`)
  }

  selectChoice(target: string) {
    const label = target.startsWith('*') ? target.slice(1) : target
    this.jumpToLabel(label)
  }

  // Replaces token array for cross-file jumps
  loadTokens(tokens: KagToken[], label: string, flags?: Record<string, FlagValue>) {
    this.tokens = tokens
    this.cursor = 0
    this.macros.clear(); this.macroRanges.clear(); this.labelMap.clear()
    if (flags) this.flags = flags
    this.buildMaps()
    if (label) this.jumpToLabel(label)
  }

  async advance(): Promise<KAGDisplayFrame> {
    this.voiceFile = undefined
    this.voiceSpeakerId = undefined
    this.seFile = undefined

    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++

      if (tok.type === 'Newline') continue

      if (tok.type === 'Label') continue

      if (tok.type === 'Text') {
        this.textBuffer += tok.content
        continue
      }

      if (tok.type === 'Tag') {
        const { name, attrs } = tok
        const handled = await this.handleTag(name, attrs)
        if (handled === 'pause') break
        if (handled === 'end') return this.buildFrame(true)
      }
    }

    return this.buildFrame(false)
  }

  private async handleTag(
    name: string,
    attrs: Record<string, string>
  ): Promise<'continue' | 'pause' | 'end'> {
    switch (name) {
      // Pause points
      case 'l': return 'pause'
      case 'p':
        this.textBuffer = ''
        return 'pause'
      case 's':
        return 'end'

      // Text
      case 'r': this.textBuffer += '\n'; return 'continue'
      case 'cm': this.textBuffer = ''; return 'continue'
      case 'name': this.speakerName = attrs.text; return 'continue'

      // Image / layers
      case 'image': this.applyImageTag(attrs); return 'continue'

      // Audio
      case 'bgm': this.bgmFile = attrs.storage; return 'continue'
      case 'stopbgm': this.bgmFile = undefined; return 'continue'
      case 'se': this.seFile = attrs.storage; return 'continue'
      case 'voice':
        if (attrs.storage) { this.voiceFile = attrs.storage; this.voiceSpeakerId = undefined }
        else if (attrs.speaker) { this.voiceSpeakerId = parseInt(attrs.speaker); this.voiceFile = undefined }
        return 'continue'

      // Transition
      case 'trans':
        this.pendingTransition = {
          method: attrs.method ?? 'crossfade',
          time: parseInt(attrs.time ?? '800'),
          layer: attrs.layer === 'base' ? 'base' : attrs.layer !== undefined ? parseInt(attrs.layer) : undefined,
        }
        return 'continue'
      case 'wt':
        await new Promise<void>(resolve => { this.waitingTransitionResolve = resolve })
        this.waitingTransitionResolve = undefined
        return 'continue'

      // Wait — set timer fields, then pause (hook reads waitTime and starts setTimeout)
      case 'wait':
        this.pendingWaitTime = parseInt(attrs.time ?? '0')
        return 'pause'

      // Flow
      case 'jump': this.handleJump(attrs); return 'continue'
      case 'call': this.handleCall(attrs); return 'continue'
      case 'return': this.handleReturn(); return 'continue'
      case 'if': this.handleIf(attrs); return 'continue'
      case 'else': case 'elsif': case 'endif': return 'continue' // handled by skipIf
      case 'macro': this.skipMacroBody(); return 'continue'
      case 'endmacro': this.handleReturn(); return 'continue' // like return

      // Exia extensions
      case 'flag': this.flags[attrs.name] = this.parseValue(attrs.value); return 'continue'
      case 'glink':
        this.choiceBuffer.push({ text: attrs.text ?? '', target: attrs.target ?? '' })
        return 'continue'

      default:
        // Try macro call
        if (this.macros.has(name)) {
          this.callStack.push(this.cursor)
          this.cursor = this.macros.get(name)!
          return 'continue'
        }
        return 'continue'
    }
  }

  private applyImageTag(attrs: Record<string, string>) {
    const layerKey: 'base' | number = attrs.layer === 'base' ? 'base' : parseInt(attrs.layer ?? '0')
    const existing = this.layers.get(layerKey) ?? DEFAULT_LAYER(layerKey)
    this.layers.set(layerKey, {
      ...existing,
      file: attrs.storage ?? existing.file,
      visible: attrs.visible !== undefined ? attrs.visible === 'true' : existing.visible,
      x: attrs.left !== undefined ? parseInt(attrs.left) : existing.x,
      y: attrs.top !== undefined ? parseInt(attrs.top) : existing.y,
      opacity: attrs.opacity !== undefined ? parseInt(attrs.opacity) : existing.opacity,
    })
  }

  private handleJump(attrs: Record<string, string>) {
    if (attrs.file) {
      // Cross-file: handled externally via loadTokens
      throw new Error(`CROSS_FILE_JUMP:${attrs.file}:${attrs.target ?? ''}`)
    }
    const label = (attrs.target ?? '').replace(/^\*/, '')
    this.jumpToLabel(label)
  }

  private handleCall(attrs: Record<string, string>) {
    const label = (attrs.target ?? '').replace(/^\*/, '')
    this.callStack.push(this.cursor)
    this.jumpToLabel(label)
  }

  private handleReturn() {
    const ret = this.callStack.pop()
    if (ret !== undefined) this.cursor = ret
  }

  private handleIf(attrs: Record<string, string>) {
    const exp = attrs.exp ?? ''
    if (!this.evalExp(exp)) {
      this.skipToElseOrEndif()
    }
  }

  private skipToElseOrEndif() {
    let depth = 1
    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++
      if (tok.type !== 'Tag') continue
      if (tok.name === 'if') { depth++; continue }
      if (tok.name === 'endif') { depth--; if (depth === 0) return }
      if ((tok.name === 'else' || tok.name === 'elsif') && depth === 1) return
    }
  }

  private skipMacroBody() {
    // Skip to [endmacro]
    while (this.cursor < this.tokens.length) {
      const tok = this.tokens[this.cursor]
      this.cursor++
      if (tok.type === 'Tag' && tok.name === 'endmacro') return
    }
  }

  private evalExp(exp: string): boolean {
    // Supported: f.name == val, f.name != val, f.name > N, f.name < N, && ||
    const tryEval = (e: string): boolean => {
      e = e.trim()
      if (e.includes('&&')) return e.split('&&').every(part => tryEval(part))
      if (e.includes('||')) return e.split('||').some(part => tryEval(part))
      const m = e.match(/^f\.(\w+)\s*(==|!=|>|<)\s*(.+)$/)
      if (!m) return false
      const [, key, op, rawVal] = m
      const actual = this.flags[key]
      const expected = this.parseValue(rawVal.trim().replace(/^["']|["']$/g, ''))
      if (op === '==') return actual == expected
      if (op === '!=') return actual != expected
      if (op === '>') return Number(actual) > Number(expected)
      if (op === '<') return Number(actual) < Number(expected)
      return false
    }
    return tryEval(exp)
  }

  private parseValue(v: string): FlagValue {
    if (v === 'true') return true
    if (v === 'false') return false
    const n = Number(v)
    return isNaN(n) ? v : n
  }

  private buildFrame(isEnd: boolean): KAGDisplayFrame {
    const transition = this.pendingTransition
    this.pendingTransition = undefined

    const isWaiting = this.waitingTransitionResolve !== undefined

    const waitTime = this.pendingWaitTime
    this.pendingWaitTime = undefined

    const frame: KAGDisplayFrame = {
      text: this.textBuffer,
      speakerName: this.speakerName,
      layers: this.getLayersArray(),
      bgmFile: this.bgmFile,
      seFile: this.seFile,
      voiceFile: this.voiceFile,
      voiceSpeakerId: this.voiceSpeakerId,
      choices: this.choiceBuffer.length > 0 ? [...this.choiceBuffer] : undefined,
      transition,
      isWaitingTransition: isWaiting,
      isWaitingTimer: waitTime !== undefined,
      waitTime,
      isEnd,
    }
    this.choiceBuffer = []
    return frame
  }
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm run test -- src/tests/kagInterpreter.test.ts
```
Expected: `Tests 26 passed`

- [ ] **Step 5: Commit**

```bash
git add src/types/kag.ts src/utils/kagInterpreter.ts src/tests/kagInterpreter.test.ts
git commit -m "feat(interpreter): add KAGInterpreter with full token processing"
```

---

## Task 4: kagLoader + kagScenarioStore

**Files:**
- Create: `src/utils/kagLoader.ts`
- Create: `src/states/kagScenarioStore.ts`

- [ ] **Step 1: Create `src/utils/kagLoader.ts`**

```typescript
// src/utils/kagLoader.ts
import { invoke } from '@tauri-apps/api/core'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import type { KagToken, FlagValue } from '@/types/kag'

export async function loadKAGScenario(
  filePath: string,
  flags?: Record<string, FlagValue>
): Promise<KAGInterpreter> {
  const res = await fetch(`/${filePath}.ks`)
  if (!res.ok) throw new Error(`Failed to load ${filePath}.ks: ${res.status}`)
  const content = await res.text()
  const tokens: KagToken[] = await invoke('parse_kag_text', { content })
  return new KAGInterpreter(tokens, flags)
}

export async function loadKAGTokens(filePath: string): Promise<KagToken[]> {
  const res = await fetch(`/${filePath}.ks`)
  if (!res.ok) throw new Error(`Failed to load ${filePath}.ks: ${res.status}`)
  const content = await res.text()
  return invoke('parse_kag_text', { content })
}
```

- [ ] **Step 2: Create `src/states/kagScenarioStore.ts`**

```typescript
// src/states/kagScenarioStore.ts
import { create } from 'zustand'
import type { KAGScenarioState, KAGLayer } from '@/types/kag'

const DEFAULT_LAYERS: KAGLayer[] = [
  { id: 'base', file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
  { id: 0, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
  { id: 1, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
  { id: 2, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
  { id: 3, file: undefined, visible: false, x: 0, y: 0, opacity: 255, scale: 1 },
]

const INITIAL: KAGScenarioState = {
  layers: DEFAULT_LAYERS,
  currentText: '',
  currentSpeakerName: undefined,
  currentBgmFile: undefined,
  currentSeFile: undefined,
  currentVoiceFile: undefined,
  currentVoiceSpeakerId: undefined,
  currentChoices: undefined,
  isWaitingTransition: false,
  currentTransition: undefined,
  isEnd: false,
  flags: {},
  logs: [],
}

type KAGScenarioStore = KAGScenarioState & {
  setFrame: (updates: Partial<KAGScenarioState>) => void
  reset: () => void
}

export const useKAGScenarioStore = create<KAGScenarioStore>(set => ({
  ...INITIAL,
  setFrame: updates => set(state => ({ ...state, ...updates })),
  reset: () => set(INITIAL),
}))
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/kagLoader.ts src/states/kagScenarioStore.ts
git commit -m "feat: add kagLoader and kagScenarioStore"
```

---

## Task 5: useKAGScenarioManager Hook

**Files:**
- Create: `src/components/modules/Message/hooks/useKAGScenarioManager.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/components/modules/Message/hooks/useKAGScenarioManager.ts
import { useRef, useCallback, useState } from 'react'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import { loadKAGTokens } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import type { KAGDisplayFrame, KAGLogEntry } from '@/types/kag'

export function useKAGScenarioManager() {
  const { setFrame, logs } = useKAGScenarioStore()
  const interpreterRef = useRef<KAGInterpreter | null>(null)
  const [isScenarioEnd, setIsScenarioEnd] = useState(false)

  const applyFrame = useCallback((frame: KAGDisplayFrame) => {
    // Ensure new foreground layers requested in the frame exist in store
    const updates: Parameters<typeof setFrame>[0] = {
      layers: frame.layers,
      currentText: frame.text,
      currentSpeakerName: frame.speakerName,
      currentBgmFile: frame.bgmFile ?? useKAGScenarioStore.getState().currentBgmFile,
      currentSeFile: frame.seFile,
      currentVoiceFile: frame.voiceFile,
      currentVoiceSpeakerId: frame.voiceSpeakerId,
      currentChoices: frame.choices,
      isWaitingTransition: frame.isWaitingTransition,
      currentTransition: frame.transition,
      isEnd: frame.isEnd,
    }

    // Append to log if there's text
    if (frame.text.trim()) {
      const entry: KAGLogEntry = { text: frame.text, speakerName: frame.speakerName }
      updates.logs = [...useKAGScenarioStore.getState().logs, entry]
    }

    setFrame(updates)
    if (frame.isEnd) setIsScenarioEnd(true)

    // Handle [wait time=N] timer
    if (frame.isWaitingTimer && frame.waitTime) {
      setTimeout(() => {
        interpreterRef.current?.onTransitionComplete() // reuse same callback for timer
        void doAdvance()
      }, frame.waitTime)
    }
  }, [setFrame])

  const doAdvance = useCallback(async () => {
    const interp = interpreterRef.current
    if (!interp) return
    try {
      const frame = await interp.advance()
      applyFrame(frame)
    } catch (err) {
      const msg = String(err)
      if (msg.startsWith('Error: CROSS_FILE_JUMP:')) {
        const [, file, target] = msg.replace('Error: CROSS_FILE_JUMP:', '').split(':')
        const tokens = await loadKAGTokens(`scenarios/${file.replace('.ks', '')}`)
        const label = (target ?? '').replace(/^\*/, '')
        const flags = useKAGScenarioStore.getState().flags
        interp.loadTokens(tokens, label, flags)
        await doAdvance()
      } else {
        console.error('KAG advance error:', err)
      }
    }
  }, [applyFrame])

  const goToNextLine = useCallback(async () => {
    if (isScenarioEnd) return
    await doAdvance()
  }, [isScenarioEnd, doAdvance])

  const handleChoiceSelect = useCallback(async (target: string) => {
    interpreterRef.current?.selectChoice(target)
    setFrame({ currentChoices: undefined })
    await doAdvance()
  }, [setFrame, doAdvance])

  const onTransitionComplete = useCallback(() => {
    // Calling onTransitionComplete() resolves the Promise inside advance().
    // The original advance() call resumes and returns the next frame on its own —
    // do NOT call doAdvance() here, that would create a second concurrent cursor walk.
    interpreterRef.current?.onTransitionComplete()
    setFrame({ isWaitingTransition: false, currentTransition: undefined })
  }, [setFrame])

  const skipToNextChoice = useCallback(async () => {
    // Fast-forward: keep advancing until choices appear or end
    const interp = interpreterRef.current
    if (!interp) return
    let frame = await interp.advance()
    while (!frame.choices && !frame.isEnd) {
      if (frame.text.trim()) {
        const entry: KAGLogEntry = { text: frame.text, speakerName: frame.speakerName }
        setFrame({ logs: [...useKAGScenarioStore.getState().logs, entry] })
      }
      if (frame.isWaitingTransition) interp.onTransitionComplete()
      frame = await interp.advance()
    }
    applyFrame(frame)
  }, [applyFrame, setFrame])

  const getCurrentSpeakerName = useCallback(() => {
    return useKAGScenarioStore.getState().currentSpeakerName
  }, [])

  // Call this once after loading the interpreter
  const init = useCallback((interp: KAGInterpreter) => {
    interpreterRef.current = interp
    setIsScenarioEnd(false)
    void doAdvance()
  }, [doAdvance])

  return {
    goToNextLine,
    handleChoiceSelect,
    onTransitionComplete,
    skipToNextChoice,
    getCurrentSpeakerName,
    isScenarioEnd,
    init,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/Message/hooks/useKAGScenarioManager.ts
git commit -m "feat: add useKAGScenarioManager hook"
```

---

## Task 6: ForegroundLayer Component

Replaces `Character3D.tsx` and `CutIn3D.tsx`. Renders any foreground layer (0-9) as a 3D sprite with smooth animations.

**Files:**
- Create: `src/components/modules/ForegroundLayer/ForegroundLayer.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/modules/ForegroundLayer/ForegroundLayer.tsx
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import type { KAGLayer } from '@/types/kag'

const ANIM_SPEED = 8

// Single layer sprite with animated opacity/position/scale
function LayerSprite({ layer }: { layer: KAGLayer }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const { viewport } = useThree()

  const texture = useTexture(
    layer.file ? `/images/foreground/${layer.file}` : '/images/foreground/placeholder.webp'
  )

  const targetOpacity = layer.visible ? layer.opacity / 255 : 0
  const targetX = (layer.x / 1920) * viewport.width   // normalize from px to viewport
  const targetY = -(layer.y / 1080) * viewport.height
  const z = 0.05 + (typeof layer.id === 'number' ? layer.id * 0.01 : 0)

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return
    const alpha = 1 - Math.exp(-delta * ANIM_SPEED)
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, targetOpacity, alpha)
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, alpha)
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, alpha)
    meshRef.current.position.z = z
    const targetScale = layer.scale * (viewport.height * 0.8)
    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale, alpha)
    // Maintain aspect ratio
    const aspect = texture.image?.width && texture.image?.height
      ? texture.image.width / texture.image.height : 1
    meshRef.current.scale.x = meshRef.current.scale.y * aspect
  })

  return (
    <mesh ref={meshRef} position={[targetX, targetY, z]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={targetOpacity}
      />
    </mesh>
  )
}

// Renders all foreground layers (id: 0-9) from the store
export function ForegroundLayer() {
  const layers = useKAGScenarioStore(s => s.layers.filter(l => typeof l.id === 'number'))
  return (
    <>
      {layers.map(layer => (
        layer.file ? (
          <LayerSprite key={layer.id} layer={layer} />
        ) : null
      ))}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/ForegroundLayer/ForegroundLayer.tsx
git commit -m "feat(renderer): add ForegroundLayer replacing Character3D and CutIn3D"
```

---

## Task 7: Background3D with Transition Support

**Files:**
- Modify: `src/components/modules/Background/Background3D.tsx`

- [ ] **Step 1: Rewrite `Background3D.tsx`**

```tsx
// src/components/modules/Background/Background3D.tsx
import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

const FADE_SPEED = 3   // crossfade animation speed

function BackgroundMesh({ file, opacity, onFadeComplete }: {
  file: string
  opacity: number
  onFadeComplete?: () => void
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const { viewport } = useThree()
  const texture = useTexture(`/images/backgrounds/${file}`)

  // Object-cover: fill viewport
  const texAspect = texture.image?.width && texture.image?.height
    ? texture.image.width / texture.image.height : 16 / 9
  const vpAspect = viewport.width / viewport.height
  const [sx, sy] = texAspect > vpAspect
    ? [viewport.height * texAspect, viewport.height]
    : [viewport.width, viewport.width / texAspect]

  useFrame((_, delta) => {
    if (!matRef.current) return
    const alpha = 1 - Math.exp(-delta * FADE_SPEED)
    const newOpacity = THREE.MathUtils.lerp(matRef.current.opacity, opacity, alpha)
    matRef.current.opacity = newOpacity
    if (Math.abs(newOpacity - opacity) < 0.01) {
      matRef.current.opacity = opacity
      if (opacity === 0 || opacity === 1) onFadeComplete?.()
    }
  })

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[sx, sy]} />
      <meshBasicMaterial ref={matRef} map={texture} transparent opacity={opacity} />
    </mesh>
  )
}

export function Background3D({ onTransitionComplete }: { onTransitionComplete?: () => void }) {
  const layer = useKAGScenarioStore(s => s.layers.find(l => l.id === 'base'))
  const transition = useKAGScenarioStore(s => s.currentTransition)
  const isWaiting = useKAGScenarioStore(s => s.isWaitingTransition)

  const prevFileRef = useRef<string | undefined>(undefined)
  const currentFile = layer?.file

  // When a new file arrives with a transition, show crossfade
  const isTransitioning = isWaiting && transition?.method === 'crossfade' &&
    prevFileRef.current !== undefined && prevFileRef.current !== currentFile

  useEffect(() => {
    if (currentFile && !isWaiting) {
      prevFileRef.current = currentFile
    }
  }, [currentFile, isWaiting])

  if (!currentFile) return null

  return (
    <>
      {/* Previous background fades out */}
      {isTransitioning && prevFileRef.current && (
        <BackgroundMesh file={prevFileRef.current} opacity={0} />
      )}
      {/* Current background fades in */}
      <BackgroundMesh
        file={currentFile}
        opacity={1}
        onFadeComplete={isTransitioning ? onTransitionComplete : undefined}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/Background/Background3D.tsx
git commit -m "feat(renderer): add crossfade transition to Background3D"
```

---

## Task 8: Wire Everything into MainScreen + ThreeCanvas + Message

**Files:**
- Modify: `src/components/ThreeCanvas.tsx`
- Modify: `src/components/screens/MainScreen/index.tsx`
- Modify: `src/components/modules/Message/index.tsx`
- Modify: `src/components/modules/Voice/index.tsx`
- Modify: `src/components/modules/Bgm/index.tsx`

- [ ] **Step 1: Update `ThreeCanvas.tsx`**

`useKAGScenarioManager` must NOT be called in `ThreeCanvas` — calling the same hook in two components creates two separate interpreter instances. Instead, `Background3D` calls `onTransitionComplete` by reading a callback stored in `kagScenarioStore`.

First, add a `transitionCompleteCallback` field to `kagScenarioStore`:

```typescript
// In kagScenarioStore.ts — add to KAGScenarioStore type and initial state:
transitionCompleteCallback: (() => void) | null
setTransitionCompleteCallback: (fn: (() => void) | null) => void
```

And in the store creator:
```typescript
transitionCompleteCallback: null,
setTransitionCompleteCallback: fn => set({ transitionCompleteCallback: fn }),
```

Then in `useKAGScenarioManager`, register the callback when the interpreter is loaded:
```typescript
// In the hook, after setting interpreterRef.current:
useKAGScenarioStore.getState().setTransitionCompleteCallback(() => {
  interpreterRef.current?.onTransitionComplete()
  useKAGScenarioStore.getState().setFrame({ isWaitingTransition: false, currentTransition: undefined })
})
```

Now `ThreeCanvas` is simple:

```tsx
// src/components/ThreeCanvas.tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Background3D } from './modules/Background/Background3D'
import { ForegroundLayer } from './modules/ForegroundLayer/ForegroundLayer'
// Remove: Character3D, CutIn3D

export function ThreeCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Suspense fallback={null}>
        <Background3D />
        <ForegroundLayer />
      </Suspense>
    </Canvas>
  )
}
```

And `Background3D` reads the callback from the store directly:

```tsx
// In Background3D.tsx — replace onTransitionComplete prop with store read:
const handleFadeComplete = () => {
  useKAGScenarioStore.getState().transitionCompleteCallback?.()
}
// Pass handleFadeComplete to BackgroundMesh's onFadeComplete
```

- [ ] **Step 2: Update `MainScreen/index.tsx`**

```tsx
// src/components/screens/MainScreen/index.tsx
import { useEffect } from 'react'
import { loadKAGScenario } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { ThreeCanvas } from '@/components/ThreeCanvas'
import { Message } from '@/components/modules/Message'
import { Navigation } from '@/components/modules/Navigation'
import { Log } from '@/components/modules/Log'
import { Voice } from '@/components/modules/Voice'
import { Bgm } from '@/components/modules/Bgm'
import { useKAGScenarioManager } from '@/components/modules/Message/hooks/useKAGScenarioManager'

export function MainScreen() {
  const { init } = useKAGScenarioManager()
  const flags = useKAGScenarioStore(s => s.flags)

  useEffect(() => {
    loadKAGScenario('scenarios/main', flags)
      .then(interp => init(interp))
      .catch(console.error)
  }, [])

  return (
    <div className="relative w-full h-full">
      <Voice />
      <Bgm />
      <ThreeCanvas />
      <Message />
      <Navigation />
      <Log />
    </div>
  )
}
```

- [ ] **Step 3: Update `Voice/index.tsx`**

```tsx
// src/components/modules/Voice/index.tsx
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { CONFIG } from '@/constants'

export function Voice() {
  const voiceFile = useKAGScenarioStore(s => s.currentVoiceFile)
  const speakerId = useKAGScenarioStore(s => s.currentVoiceSpeakerId)
  const choices = useKAGScenarioStore(s => s.currentChoices)

  if (choices) return null  // no voice on choice screens

  if (voiceFile) {
    return <audio key={voiceFile} src={`/sounds/voices/${voiceFile}`} autoPlay />
  }
  if (CONFIG.VOICEVOX && speakerId !== undefined) {
    return <audio key={speakerId} src={`/voices/${speakerId}.mp3`} autoPlay />
  }
  return null
}
```

- [ ] **Step 4: Update `Bgm/index.tsx`**

```tsx
// src/components/modules/Bgm/index.tsx
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

export function Bgm() {
  const bgmFile = useKAGScenarioStore(s => s.currentBgmFile)
  if (!bgmFile) return null
  return <audio key={bgmFile} src={`/sounds/bgm/${bgmFile}`} autoPlay loop />
}
```

- [ ] **Step 5: Rewrite `Message/index.tsx`**

```tsx
// src/components/modules/Message/index.tsx
import { useCallback, useRef } from 'react'
import { useKAGScenarioManager } from './hooks/useKAGScenarioManager'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { useNavigationStore } from '@/states/navigationStore'
import { useSkipActionStore } from '@/states/skipActionStore'
import { useScreenStore } from '@/states/screenStore'
import { MessageTypewriter } from './MessageTypewriter'
import { Choice } from '../Choice'
import { DialogueLayout, NarrationLayout } from './layouts'
import { SCREEN } from '@/constants'

export function Message() {
  const { goToNextLine, handleChoiceSelect, skipToNextChoice, isScenarioEnd } =
    useKAGScenarioManager()
  const currentText = useKAGScenarioStore(s => s.currentText)
  const speakerName = useKAGScenarioStore(s => s.currentSpeakerName)
  const choices = useKAGScenarioStore(s => s.currentChoices)
  const { isAutoPlay } = useNavigationStore()
  const { setScreen } = useScreenStore()

  const typewriterRef = useRef<{ finish: () => void } | null>(null)
  const isReadingRef = useRef(false)

  // Register skip callback
  useSkipActionStore.getState().setAction(skipToNextChoice)

  const handleNext = useCallback(async () => {
    if (isScenarioEnd) {
      setScreen(SCREEN.ENDING_SCREEN)
      return
    }
    if (choices) return  // blocked until choice selected
    if (isReadingRef.current) {
      typewriterRef.current?.finish()
      return
    }
    await goToNextLine()
  }, [isScenarioEnd, choices, goToNextLine, setScreen])

  const Layout = speakerName ? DialogueLayout : NarrationLayout

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 cursor-pointer" onClick={handleNext}>
      <Layout speakerName={speakerName}>
        <MessageTypewriter
          key={currentText}
          text={currentText}
          onStart={() => { isReadingRef.current = true }}
          onComplete={() => { isReadingRef.current = false }}
          ref={typewriterRef}
        />
      </Layout>
      {choices && (
        <Choice
          choices={choices}
          onSelect={target => handleChoiceSelect(target)}
        />
      )}
    </div>
  )
}
```

> **Note:** `isScenarioEnd` is now a `boolean` (not a function). Do not call it as `isScenarioEnd()`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ThreeCanvas.tsx src/components/screens/MainScreen/index.tsx
git add src/components/modules/Voice/index.tsx src/components/modules/Bgm/index.tsx
git add src/components/modules/Message/index.tsx
git commit -m "feat: wire KAG system into MainScreen, ThreeCanvas, Message, Voice, Bgm"
```

---

## Task 9: Create S_000.ks and main.ks

**Files:**
- Create: `public/scenarios/main.ks`
- Create: `public/scenarios/S_000.ks`

- [ ] **Step 1: Create `public/scenarios/main.ks`**

```ks
; main.ks — エントリーポイント
*entry
[jump target=*entry file=S_000.ks]
[s]
```

- [ ] **Step 2: Create `public/scenarios/S_000.ks`**

Convert `S_000.json` to KAG format. Layer assignment: 渚=layer 0 (speakerId=3), 凛=layer 1 (speakerId=2), cutIn=layer 3, fullscreen CG=layer 4.

```ks
; S_000.ks — チュートリアルシナリオ
; Layer: 0=渚, 1=凛, 3=カットイン, 4=フルスクリーンCG

[image storage=bg_01.webp layer=base]
[image layer=0 storage=chara_01.webp visible=true]
[image layer=1 storage=chara_02.webp visible=true]

*start
ようこそ、Exiaノベルゲームエンジンへ！[r]このチュートリアルでは、基本機能を紹介します。[l]
画面をクリックするか、スペースキーを押して、ストーリーを進めることができます。[l]
[name text="渚"]
[voice speaker=3]
こんにちは！私が渚です。Exiaの機能を順に説明していきましょう。[l]
[name text="渚"]
まず、この画面のようにキャラクターがセリフを話すことができます。[r]これは「ダイアログ」モードと呼ばれています。[l]
これは「ナレーション」モードです。ストーリーの背景説明などに使用されます。[l]
[name text="凛"]
[voice speaker=2]
私は凛です！複数のキャラクターが会話することもできますね。[l]
[name text="渚"]
[voice speaker=3]
その通りです。次に特殊な表現方法を紹介します。[l]
[name text="凛"]
[voice speaker=2]
テキストは[r]このように改行したり、サイズを変えたりすることもできます。[l]

[image layer=3 storage=cut_01.webp visible=true left=0 top=0]
これはカットインです。特定のシーンを強調するために使用できます。[l]
[name text="渚"]
[voice speaker=3]
カットインが表示されている状態でもキャラクターが会話できますね。[l]
[image layer=3 visible=false]
カットインを非表示にすることもできます。[l]

[image layer=4 storage=cg_01.webp visible=true left=0 top=0]
これはフルスクリーンCGです。重要なシーンや背景の変更に使用できます。[l]
[name text="凛"]
[voice speaker=2]
CGの上にキャラクターのセリフを表示することもできます。物語の臨場感が増しますね！[l]
[image layer=4 visible=false]
CGを終了して、通常のシーンに戻ります。[l]
[name text="渚"]
[voice speaker=3]
そして最後に、Exiaの重要な機能である「選択肢」を紹介します。[r]ユーザーは物語の進行を選ぶことができます。[l]

どのような機能についてもっと知りたいですか？[r]
[glink target=*set_feature_text text="テキストスタイルについて"]
[glink target=*set_feature_chara text="キャラクター表示について"]
[s]

*set_feature_text
[flag name=first_choice value=text]
[jump target=*text_style_choice]

*set_feature_chara
[flag name=first_choice value=chara]
[jump target=*character_choice]

*text_style_choice
[name text="渚"]
[voice speaker=3]
テキストスタイルについて説明します。Exiaでは、HTMLタグを使って色や太字などのスタイルを適用できます。[l]
また、テキストの表示速度も調整できます。これはゲームの雰囲気作りに重要な要素です。[l]
[jump target=*choice_end]

*character_choice
[name text="凛"]
[voice speaker=2]
キャラクター表示について説明します。キャラクターの立ち絵は自由に切り替えることができます。[l]
また、キャラクターの名前を途中で変更したり、表情を変えたりすることも可能です。ストーリーの展開に合わせて使い分けましょう。[l]
[jump target=*choice_end]

*choice_end
もっと知りたい機能はありますか？[r]
[glink target=*tutorial_end text="もう十分です"]
[glink target=*start text="最初から見る"]
[s]

*tutorial_end
[if exp="f.first_choice == text"]
[name text="渚"]
[voice speaker=3]
テキストスタイルに興味を持ってくれたんですね！ぜひ色々試してみてください。[l]
[else]
[name text="凛"]
[voice speaker=2]
キャラクター表示に興味を持ってくれたんですね！様々な表現を楽しんでください。[l]
[endif]
これでチュートリアルは終了です。Exiaをお楽しみください！[l]
[s]
```

- [ ] **Step 3: Start the dev server and verify the scenario loads and plays**

```bash
npm run dev
# Open http://localhost:5173 in browser
# Verify: text displays, characters show, choices work, conditions branch correctly
```

- [ ] **Step 4: Commit**

```bash
git add public/scenarios/main.ks public/scenarios/S_000.ks
git commit -m "feat(scenario): add KAG scenario files S_000.ks and main.ks"
```

---

## Task 10: Delete Old Code

Once the KAG system is working end-to-end, remove the old JSON-based system.

**Files to delete:**
- `src/states/scenarioStore.ts`
- `src/utils/scenarioLoader.ts`
- `src/utils/jumpToResolver.ts`
- `src/components/modules/Character/Character3D.tsx`
- `src/components/modules/CutIn/CutIn3D.tsx`
- `src/components/modules/Message/hooks/useScenarioManager.ts`
- `src/tests/jumpToResolver.test.ts` (no longer needed)
- `src/types/index.ts` (ScenarioLine-based types — verify nothing imports from it first)

- [ ] **Step 1: Check for remaining imports of old modules**

```bash
grep -r "scenarioStore\|scenarioLoader\|jumpToResolver\|useScenarioManager\|Character3D\|CutIn3D" src/ --include="*.ts" --include="*.tsx" | grep -v "kagScenarioStore\|kagLoader\|useKAGScenarioManager\|ForegroundLayer"
```
Expected: no output (all references removed).

- [ ] **Step 2: Delete old files**

```bash
git rm src/states/scenarioStore.ts
git rm src/utils/scenarioLoader.ts
git rm src/utils/jumpToResolver.ts
git rm src/components/modules/Character/Character3D.tsx
git rm src/components/modules/CutIn/CutIn3D.tsx
git rm src/components/modules/Message/hooks/useScenarioManager.ts
git rm src/tests/jumpToResolver.test.ts
git rm src/types/index.ts
```

- [ ] **Step 3: Verify build still passes**

```bash
npm run type-check
npm run test
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: remove JSON scenario system (replaced by KAG)"
```

---

## Task 11: Update scripter SKILL.md

**Files:**
- Modify: `.agent/skills/scripter/SKILL.md`

- [ ] **Step 1: Read and update the scripter skill**

Key changes to `.agent/skills/scripter/SKILL.md`:

1. **Output format**: Replace all JSON assembly instructions with KAG output instructions
2. **Output path**: `public/scenarios/S_XXX.ks` (not `.json`)
3. **Meta-tag mappings** from `scenario_draft.md`:
   - `〈CG:XXX〉` → `[image layer=3 storage=XXX visible=true]`
   - `〈BG:name〉` → `[image storage=name layer=base]`
   - `〈VOICE:XXX〉` → `[voice storage=XXX]`
   - `〈BGM:name〉` → `[bgm storage=name]`
   - `〈SE:name〉` → `[se storage=name]`
   - `〈FACE:emotion〉` → `[image layer=N storage=chara_XX_emotion.webp]` (N = character's layer)
4. **Character layer table**: Define at script head as a comment
5. **Speaker name**: Use `[name text="キャラ名"]` before each line
6. **Voice synthesis**: Use `[voice speaker=N]` for VOICEVOX IDs
7. **Quality checks**: Update line-count and validation rules for KAG syntax

- [ ] **Step 2: Commit**

```bash
git add .agent/skills/scripter/SKILL.md
git commit -m "feat(agent): update scripter skill to output KAG format"
```

---

## Verification

- [ ] `npm run test` — all tests pass (Rust + TypeScript)
- [ ] `npm run type-check` — zero TypeScript errors
- [ ] `npm run dev` → play through S_000.ks end-to-end in browser
- [ ] Verify in browser: characters show/hide, CG overlays work, choices branch correctly, conditional `[if]` routes correctly
- [ ] Verify crossfade transition by temporarily adding `[trans]`/`[wt]` to S_000.ks

---

## Order Summary

```
Task 1  → Rust lexer (parse_kag_text)
Task 2  → TypeScript types
Task 3  → KAGInterpreter (core logic, TDD)
Task 4  → kagLoader + kagScenarioStore
Task 5  → useKAGScenarioManager hook
Task 6  → ForegroundLayer component
Task 7  → Background3D with transitions
Task 8  → Wire into MainScreen + Message + Voice + Bgm
Task 9  → S_000.ks + main.ks (run and verify)
Task 10 → Delete old code
Task 11 → scripter SKILL.md update
```
