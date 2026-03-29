# KAGスクリプト ランタイム対応 設計書

**日付**: 2026-03-29
**ステータス**: Draft v2

---

## 背景・目的

現在の Exia エンジンはシナリオを JSON フォーマット (`ScenarioLine[]`) で管理している。これを廃止し、**KAG3 (Kirikiri Adventure Game) スクリプト形式 (`.ks`)** をエンジン唯一のシナリオ形式として採用する。

### 変更理由

- JSON フォーマットではトランジション、画面演出、レイヤー管理など視覚的な表現が不足している
- KAG は視覚小説エンジンのデファクトスタンダードであり、豊富な表現力がある
- `.agent/skills/scripter` スキルが KAG を直接出力できるようになり、制作パイプラインが一本化される
- 既存の KAGParser C++ コードがリファレンス実装として利用できる

---

## アーキテクチャ概要

```
.ks ファイル (public/scenarios/)
     ↓ fetch() でテキスト取得 (TypeScript)
     ↓ parse_kag_text(content) Tauri コマンド
[Layer 1] Rust KAGレキサー (src-tauri)
     → Vec<KagToken> (JSON)
     ↓
[Layer 2] TypeScript KAGInterpreter (src/utils/)
     → KAGDisplayFrame (1クリック分の表示状態)
     ↓
[Layer 3] useKAGScenarioManager hook
     → Zustand store 更新
     ↓
[Layer 4] 既存 Three.js レンダラー (修正あり)
     → 画面描画
```

---

## Layer 1: Rust KAG レキサー

### 責務

`.ks` ファイルテキストの**構文解析のみ** (セマンティクスは TypeScript 側が担う)。

### 実装場所

- `src-tauri/src/kag_parser.rs` (新規)
- `src-tauri/src/lib.rs` (コマンド登録追加)

### Tauri コマンド

```rust
// TypeScript 側が fetch() で .ks テキストを取得し、テキスト文字列を渡す
// ファイルパス直接アクセスではなく、コンテンツをやり取りする
#[tauri::command]
pub fn parse_kag_text(content: String) -> Result<Vec<KagToken>, String>
```

> **Note**: `parse_kag_file(path)` ではなく `parse_kag_text(content)` とする。
> Tauri の `public/` ディレクトリはブラウザ向けに HTTP サーブされるため、
> Rust 側からファイルシステムパスで直接アクセスするのは困難。
> TypeScript が `fetch("/scenarios/xxx.ks")` でテキスト取得し、そのまま渡す。

### データ構造

```rust
#[derive(serde::Serialize, Debug)]
#[serde(tag = "type")]
pub enum KagToken {
    Label {
        name: String,
        page_name: Option<String>,
    },
    Tag {
        name: String,
        attrs: std::collections::HashMap<String, String>,
    },
    Text {
        content: String,
    },
    Newline,
}
```

### パース規則 (KAGParser.cpp を参考)

| 入力 | 出力トークン |
|------|------------|
| `*labelname\|pagename` (行頭) | `Label { name, page_name }` |
| `[tagname attr=val attr2="val2"]` | `Tag { name, attrs }` |
| `@tagname attr=val` (行頭) | `Tag { name, attrs }` (行形式も同じ Tag に変換) |
| `;コメント` (行頭) | スキップ (出力なし) |
| 改行 | `Newline` |
| その他の文字 | `Text { content }` (隣接する文字は1トークンにまとめる) |

> **属性値のクオート**: `attr="value with spaces"` も `attr=value` も両方サポート。

---

## Layer 2: TypeScript KAGInterpreter

### 責務

`KagToken[]` を受け取り、**セマンティクスを解釈しながら逐次実行**する。
ステートマシンとして動作し、`advance()` 呼び出しごとに次の「一時停止点」まで処理を進める。

### 実装場所

`src/utils/kagInterpreter.ts` (新規)

### データ構造

```typescript
// Rust から受け取るトークン (serde_json 直列化に対応)
type KagToken =
  | { type: 'Label'; name: string; page_name?: string }
  | { type: 'Tag'; name: string; attrs: Record<string, string> }
  | { type: 'Text'; content: string }
  | { type: 'Newline' }

// レイヤー状態 (背景 + 前景レイヤーを統一管理)
type KAGLayer = {
  id: 'base' | number     // 'base' = 背景レイヤー、0-9 = 前景レイヤー
  file?: string           // storage パラメータ (ファイルパス)
  visible: boolean
  x: number               // left パラメータ (ピクセル)
  y: number               // top パラメータ (ピクセル)
  opacity: number         // 0-255
  scale: number
}

// 1フレーム (クリック待ち単位) の表示状態
type KAGDisplayFrame = {
  text: string                                   // 現在のメッセージテキスト
  speakerName?: string                           // 話者名
  layers: KAGLayer[]                             // 全レイヤー状態 (base + 0-9)
  bgmFile?: string                               // 再生中のBGM
  seFile?: string                                // 再生するSE
  voiceFile?: string                             // 再生する音声
  voiceSpeakerId?: number                        // VOICEVOX 話者ID (ファイルがない場合)
  choices?: { text: string; target: string }[]   // 選択肢 ([glink] で蓄積)
  transition?: {
    method: string                               // 'crossfade' | 'scroll' | 'dissolve' など
    time: number                                 // ms
    layer?: 'base' | number                      // 対象レイヤー (省略時は全体)
  }
  isWaitingTransition: boolean                   // [wt] 待ち状態
  isWaitingTimer: boolean                        // [wait time=N] 待ち状態
  waitTime?: number                              // [wait] の待機 ms
  isEnd: boolean                                 // [s] で終了
}
```

### インタープリター内部状態

```typescript
class KAGInterpreter {
  private tokens: KagToken[]
  private cursor: number                         // 現在処理位置
  private layers: Map<'base' | number, KAGLayer> // 現在のレイヤー状態
  private bgmFile: string | undefined
  private flags: Record<string, FlagValue>       // f.xxx フラグ
  private textBuffer: string                     // [l]/[p] 前のテキスト蓄積
  private speakerName: string | undefined
  private voiceFile: string | undefined
  private voiceSpeakerId: number | undefined
  private seFile: string | undefined
  private choiceBuffer: { text: string; target: string }[]  // [glink] 蓄積
  private callStack: number[]                    // [call]/[return] 用カーソルスタック
  private macros: Map<string, number>            // マクロ名 → 開始トークンインデックス
  private labelMap: Map<string, number>          // ラベル名 → トークンインデックス
  private skipDepth: number                      // [if] ブロックスキップ用ネスト深さ

  async advance(): Promise<KAGDisplayFrame>      // 非同期 (ファイル跨ぎジャンプ対応)
  jumpToLabel(label: string): void
  async jumpToFile(file: string, label: string): Promise<void>
  onTransitionComplete(): void
  onTimerComplete(): void
  selectChoice(target: string): void
  getFlags(): Record<string, FlagValue>
  setFlag(name: string, value: FlagValue): void
}
```

### 一時停止点 (pause points)

`advance()` はこれらのいずれかに達するまでトークンを消費する:

| タグ/条件 | 動作 |
|---------|------|
| `[l]` | クリック待ち (テキスト継続)。`isWaitingTransition: false` で返す |
| `[p]` | テキストバッファをクリアしてクリック待ち |
| `[s]` | `isEnd: true` で返す |
| `[wt]` | `isWaitingTransition: true` で返す。`onTransitionComplete()` 後に再開 |
| `[wait time=N]` | `isWaitingTimer: true`, `waitTime: N` で返す。N ms後に `onTimerComplete()` を hook が呼ぶ |
| `[glink]` + `[s]` | `[glink]` は choiceBuffer に追加し継続。`[s]` に到達したとき `choices[]` を返して停止 |
| ファイル末尾 | `isEnd: true` で返す |

### `[if]` ブロックのスキップモード

`[if exp="..."]` の条件が偽の場合、インタープリターはスキップモードに入る:

```
[if exp="f.flag == false"]   ← 偽 → skipDepth = 1 でスキップ開始
  テキスト[l]                 ← スキップ
  [if exp="f.flag2"]          ← skipDepth++ (ネスト追跡)
  [endif]                     ← skipDepth-- (まだ skipDepth > 0 なのでスキップ継続)
[else]                        ← skipDepth == 1 のとき: スキップ解除して実行再開
  別のテキスト[l]             ← 実行
[endif]                       ← ブロック終了
```

ルール:
- `[if]` を見つけるたびに `skipDepth++`
- `[endif]` で `skipDepth--`
- `skipDepth == 1` のとき `[else]` または `[elsif]` でスキップ解除
- `skipDepth == 0` になったらスキップモード終了

### タグ→エンジン処理マッピング (MVP)

#### 画像・レイヤー

| KAGタグ | 動作 |
|--------|------|
| `[image storage=xxx layer=base page=fore]` | `layers.get('base')` を更新 |
| `[image layer=N page=fore storage=xxx visible=true]` | `layers.get(N)` を更新 |
| `[image layer=N visible=false]` | `layers.get(N).visible = false` |
| `page=back` | 無視 (バックバッファ非対応 Phase 1) |

> `page=fore` は省略可能とし、省略時は `fore` として扱う。`page=back` は受け付けるが no-op。

#### 音声・BGM

| KAGタグ | 動作 |
|--------|------|
| `[bgm storage=xxx]` | `bgmFile` 更新 |
| `[stopbgm]` | `bgmFile = undefined` |
| `[se storage=xxx buf=N]` | `seFile` 更新 (buf は無視、Phase 1 は単チャンネル) |
| `[voice storage=xxx]` | `voiceFile` 更新, `voiceSpeakerId = undefined` |
| `[voice speaker=N]` | `voiceSpeakerId` 更新 (VOICEVOX 合成), `voiceFile = undefined` |

> VOICEVOX 対応: `[voice speaker=N]` タグで話者 ID を指定。`voiceSpeakerId` が設定されていれば Voice コンポーネントが VOICEVOX 合成を使う。

#### テキスト

| KAGタグ | 動作 |
|--------|------|
| `[name text="xxx"]` | `speakerName` を `xxx` に更新 (属性スタイル) |
| `[cm]` | `textBuffer` をクリア |
| Text トークン | `textBuffer` に追記 |
| `[r]` | `textBuffer` に `\n` を追加 |
| Newline トークン | **常にスキップ** (可視改行は `[r]` タグで明示する。`Newline` は KAG ソースの行区切りに過ぎない) |

#### フロー制御

| KAGタグ | 動作 |
|--------|------|
| `[trans method=xxx time=N layer=Y]` | `transition` フィールド設定 (layer 省略可) |
| `[wt]` | `isWaitingTransition = true`、一時停止 |
| `[wait time=N]` | `isWaitingTimer = true`, `waitTime = N`、一時停止 |
| `[jump target=*label]` | `jumpToLabel(label)` で同ファイル内ジャンプ |
| `[jump target=*label file=xxx.ks]` | `await jumpToFile(file, label)` でファイル跨ぎジャンプ |
| `[call target=*label]` | `callStack.push(cursor)` してジャンプ |
| `[return]` | `cursor = callStack.pop()` で呼び出し元に戻る |
| `[if exp="..."]` | 条件評価、偽ならスキップモード開始 |
| `[else]`, `[elsif]`, `[endif]` | スキップモード制御 |

#### Exia 独自拡張タグ

| KAGタグ | 動作 |
|--------|------|
| `[flag name=xxx value=yyy]` | `flags[xxx] = yyy` |
| `[glink target=*label text="xxx"]` | `choiceBuffer` に追加 (停止はしない) |

#### マクロ

インタープリター初期化時 (コンストラクタ) に全トークンを事前スキャンする。

**初期化スキャンのルール:**

1. `[macro name=xxx]` を検出したとき:
   - `macros["xxx"] = cursor + 1` (マクロ本体の先頭トークンインデックスを保存)
   - `[endmacro]` まで読み進め、`macroRanges` にブロック範囲 `[start, end]` を記録
2. `[endmacro]` は通常の `advance()` 実行中に遭遇した場合 `[return]` と同じ扱い (callStack からポップして呼び出し元に戻る)
3. `advance()` 実行中に `[macro name=xxx]` トークンに自然到達した場合 (マクロ定義ブロック):
   - マクロは初期化済みのため、定義ブロック自体の実行をスキップする (`macroRanges` の end インデックスまでカーソルを移動)

**マクロ呼び出し:**

- `[xxx]` タグを検出し、`macros["xxx"]` が存在すれば:
  - `callStack.push(currentCursor)` (戻り先を保存)
  - `cursor = macros["xxx"]` (マクロ本体の先頭へジャンプ)
  - `advance()` 処理を継続
- `[endmacro]` に到達したとき `cursor = callStack.pop()` で呼び出し元に復帰

### 条件式のサポート範囲 (MVP)

TJS の完全サポートは行わず、以下の構文のみサポート:

```
f.flagname == true
f.flagname != false
f.flagname > 3
f.flagname < 10
f.flag1 == 1 && f.flag2 == 2
f.flag1 == 1 || f.flag2 == 2
```

### ファイル跨ぎジャンプの非同期処理

`advance()` は `async` メソッドとする。ファイル跨ぎジャンプ (`[jump file=xxx.ks]`) では:

1. `fetch("/scenarios/xxx.ks")` でテキスト取得
2. `parse_kag_text(content)` Tauri コマンドで新トークン配列を取得
3. 現在の `tokens` を置き換え、ラベルマップを再構築
4. `cursor` を対象ラベル位置にセット
5. `advance()` 処理を継続

---

## Layer 3: useKAGScenarioManager Hook

### 実装場所

`src/components/modules/Message/hooks/useKAGScenarioManager.ts` (新規)

### 責務

- `KAGInterpreter` を保持し、`KAGDisplayFrame` を Zustand store (`kagScenarioStore`) に反映する
- 既存の `useScenarioManager` と同等の外部インターフェースを提供する
- ログ蓄積、タイマー管理、トランジション完了コールバックを担う

### インターフェース

```typescript
function useKAGScenarioManager() {
  return {
    // ユーザーが画面をクリック → [l]/[p] 後の次フレームへ
    goToNextLine: () => Promise<void>
    // 選択肢を選択 → 指定ラベルにジャンプ
    handleChoiceSelect: (target: string) => Promise<void>
    // スキップ機能 → 次の [glink] まで自動進行
    skipToNextChoice: () => Promise<void>
    // トランジション完了コールバック (Background3D/ForegroundLayer から呼ばれる)
    onTransitionComplete: () => void
    // シナリオ終端かどうか
    isScenarioEnd: boolean
    // 現在の話者名
    getCurrentSpeakerName: () => string | undefined
    // 現在のシナリオ状態 (コンポーネントがストアを読むためのスナップショット)
    scenario: KAGScenarioState
  }
}
```

### Zustand store 再設計 (kagScenarioStore)

既存の `scenarioStore.ts` の `ScenarioCharacter[]` ベースの設計を廃止し、
`KAGLayer[]` をベースにした新しいストアを定義する。

```typescript
// src/states/kagScenarioStore.ts (新規)
type KAGScenarioState = {
  // レイヤー管理 (背景 + 前景を統一)
  layers: KAGLayer[]                     // base + 0-9

  // テキスト表示
  currentText: string
  currentSpeakerName?: string

  // 音声
  currentBgmFile?: string
  currentSeFile?: string
  currentVoiceFile?: string
  currentVoiceSpeakerId?: number         // VOICEVOX 用

  // 選択肢
  currentChoices?: { text: string; target: string }[]

  // フロー状態
  isWaitingTransition: boolean
  currentTransition?: KAGDisplayFrame['transition']
  isEnd: boolean

  // フラグ
  flags: Record<string, FlagValue>

  // ログ (バックログ表示用)
  logs: KAGLogEntry[]
}

type KAGLogEntry = {
  text: string
  speakerName?: string
}
```

### ログ蓄積ルール

`advance()` が `[l]` または `[p]` で停止するたびに、
`{ text: frame.text, speakerName: frame.speakerName }` を `logs` に追加する。
テキストが空のフレーム (選択肢のみ等) はログに追加しない。

---

## Layer 4: レンダラー修正

### 実装参照ソース

krkrz のソースコードが `f:/repo/exia/krkrz/` にある。Three.js レンダラー実装時の参考に使うこと:

- `krkrz/visual/LayerIntf.cpp` — `Draw()` メソッドでレイヤー合成アルゴリズム
- `krkrz/visual/transhandler.h` — トランジションハンドラーインターフェース (ttExchange = crossfade)
- `krkrz/visual/drawable.h` — レイヤー種別 (ltAlpha, ltAdditive 等) のブレンドモード定義

### Background3D (src/components/modules/Background/Background3D.tsx)

- `layers` の `id === 'base'` エントリを読んで背景を描画
- `transition` が設定されているとき、`method` に応じたシェーダー/アニメーションを適用
- トランジション完了時に `onTransitionComplete()` を呼ぶ
- Phase 1 対応: `crossfade` (フェードクロス、Three.js `lerp` で opacity 補間、krkrz の `ttExchange` 相当)

### ForegroundLayer コンポーネント (新規 + Character3D 改名/改修)

`Character3D.tsx` を汎用化し、`ForegroundLayer.tsx` に置き換える。

- `layers` の `id: number` エントリをすべて管理 (0-9)
- 各レイヤーを Z 位置 `0.05 + layer_index * 0.01` に配置
- `visible: false` のレイヤーは非表示 (opacity 0 にフェードアウト)
- `x`, `y`, `opacity`, `scale` はすべて Three.js のフレームごとの lerp でスムーズに補間
- 既存の CharacterSprite のアクティブ/非アクティブ brightness 補間ロジックは廃止

### CutIn3D (src/components/modules/CutIn/CutIn3D.tsx)

- **廃止** → 前景レイヤー (layer=3+) で代替するため不要

### Voice コンポーネント (src/components/modules/Voice/index.tsx)

- `currentVoiceFile` が設定されていればファイル再生
- `currentVoiceSpeakerId` が設定されていれば VOICEVOX 合成 (既存ロジック流用)

---

## Exia KAG 方言 タグ一覧 (scripter 向けリファレンス)

```ks
; 背景
[image storage=bg_forest.webp layer=base]

; キャラクター表示 (前景レイヤー 0-2)
[image layer=0 storage=chara_normal.webp visible=true left=0 top=0]

; キャラクター非表示
[image layer=0 visible=false]

; フルスクリーンCG (前景レイヤー 3+)
[image layer=3 storage=cg_001.webp visible=true left=0 top=0 opacity=255]

; トランジション (背景全体)
[trans method=crossfade time=800]
[wt]

; トランジション (特定レイヤーのみ)
[trans method=crossfade time=500 layer=0]
[wt]

; 話者名 (属性スタイル)
[name text="キャラクター名"]

; テキスト + クリック待ち
セリフや地の文テキスト[l]

; ページ送り (テキストクリア + クリック待ち)
[p]

; テキストクリア
[cm]

; BGM
[bgm storage=bgm_calm.mp3]
[stopbgm]

; SE
[se storage=forest_ambience.wav buf=0]

; ボイス (ファイル指定)
[voice storage=voice_001.wav]

; ボイス (VOICEVOX 合成 - Exia 独自)
[voice speaker=3]

; 待機
[wait time=1000]

; フラグ設定 (Exia 独自)
[flag name=met_hero value=true]

; 条件分岐
[if exp="f.met_hero == true"]
[jump target=*route_a]
[else]
[jump target=*route_b]
[endif]

; 選択肢 ([glink] を複数並べて [s] で停止)
[glink target=*choice_a text="選択肢A"]
[glink target=*choice_b text="選択肢B"]
[s]

; ラベル
*scene_start
*choice_a

; ファイル跨ぎジャンプ
[jump target=*entry file=S_002.ks]

; サブルーティン
[call target=*intro_macro]
[s]

*intro_macro
BGMが始まった。[l]
[return]

; スクリプト終了
[s]
```

---

## 既存 JSON シナリオの移行

`public/scenarios/S_000.json` を `S_000.ks` に変換する。
移行スクリプトは不要 — scripter スキルで KAG 形式で新規生成し直す。

---

## scripter スキルの更新方針

`.agent/skills/scripter/SKILL.md` を以下の観点で更新する:

1. **出力形式を KAG に変更**: JSON `ScenarioLine[]` ではなく `.ks` テキストを `public/scenarios/` に出力
2. **scenario_draft.md のメタタグ → KAG タグ変換規則**:
   - `[CG:filename]` → `[image layer=3 storage=filename visible=true]`
   - `[VOICE:filename]` → `[voice storage=filename]`
   - `[BGM:filename]` → `[bgm storage=filename]`
   - `[SE:filename]` → `[se storage=filename]`
   - `[FACE:emotion]` → キャラクター差分ファイル名に変換して `[image layer=N storage=xxx_emotion.webp]`
3. **キャラクター管理**: シーン冒頭でキャラクター→レイヤー番号の割り当てを定義し、コメントに記録する
   ```ks
   ; Layer assignment: 0=ヒロイン, 1=主人公, 2=サブキャラ
   ```
4. **ラベル命名規則**: `*scene_start`, `*choice_a`, `*ending` 等
5. **品質チェック維持**: 既存の 33 点チェックリストをベースに、KAG 構文検証を追加
   - 全 `[if]` に対応する `[endif]` が存在するか
   - 全 `[call]` に対応する `[return]` が存在するか
   - 参照先 `*label` が同ファイル内に存在するか

---

## フェーズ分け

### Phase 1: コア実装 (MVP)
- Rust KAG レキサー (`parse_kag_text`)
- TypeScript KAGInterpreter (基本タグ対応 + `[if]` スキップモード + `[call]`/`[return]`)
- `useKAGScenarioManager` hook + `kagScenarioStore`
- `Background3D` トランジション対応 (crossfade のみ)
- `Character3D` → `ForegroundLayer` 汎用化
- `CutIn3D` 廃止
- S_000.ks 変換
- scripter SKILL.md 更新

### Phase 2: 演出拡張
- 追加トランジション (scroll, dissolve)
- キャラクター移動アニメーション (`[move]`)
- 画面揺れ (`[quake]`)
- テキスト装飾 (`[font]`, `[ruby]`)
- SE マルチチャンネル (`buf` パラメータ)

---

## 検証方法

1. `.ks` ファイルを `public/scenarios/` に配置し、ブラウザで起動する
2. `parse_kag_text` Tauri コマンドに KAG テキストを渡し、正しいトークン列が返ることを確認
3. `KAGInterpreter.advance()` のユニットテスト:
   - 基本テキスト+`[l]` で正しく停止するか
   - `[if]` の真偽両ケースで正しく分岐するか
   - `[if]` のネストが正しくハンドリングされるか
4. Three.js 上でキャラクター・背景・crossfade トランジションが正しく描画されることを目視確認
5. S_000.ks で既存シナリオ (S_000.json 相当) と同等の表示が再現できることを確認
