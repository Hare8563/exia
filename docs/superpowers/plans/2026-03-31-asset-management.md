# Asset Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase Storage + Firestore + Firebase Auth を用いたソシャゲ型コンテンツアップデート対応のアセット管理システムを実装し、KAGコンポーネントのハードコードパスを AssetManager 経由の ID 解決に置き換える。

**Architecture:** Firestore でパック情報を管理し、Firebase Storage に XP3 パックファイル（UUID命名）を置く。Tauri の同期コマンド経由でダウンロード・XP3 展開・MD5 検証を行い、AppData に展開済みアセットを保存する。フロントエンドは `AssetManager.initialize()` 起動時に `app_data_dir` と `manifest.json` をメモリキャッシュし、各コンポーネントは `assetManager.resolve(id, fallback)` で同期的に URL を取得する。

**Tech Stack:** Rust (flate2, md5, reqwest blocking), TypeScript, Firebase JS SDK (firebase/auth, firebase/firestore, firebase/storage), Tauri 2.x, Vitest, React

---

## 重要な前提知識

### SCREEN 定数と setScreen の既存 API
`src/constants/index.ts` の `SCREEN` は数値の `as const` オブジェクト（現在 0, 1, 2）。
`setScreen` のシグネチャは `(data: Partial<Screen> | ((prev: Screen) => Screen)) => void`。

このプランでは新スクリーンを **数値** として追加し、呼び出しは必ず `setScreen({ screen: SCREEN.X })` の形式を使う。

### reqwest::blocking と Tauri コマンド
Tauri の **同期コマンド**（`async` キーワードなし）はスレッドプール上で実行される（Tokio ランタイム外）。そのため `reqwest::blocking` を安全に使用できる。`async` コマンドにすると Tokio ランタイム内になり `blocking` は panic する。

### アセット ID の規則
アセット ID は KAG スクリプトの `storage=` パラメータ値そのもの（ファイル名＋拡張子）。例: `bg_school.webp`、`main_theme.ogg`。Rust の展開処理でも `Path::file_name()` でファイル名（拡張子付き）を ID として使用する。

---

## ファイル構成

### 新規作成
| ファイル | 責務 |
|---|---|
| `src-tauri/src/xp3.rs` | XP3 パーサー・展開ロジック（純粋 Rust、テスト可能） |
| `src-tauri/src/asset_commands.rs` | Tauri コマンド（app_data_dir, read_manifest, write_manifest, download_and_extract_xp3） |
| `src/types/asset.ts` | Manifest / Pack / AssetEntry 型定義 |
| `src/utils/assetManager.ts` | AssetManager シングルトン |
| `src/firebase.ts` | Firebase app 初期化 |
| `src/components/screens/SignInScreen/index.tsx` | サインイン UI |
| `src/components/modules/AssetUpdater/index.tsx` | パックDL・進捗 UI |
| `src/tests/assetManager.test.ts` | AssetManager ユニットテスト |
| `src-tauri/tests/fixtures/minimal.xp3` | XP3 テストフィクスチャ（Task 2 で生成） |
| `firestore.rules` | Firestore セキュリティルール |
| `storage.rules` | Firebase Storage セキュリティルール |
| `.env.example` | 環境変数テンプレート |

### 変更
| ファイル | 変更内容 |
|---|---|
| `src-tauri/Cargo.toml` | flate2, md5, hex, reqwest（blocking feature）追加 |
| `src-tauri/src/lib.rs` | asset_commands モジュールを登録 |
| `src-tauri/capabilities/default.json` | `core:path:default` 追加 |
| `src/constants/index.ts` | `SIGN_IN: 3`, `ASSET_UPDATE: 4` 追加 |
| `src/states/screenStore.ts` | 初期スクリーンを `SIGN_IN` に変更 |
| `src/App.tsx` | 認証ゲート + AssetUpdater スクリーン追加 |
| `src/main.tsx` | AssetManager.initialize() を render 前に実行 |
| `src/components/modules/Background/Background3D.tsx` | assetManager.resolve() を使用 |
| `src/components/modules/ForegroundLayer/ForegroundLayer.tsx` | assetManager.resolve() を使用 |
| `src/components/modules/Bgm/index.tsx` | assetManager.resolve() を使用 |
| `src/components/modules/Se/index.tsx` | assetManager.resolve() を使用 |
| `src/components/modules/Voice/index.tsx` | assetManager.resolve() を使用 |
| `src/utils/clickableMap.ts` | assetManager.resolve() を使用 |

---

## Task 1: Rust 依存クレートを追加する

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: 依存クレートを追加**

```toml
# src-tauri/Cargo.toml [dependencies] に追加
flate2 = "1.0"
md5 = "0.7"
hex = "0.4"
reqwest = { version = "0.12", features = ["blocking"] }
```

> `reqwest` は `blocking` feature が必須。同期 Tauri コマンドから呼ぶため async は不要。

- [ ] **Step 2: ビルドが通ることを確認**

```bash
cd src-tauri && cargo check
```

Expected: エラーなし（warning は許容）

- [ ] **Step 3: コミット**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: add Rust deps for XP3 extraction (flate2, md5, reqwest blocking)"
```

---

## Task 2: XP3 パーサーを Rust で実装する

XP3 フォーマット仕様（`krkrz/base/XP3Archive.cpp` より）:

```
[Magic 11 bytes]: 58 50 33 0D 0A 20 0A 1A 8B 67 01
[index_offset u64 LE]: インデックスの開始位置
[ファイルデータ]: 各セグメントのバイト列
[インデックス]:
  flag(1byte): 0x01=zlib圧縮, 0x00=raw
  if compressed: compressed_size(u64) + original_size(u64) + zlib_data
  if raw: size(u64) + data
[インデックス内チャンク]: tag(4bytes) + size(u64) + body
  "File" チャンク:
    "info" sub: flags(u32) + org_size(u64) + arc_size(u64) + name_len(u16, UTF-16LE のコードユニット数) + name(UTF-16LE)
    "segm" sub: 繰り返し [ flags(u32) + offset(u64) + org_size(u64) + arc_size(u64) ]
                flags bit0=1 なら zlib 圧縮
    "adlr" sub: adler32(u32)
```

**Files:**
- Create: `src-tauri/src/xp3.rs`
- Create: `src-tauri/tests/fixtures/minimal.xp3`

- [ ] **Step 1: テストフィクスチャを生成する**

```bash
python3 - <<'EOF'
import struct, zlib

# minimal.xp3: "test.txt" (8 UTF-16LE code units) containing b"hello"
MAGIC = bytes([0x58,0x50,0x33,0x0d,0x0a,0x20,0x0a,0x1a,0x8b,0x67,0x01])
file_data = b"hello"
filename = "test.txt"
# name_len は UTF-16LE のコードユニット数（ASCIIは文字数と同じ）
filename_utf16 = filename.encode("utf-16-le")
name_len = len(filename_utf16) // 2   # コードユニット数 = 8

# info sub-chunk: flags(4) + org_size(8) + arc_size(8) + name_len(2) + name
info_body = struct.pack("<IQQh", 0, len(file_data), len(file_data), name_len) + filename_utf16
info_chunk = b"info" + struct.pack("<Q", len(info_body)) + info_body

# segm sub-chunk: offset は後で計算
adler = zlib.adler32(file_data) & 0xFFFFFFFF
adlr_chunk = b"adlr" + struct.pack("<Q", 4) + struct.pack("<I", adler)

# ファイルデータのオフセット: magic(11) + index_ofs_field(8) = 19
file_data_offset = 11 + 8

# segm: flags=0(uncompressed), offset=file_data_offset, org_size=5, arc_size=5
segm_entry = struct.pack("<IQQQ", 0, file_data_offset, len(file_data), len(file_data))
segm_chunk = b"segm" + struct.pack("<Q", len(segm_entry)) + segm_entry

file_body = info_chunk + segm_chunk + adlr_chunk
file_chunk = b"File" + struct.pack("<Q", len(file_body)) + file_body

# インデックス: raw (flag=0x00)
index_data = file_chunk
index_flag = 0x00
index_block = bytes([index_flag]) + struct.pack("<Q", len(index_data)) + index_data

# インデックスのオフセット: magic(11) + index_ofs_field(8) + file_data(5) = 24
index_offset = 11 + 8 + len(file_data)

result = MAGIC + struct.pack("<Q", index_offset) + file_data + index_block

import os
os.makedirs("src-tauri/tests/fixtures", exist_ok=True)
with open("src-tauri/tests/fixtures/minimal.xp3", "wb") as f:
    f.write(result)
print(f"OK: {len(result)} bytes, file_data_offset={file_data_offset}, index_offset={index_offset}")
EOF
```

Expected: `src-tauri/tests/fixtures/minimal.xp3` が生成され OK と表示される

- [ ] **Step 2: xp3.rs の失敗テストを書く**

```rust
// src-tauri/src/xp3.rs
pub struct Xp3Entry {
    pub name: String,   // UTF-8 変換済みファイル名
    pub data: Vec<u8>,  // 展開済みデータ
}

pub fn extract_xp3(data: &[u8]) -> Result<Vec<Xp3Entry>, String> {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_minimal() {
        let data = include_bytes!("../tests/fixtures/minimal.xp3");
        let entries = extract_xp3(data).expect("should extract");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "test.txt");
        assert_eq!(entries[0].data, b"hello");
    }
}
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
cd src-tauri && cargo test xp3 2>&1 | tail -5
```

Expected: FAIL "not yet implemented"

- [ ] **Step 4: XP3 パーサーを実装する**

```rust
// src-tauri/src/xp3.rs
use flate2::read::ZlibDecoder;
use std::io::Read;

const XP3_MAGIC: &[u8] = &[0x58,0x50,0x33,0x0d,0x0a,0x20,0x0a,0x1a,0x8b,0x67,0x01];
const INDEX_ENCODE_ZLIB: u8 = 0x01;

pub struct Xp3Entry {
    pub name: String,
    pub data: Vec<u8>,
}

fn r_u16(d: &[u8], o: usize) -> u16 { u16::from_le_bytes(d[o..o+2].try_into().unwrap()) }
fn r_u32(d: &[u8], o: usize) -> u32 { u32::from_le_bytes(d[o..o+4].try_into().unwrap()) }
fn r_u64(d: &[u8], o: usize) -> u64 { u64::from_le_bytes(d[o..o+8].try_into().unwrap()) }

fn zlib_decompress(src: &[u8], expected_size: usize) -> Result<Vec<u8>, String> {
    let mut decoder = ZlibDecoder::new(src);
    let mut buf = Vec::with_capacity(expected_size);
    decoder.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    Ok(buf)
}

pub fn extract_xp3(data: &[u8]) -> Result<Vec<Xp3Entry>, String> {
    if data.len() < 19 { return Err("file too short".into()); }
    if &data[..11] != XP3_MAGIC { return Err("invalid XP3 magic".into()); }

    let index_offset = r_u64(data, 11) as usize;
    if index_offset >= data.len() { return Err("invalid index offset".into()); }

    // インデックスブロックを解凍またはそのまま読む
    let flag = data[index_offset];
    let mut pos = index_offset + 1;
    let index_body: Vec<u8>;

    if flag & 0x07 == INDEX_ENCODE_ZLIB {
        let comp_size = r_u64(data, pos) as usize; pos += 8;
        let orig_size = r_u64(data, pos) as usize; pos += 8;
        index_body = zlib_decompress(&data[pos..pos+comp_size], orig_size)?;
    } else {
        let orig_size = r_u64(data, pos) as usize; pos += 8;
        index_body = data[pos..pos+orig_size].to_vec();
    }

    let mut entries = Vec::new();
    let mut idx = 0usize;

    while idx + 12 <= index_body.len() {
        let tag = &index_body[idx..idx+4]; idx += 4;
        let chunk_size = r_u64(&index_body, idx) as usize; idx += 8;
        let chunk = &index_body[idx..idx+chunk_size]; idx += chunk_size;

        if tag != b"File" { continue; }

        let mut sub = 0usize;
        let mut filename: Option<String> = None;
        // (offset, org_size, arc_size, compressed)
        let mut segments: Vec<(usize, usize, usize, bool)> = vec![];

        while sub + 12 <= chunk.len() {
            let stag = &chunk[sub..sub+4]; sub += 4;
            let ssize = r_u64(chunk, sub) as usize; sub += 8;
            let sbody = &chunk[sub..sub+ssize]; sub += ssize;

            if stag == b"info" && sbody.len() >= 22 {
                // flags(4) + org_size(8) + arc_size(8) + name_len(2, UTF-16LE コードユニット数) + name
                let name_units = r_u16(sbody, 20) as usize;
                let name_bytes = &sbody[22..22+name_units*2];
                let utf16: Vec<u16> = name_bytes.chunks(2)
                    .map(|c| u16::from_le_bytes([c[0], c[1]]))
                    .collect();
                filename = String::from_utf16(&utf16).ok();
            } else if stag == b"segm" {
                let mut s = 0usize;
                while s + 28 <= sbody.len() {
                    let flags    = r_u32(sbody, s);
                    let offset   = r_u64(sbody, s+4) as usize;
                    let org_size = r_u64(sbody, s+12) as usize;
                    let arc_size = r_u64(sbody, s+20) as usize;
                    segments.push((offset, org_size, arc_size, flags & 1 == 1));
                    s += 28;
                }
            }
        }

        if let Some(name) = filename {
            let mut file_data = Vec::new();
            for (offset, org_size, arc_size, compressed) in &segments {
                let seg = &data[*offset..*offset+*arc_size];
                if *compressed {
                    file_data.extend(zlib_decompress(seg, *org_size)?);
                } else {
                    file_data.extend_from_slice(seg);
                }
            }
            entries.push(Xp3Entry { name, data: file_data });
        }
    }

    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_minimal() {
        let data = include_bytes!("../tests/fixtures/minimal.xp3");
        let entries = extract_xp3(data).expect("should extract");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "test.txt");
        assert_eq!(entries[0].data, b"hello");
    }
}
```

- [ ] **Step 5: テストが通ることを確認**

```bash
cd src-tauri && cargo test xp3 2>&1 | tail -5
```

Expected: PASS `test_extract_minimal`

- [ ] **Step 6: コミット**

```bash
git add src-tauri/src/xp3.rs src-tauri/tests/fixtures/minimal.xp3
git commit -m "feat(rust): implement XP3 archive extractor with unit test"
```

---

## Task 3: Tauri コマンドを実装する

**Files:**
- Create: `src-tauri/src/asset_commands.rs`

> **重要**: コマンドは `async` なし（同期）で定義する。Tauri は同期コマンドをスレッドプール上で実行するため、`reqwest::blocking` を安全に使用できる。`async` コマンドは Tokio ランタイム上で実行されるため `blocking` API は panic する。

- [ ] **Step 1: asset_commands.rs を実装する**

```rust
// src-tauri/src/asset_commands.rs

use std::path::PathBuf;
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ExtractedAssetEntry {
    pub id: String,             // ファイル名（拡張子付き）: "bg_school.webp"
    pub extracted_path: String, // app_data_dir からの相対パス: "assets/pack_001/images/bgimage/bg_school.webp"
}

// app_data_dir の絶対パス文字列を返す
#[tauri::command]
pub fn asset_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path().app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

// manifest.json を読んで文字列で返す。存在しなければ null
#[tauri::command]
pub fn asset_read_manifest(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = manifest_path(&app)?;
    if !path.exists() { return Ok(None); }
    std::fs::read_to_string(&path).map(Some).map_err(|e| e.to_string())
}

// manifest.json を書き込む
#[tauri::command]
pub fn asset_write_manifest(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let path = manifest_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

// DL → MD5 検証 → XP3 展開 → AppData に書き出し → 展開済みファイル一覧を返す
// NOTE: 同期コマンド。reqwest::blocking を使用（Tokio ランタイム外のスレッドプール上で実行）
#[tauri::command]
pub fn asset_download_and_extract(
    app: tauri::AppHandle,
    url: String,
    pack_id: String,
    expected_md5: String,
) -> Result<Vec<ExtractedAssetEntry>, String> {
    // 1. ダウンロード
    let bytes = reqwest::blocking::get(&url)
        .map_err(|e| format!("download failed: {e}"))?
        .bytes()
        .map_err(|e| format!("read body failed: {e}"))?;

    // 2. MD5 検証
    let digest = md5::compute(&bytes);
    let actual_md5 = format!("{:x}", digest);
    if actual_md5 != expected_md5.to_lowercase() {
        return Err(format!("MD5 mismatch: expected {expected_md5}, got {actual_md5}"));
    }

    // 3. XP3 展開
    let xp3_entries = crate::xp3::extract_xp3(&bytes)?;

    // 4. AppData/assets/{pack_id}/ に書き出し
    let base_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("assets")
        .join(&pack_id);
    std::fs::create_dir_all(&base_dir).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for entry in &xp3_entries {
        let dest = base_dir.join(&entry.name);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&dest, &entry.data).map_err(|e| e.to_string())?;

        // ID: ファイル名（拡張子付き）。KAG の storage= パラメータと一致させる
        let id = std::path::Path::new(&entry.name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&entry.name)
            .to_string();

        result.push(ExtractedAssetEntry {
            id,
            extracted_path: format!("assets/{}/{}", pack_id, entry.name),
        });
    }

    Ok(result)
}

fn manifest_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir()
        .map(|d| d.join("manifest.json"))
        .map_err(|e| e.to_string())
}
```

- [ ] **Step 2: lib.rs にモジュールとコマンドを登録する**

`src-tauri/src/lib.rs` の冒頭に追加：
```rust
mod xp3;
mod asset_commands;
```

`invoke_handler` を更新：
```rust
.invoke_handler(tauri::generate_handler![
    save_scenario,
    parse_kag_text,
    asset_commands::asset_app_data_dir,
    asset_commands::asset_read_manifest,
    asset_commands::asset_write_manifest,
    asset_commands::asset_download_and_extract,
])
```

- [ ] **Step 3: capabilities を更新する**

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "enables the default permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:path:default"
  ]
}
```

> Note: `tauri-plugin-fs` は不要。`app_data_dir()` は `tauri::Manager` トレイトの `app.path()` API から取得するため（Tauri 2.x）。

- [ ] **Step 4: ビルドが通ることを確認**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```

Expected: Finished または warning のみ

- [ ] **Step 5: コミット**

```bash
git add src-tauri/src/asset_commands.rs src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat(rust): add asset Tauri commands (app_data_dir, manifest rw, download+extract XP3)"
```

---

## Task 4: TypeScript の型定義を追加する

**Files:**
- Create: `src/types/asset.ts`

- [ ] **Step 1: 型を定義する**

```typescript
// src/types/asset.ts

export interface PackMeta {
  version: string
  downloadedAt: string
}

export interface AssetManifest {
  schemaVersion: 1
  lastChecked: string
  packs: Record<string, PackMeta>   // packId → meta
  assets: Record<string, string>    // assetId（ファイル名+拡張子） → 相対パス
}

// Firestore /packs/{packId} ドキュメント
export interface FirestorePack {
  id: string
  storageRef: string      // "packs/uuid.xp3"
  version: string
  name: string
  requiredRole: string    // "free" | "premium"
  md5: string
}
```

- [ ] **Step 2: コミット**

```bash
git add src/types/asset.ts
git commit -m "feat: add asset management TypeScript types"
```

---

## Task 5: AssetManager コアを実装する（Firebase なし）

Firebase なしで動作する部分（manifest 読み込み + resolve）を先に実装し、テストする。

**Files:**
- Create: `src/utils/assetManager.ts`
- Create: `src/tests/assetManager.test.ts`

- [ ] **Step 1: 失敗テストを書く**

```typescript
// src/tests/assetManager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tauri API と Firebase をモック（Firebase は後の Task で統合するが先にモックしておく）
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: (path: string) => `asset://localhost/${path.replace(/\\/g, '/')}`,
}))

vi.mock('@/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}))

import { invoke } from '@tauri-apps/api/core'
import { AssetManager } from '@/utils/assetManager'

describe('AssetManager', () => {
  let manager: AssetManager

  beforeEach(() => {
    manager = new AssetManager()
    vi.clearAllMocks()
  })

  describe('initialize()', () => {
    it('loads app_data_dir and manifest into memory', async () => {
      const manifest = JSON.stringify({
        schemaVersion: 1,
        lastChecked: '2026-03-31T00:00:00Z',
        packs: { pack_001: { version: '1.0.0', downloadedAt: '2026-03-31T00:00:00Z' } },
        assets: { 'bg_school.webp': 'assets/pack_001/images/bgimage/bg_school.webp' },
      })
      vi.mocked(invoke)
        .mockResolvedValueOnce('C:/AppData/exia')  // asset_app_data_dir
        .mockResolvedValueOnce(manifest)            // asset_read_manifest
      await manager.initialize()
      // initialized without error
    })

    it('handles missing manifest.json (null) without error', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce('C:/AppData/exia')
        .mockResolvedValueOnce(null)
      await expect(manager.initialize()).resolves.not.toThrow()
    })
  })

  describe('resolve()', () => {
    beforeEach(async () => {
      const manifest = JSON.stringify({
        schemaVersion: 1,
        lastChecked: '2026-03-31T00:00:00Z',
        packs: {},
        assets: { 'bg_school.webp': 'assets/pack_001/images/bgimage/bg_school.webp' },
      })
      vi.mocked(invoke)
        .mockResolvedValueOnce('C:/AppData/exia')
        .mockResolvedValueOnce(manifest)
      await manager.initialize()
    })

    it('resolves asset in manifest to asset:// URL', () => {
      const url = manager.resolve('bg_school.webp')
      expect(url).toContain('asset://localhost/')
      expect(url).toContain('bg_school.webp')
    })

    it('falls back to public path when asset not in manifest', () => {
      const url = manager.resolve('unknown.webp', 'images/bgimage')
      expect(url).toBe('/images/bgimage/unknown.webp')
    })

    it('throws if called before initialize()', () => {
      const uninit = new AssetManager()
      expect(() => uninit.resolve('foo.webp')).toThrow('AssetManager not initialized')
    })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
pnpm test -- assetManager
```

Expected: FAIL "Cannot find module '@/utils/assetManager'"

- [ ] **Step 3: AssetManager を実装する（Firebase メソッドは stub）**

```typescript
// src/utils/assetManager.ts
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import type { AssetManifest, FirestorePack } from '@/types/asset'

export class AssetManager {
  private appDataDir: string | null = null
  private assets = new Map<string, string>()         // assetId → 相対パス
  private packsCache: Record<string, { version: string; downloadedAt: string }> = {}
  private initialized = false

  async initialize(): Promise<void> {
    this.appDataDir = await invoke<string>('asset_app_data_dir')
    const raw = await invoke<string | null>('asset_read_manifest')
    if (raw) {
      const manifest: AssetManifest = JSON.parse(raw)
      this.packsCache = { ...manifest.packs }
      for (const [id, path] of Object.entries(manifest.assets)) {
        this.assets.set(id, path)
      }
    }
    this.initialized = true
  }

  // アセット ID を WebView 用 URL に解決する（同期）
  // manifest にあれば asset:// URL、なければ public/ へのフォールバック
  resolve(assetId: string, fallbackCategory = ''): string {
    if (!this.initialized) throw new Error('AssetManager not initialized')
    const relative = this.assets.get(assetId)
    if (relative && this.appDataDir) {
      const abs = `${this.appDataDir}/${relative}`.replace(/\\/g, '/')
      return convertFileSrc(abs)
    }
    return fallbackCategory ? `/${fallbackCategory}/${assetId}` : `/${assetId}`
  }

  // Firestore との比較（Task 8 で実装）
  async checkUpdates(_userRoles: string[]): Promise<FirestorePack[]> {
    throw new Error('checkUpdates: not implemented yet')
  }

  // パックのダウンロード・展開（Task 8 で実装）
  async downloadPack(
    _pack: FirestorePack,
    _onProgress?: (pct: number) => void,
  ): Promise<void> {
    throw new Error('downloadPack: not implemented yet')
  }

  // DL 完了後にインメモリキャッシュと manifest.json を更新する
  async applyPackToManifest(
    packId: string,
    version: string,
    newAssets: Record<string, string>,
  ): Promise<void> {
    // 既存データを保持しつつ更新（マルチパック対応）
    this.packsCache[packId] = { version, downloadedAt: new Date().toISOString() }
    for (const [id, path] of Object.entries(newAssets)) {
      this.assets.set(id, path)
    }
    const manifest: AssetManifest = {
      schemaVersion: 1,
      lastChecked: new Date().toISOString(),
      packs: { ...this.packsCache },
      assets: Object.fromEntries(this.assets),
    }
    await invoke('asset_write_manifest', { content: JSON.stringify(manifest, null, 2) })
  }
}

export const assetManager = new AssetManager()
```

- [ ] **Step 4: テストが通ることを確認**

```bash
pnpm test -- assetManager
```

Expected: PASS 全テスト

- [ ] **Step 5: コミット**

```bash
git add src/utils/assetManager.ts src/tests/assetManager.test.ts
git commit -m "feat: implement AssetManager core (initialize + resolve + applyPackToManifest)"
```

---

## Task 6: SCREEN 定数とスクリーン遷移を更新する

> **順序の理由**: Task 7（サインイン画面）と Task 8（AssetUpdater）が `SCREEN.SIGN_IN` / `SCREEN.ASSET_UPDATE` を使うため、先に追加する。既存の `SCREEN` は数値型なので数値で追加する。

**Files:**
- Modify: `src/constants/index.ts`
- Modify: `src/states/screenStore.ts`

- [ ] **Step 1: SCREEN 定数を数値で追加する**

```typescript
// src/constants/index.ts の SCREEN オブジェクトを更新
export const SCREEN = {
  START_SCREEN:  0,
  MAIN_SCREEN:   1,
  ENDING_SCREEN: 2,
  SIGN_IN:       3,   // 追加
  ASSET_UPDATE:  4,   // 追加
} as const;
```

- [ ] **Step 2: screenStore の初期スクリーンを SIGN_IN に変更する**

```typescript
// src/states/screenStore.ts
screenState: {
  screen: SCREEN.SIGN_IN,  // 変更前: SCREEN.MAIN_SCREEN
  isLoaded: false,
},
```

> Note: 既存のテストやデバッグ時に直接 MAIN_SCREEN から始めたい場合は `CONFIG.DEBUG` フラグで分岐できるが、本フェーズでは常に SIGN_IN から開始する。

- [ ] **Step 3: 型チェックが通ることを確認**

```bash
pnpm type-check
```

Expected: エラーなし（`ScreenType` は `0|1|2|3|4` に拡張される）

- [ ] **Step 4: コミット**

```bash
git add src/constants/index.ts src/states/screenStore.ts
git commit -m "feat: add SIGN_IN and ASSET_UPDATE screen constants"
```

---

## Task 7: Firebase SDK をセットアップする

**前提作業（Firebase Console で実施・コード変更なし）:**
1. Firebase プロジェクトを作成
2. Authentication → メール/パスワードを有効化
3. Firestore Database を作成（本番モードで開始）
4. Storage を作成
5. ウェブアプリを追加して firebaseConfig を取得

**Files:**
- Modify: `package.json` (firebase を追加)
- Create: `src/firebase.ts`
- Create: `.env.example`

- [ ] **Step 1: Firebase SDK をインストールする**

```bash
pnpm add firebase
```

- [ ] **Step 2: firebase.ts を作成する**

```typescript
// src/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
```

- [ ] **Step 3: .env.example を作成し、.env を gitignore に追加する**

```
# .env.example
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

`.gitignore` に `.env` が含まれていることを確認。なければ追加。
実際の値を `.env` ファイルに記入する（.env.example はコミット、.env はコミットしない）。

- [ ] **Step 4: 型チェックが通ることを確認**

```bash
pnpm type-check
```

- [ ] **Step 5: コミット**

```bash
git add src/firebase.ts package.json pnpm-lock.yaml .env.example .gitignore
git commit -m "feat: add Firebase SDK setup (auth, firestore, storage)"
```

---

## Task 8: サインイン画面を実装する

**Files:**
- Create: `src/components/screens/SignInScreen/index.tsx`

- [ ] **Step 1: SignInScreen を実装する**

```typescript
// src/components/screens/SignInScreen/index.tsx
import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'
import { useScreenStore } from '@/states/screenStore'
import { SCREEN } from '@/constants'

export const SignInScreen: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { setScreen } = useScreenStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setScreen({ screen: SCREEN.ASSET_UPDATE })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'サインインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <form onSubmit={e => { void handleSubmit(e) }} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold text-center">サインイン</h1>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded border border-gray-600"
          required
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="px-3 py-2 bg-gray-800 rounded border border-gray-600"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : 'サインイン'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックが通ることを確認**

```bash
pnpm type-check
```

- [ ] **Step 3: コミット**

```bash
git add src/components/screens/SignInScreen/index.tsx
git commit -m "feat: add SignInScreen with Firebase Auth email/password"
```

---

## Task 9: AssetManager に Firebase 統合を実装する

**Files:**
- Modify: `src/utils/assetManager.ts`

- [ ] **Step 1: checkUpdates と downloadPack の本実装を追記する**

`assetManager.ts` の import セクションに追加：
```typescript
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { getDownloadURL, ref } from 'firebase/storage'
import { db, storage } from '@/firebase'
```

`checkUpdates` メソッドを差し替え：
```typescript
async checkUpdates(userRoles: string[]): Promise<FirestorePack[]> {
  const snapshot = await getDocs(collection(db, 'packs'))
  const updates: FirestorePack[] = []

  for (const docSnap of snapshot.docs) {
    const pack = { id: docSnap.id, ...docSnap.data() } as FirestorePack
    if (!userRoles.includes(pack.requiredRole)) continue
    const local = this.packsCache[pack.id]
    if (!local || local.version !== pack.version) {
      updates.push(pack)
    }
  }
  return updates
}
```

`downloadPack` メソッドを差し替え：
```typescript
async downloadPack(
  pack: FirestorePack,
  onProgress?: (pct: number) => void,
): Promise<void> {
  onProgress?.(5)

  // 1. Firebase Storage からダウンロード URL を取得
  const packRef = ref(storage, pack.storageRef)
  const url = await getDownloadURL(packRef)

  onProgress?.(10)

  // 2. Rust 同期コマンドでダウンロード・MD5検証・XP3展開
  const extracted = await invoke<{ id: string; extracted_path: string }[]>(
    'asset_download_and_extract',
    { url, packId: pack.id, expectedMd5: pack.md5 },
  )

  onProgress?.(80)

  // 3. manifest に反映（既存パックデータを保持してマージ）
  const newAssets: Record<string, string> = {}
  for (const entry of extracted) {
    newAssets[entry.id] = entry.extracted_path
  }
  await this.applyPackToManifest(pack.id, pack.version, newAssets)

  onProgress?.(100)
}
```

- [ ] **Step 2: 型チェックが通ることを確認**

```bash
pnpm type-check
```

- [ ] **Step 3: コミット**

```bash
git add src/utils/assetManager.ts
git commit -m "feat: implement AssetManager.checkUpdates and downloadPack with Firebase"
```

---

## Task 10: AssetUpdater コンポーネントを実装する

**Files:**
- Create: `src/components/modules/AssetUpdater/index.tsx`

- [ ] **Step 1: AssetUpdater を実装する**

```typescript
// src/components/modules/AssetUpdater/index.tsx
import React, { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { assetManager } from '@/utils/assetManager'
import { useScreenStore } from '@/states/screenStore'
import { SCREEN } from '@/constants'
import type { FirestorePack } from '@/types/asset'

export const AssetUpdater: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'downloading' | 'done' | 'error'>('checking')
  const [message, setMessage] = useState('アップデートを確認中...')
  const [progress, setProgress] = useState(0)
  const { setScreen } = useScreenStore()

  useEffect(() => { void run() }, [])

  async function run() {
    try {
      const uid = auth.currentUser?.uid
      if (!uid) { setStatus('error'); setMessage('未サインイン'); return }

      const userDoc = await getDoc(doc(db, 'users', uid))
      const roles: string[] = userDoc.exists() ? (userDoc.data().roles ?? []) : []

      const updates: FirestorePack[] = await assetManager.checkUpdates(roles)
      if (updates.length === 0) {
        setScreen({ screen: SCREEN.START_SCREEN })
        return
      }

      setStatus('downloading')
      for (let i = 0; i < updates.length; i++) {
        const pack = updates[i]
        setMessage(`ダウンロード中: ${pack.name} (${i + 1}/${updates.length})`)
        await assetManager.downloadPack(pack, pct => {
          setProgress(Math.round(((i + pct / 100) / updates.length) * 100))
        })
      }

      setStatus('done')
      setMessage('完了')
      setTimeout(() => setScreen({ screen: SCREEN.START_SCREEN }), 800)
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="flex flex-col items-center gap-6 w-80">
        <p className="text-lg">{message}</p>
        {status === 'downloading' && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {status === 'error' && (
          <button
            onClick={() => void run()}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            再試行
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックが通ることを確認**

```bash
pnpm type-check
```

- [ ] **Step 3: コミット**

```bash
git add src/components/modules/AssetUpdater/index.tsx
git commit -m "feat: add AssetUpdater component with download progress UI"
```

---

## Task 11: アプリ全体の初期化フローを組み立てる

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: main.tsx を非同期起動に変更する**

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/common.css'
import { assetManager } from '@/utils/assetManager'

async function main() {
  // manifest.json と app_data_dir をメモリにロード（resolve() を同期で使えるようにする）
  await assetManager.initialize()

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

main().catch(console.error)
```

- [ ] **Step 2: App.tsx に認証ゲートと新スクリーンを追加する**

```typescript
// src/App.tsx
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { useScreenStore } from '@/states/screenStore'
import { SCREEN, CONFIG } from '@/constants'
import { Layout } from '@/components/Layout'
import { DebugMenu } from '@/components/DebugMenu'
import { StartScreen } from '@/components/screens/StartScreen'
import { MainScreen } from '@/components/screens/MainScreen'
import { EndingScreen } from '@/components/screens/EndingScreen'
import { SignInScreen } from '@/components/screens/SignInScreen'
import { AssetUpdater } from '@/components/modules/AssetUpdater'

const App = () => {
  const { screenState, setScreen } = useScreenStore()
  const { screen } = screenState

  // Firebase Auth セッション切れ → SIGN_IN に戻す
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) setScreen({ screen: SCREEN.SIGN_IN })
    })
    return unsubscribe
  }, [setScreen])

  return (
    <Layout>
      {screen === SCREEN.SIGN_IN       && <SignInScreen />}
      {screen === SCREEN.ASSET_UPDATE  && <AssetUpdater />}
      {screen === SCREEN.START_SCREEN  && <StartScreen />}
      {screen === SCREEN.MAIN_SCREEN   && <MainScreen />}
      {screen === SCREEN.ENDING_SCREEN && <EndingScreen />}
      {CONFIG.DEBUG && <DebugMenu />}
    </Layout>
  )
}

export default App
```

- [ ] **Step 3: 型チェックが通ることを確認**

```bash
pnpm type-check
```

- [ ] **Step 4: コミット**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: wire app initialization flow (AssetManager init + auth gate + new screens)"
```

---

## Task 12: コンポーネントを assetManager.resolve() に切り替える

**Files:**
- Modify: `src/components/modules/Background/Background3D.tsx`
- Modify: `src/components/modules/ForegroundLayer/ForegroundLayer.tsx`
- Modify: `src/components/modules/Bgm/index.tsx`
- Modify: `src/components/modules/Se/index.tsx`
- Modify: `src/components/modules/Voice/index.tsx`
- Modify: `src/utils/clickableMap.ts`

- [ ] **Step 1: Background3D.tsx を更新する**

`Background3D.tsx:19` を変更：
```typescript
// 追加（ファイル上部の import 群に）:
import { assetManager } from '@/utils/assetManager'

// 変更前:
const texture = useTexture(`/images/bgimage/${file}`)
// 変更後:
const texture = useTexture(assetManager.resolve(file, 'images/bgimage'))
```

- [ ] **Step 2: ForegroundLayer.tsx を更新する**

`ForegroundLayer.tsx:16-17` を変更：
```typescript
// 追加:
import { assetManager } from '@/utils/assetManager'

// 変更前:
const imageDir = typeof layer.id === 'number' && layer.id >= 3 ? 'image' : 'fgimage'
const texture = useTexture(`/images/${imageDir}/${layer.file}`)
// 変更後（フォールバック時の分岐は維持）:
const imageDir = typeof layer.id === 'number' && layer.id >= 3 ? 'image' : 'fgimage'
const texture = useTexture(assetManager.resolve(layer.file, `images/${imageDir}`))
```

- [ ] **Step 3: Bgm/index.tsx を更新する**

```typescript
// 追加:
import { assetManager } from '@/utils/assetManager'

// 変更前:
src={`/sounds/bgm/${bgmFile}`}
// 変更後:
src={assetManager.resolve(bgmFile, 'sounds/bgm')}
```

- [ ] **Step 4: Se/index.tsx を更新する**

```typescript
// 変更前:
src={`/sounds/se/${channel.file}`}
// 変更後:
src={assetManager.resolve(channel.file, 'sounds/se')}
```

- [ ] **Step 5: Voice/index.tsx を更新する**

```typescript
// 変更前:
src={`/sounds/voices/${voiceFile}`}
// 変更後:
src={assetManager.resolve(voiceFile, 'sounds/voices')}
```

- [ ] **Step 6: clickableMap.ts を更新する**

`loadClickableMapDefinition` と `loadClickableMapImage` を書き換える：

```typescript
// src/utils/clickableMap.ts の先頭に追加:
import { assetManager } from '@/utils/assetManager'

// loadClickableMapDefinition を差し替え:
export async function loadClickableMapDefinition(storage: string): Promise<ParsedClickableMap | null> {
  const normalized = storage.replace(/^\/+/, '')
  // manifest から解決（拡張子なしならフォールバック時に .ma を補完）
  const url = assetManager.resolve(
    normalized.endsWith('.ma') ? normalized : `${normalized}.ma`,
    'scenarios',
  )
  const response = await fetch(url)
  if (response.ok) return parseClickableMap(await response.text())
  return null
}

// loadClickableMapImage を差し替え:
export async function loadClickableMapImage(storage: string): Promise<HTMLImageElement | null> {
  const normalized = storage.replace(/^\/+/, '')
  const url = assetManager.resolve(normalized, 'images/image')
  return new Promise<HTMLImageElement | null>(resolve => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}
```

> Note: `fetchFirstAvailable` は未使用になるが削除はこのタスクのスコープ外。

- [ ] **Step 7: 型チェックが通ることを確認**

```bash
pnpm type-check
```

Expected: エラーなし

- [ ] **Step 8: コミット**

```bash
git add src/components/modules/Background/Background3D.tsx \
        src/components/modules/ForegroundLayer/ForegroundLayer.tsx \
        src/components/modules/Bgm/index.tsx \
        src/components/modules/Se/index.tsx \
        src/components/modules/Voice/index.tsx \
        src/utils/clickableMap.ts
git commit -m "feat: replace hardcoded asset paths with assetManager.resolve() in all components"
```

---

## Task 13: Firebase セキュリティルールを設定する

**Files:**
- Create: `firestore.rules`
- Create: `storage.rules`

- [ ] **Step 1: Firestore ルールを作成する**

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // パック一覧: 認証済みユーザー全員が読み取り可
    match /packs/{packId} {
      allow read: if request.auth != null;
      allow write: if false;

      match /assets/{assetId} {
        allow read: if request.auth != null;
        allow write: if false;
      }
    }

    // ユーザーデータ・セーブデータ: 本人のみ
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /saves/{uid}/slots/{slotId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 2: Storage ルールを作成する**

```
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /packs/{fileName} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 3: Firebase CLI でデプロイする**

```bash
firebase deploy --only firestore:rules,storage
```

Expected: Deploy complete

- [ ] **Step 4: コミット**

```bash
git add firestore.rules storage.rules
git commit -m "feat: add Firebase security rules (Firestore + Storage)"
```

---

## 完成確認チェックリスト

手動で以下を確認する：

- [ ] **サインイン**: 起動 → SIGN_IN 画面 → 認証 → ASSET_UPDATE 画面に遷移
- [ ] **アップデートなし**: manifest と Firestore バージョンが一致 → START_SCREEN に即遷移
- [ ] **パックDL**: 未DLパックあり → 進捗バー表示 → DL完了 → START_SCREEN に遷移
- [ ] **マルチパック**: 2回以上 downloadPack を呼んでも manifest に両パックが残ること
- [ ] **アセット解決**: DL済みアセットが `asset://localhost/...` URL で解決される
- [ ] **フォールバック**: manifest にないアセット → public パスにフォールバック
- [ ] **MD5不正**: 壊れたファイル → エラー表示 → 再試行ボタン
- [ ] **セッション切れ**: Firebase Auth が無効化 → SIGN_IN に戻る
- [ ] **型チェック**: `pnpm type-check` エラーなし
- [ ] **ユニットテスト**: `pnpm test` 全 PASS
- [ ] **Rust テスト**: `cd src-tauri && cargo test` 全 PASS

---

## 付録: Firestore テストデータ投入例

```javascript
// /packs/pack_001
{
  storageRef: "packs/550e8400-e29b-41d4-a716-446655440000.xp3",
  version: "1.0.0",
  name: "Chapter 1 Assets",
  requiredRole: "free",
  md5: "<実際のMD5ハッシュ>",
  releaseDate: new Date(),
}

// /packs/pack_001/assets/bg_school.webp
{ extractedPath: "images/bgimage/bg_school.webp" }

// /users/{uid}
{ roles: ["free"], downloadedPacks: [], createdAt: new Date() }
```
