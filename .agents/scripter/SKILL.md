---
name: scripter
description: シナリオドラフト・CGマニフェスト・オーディオマニフェストを統合し、Exiaエンジン向けの最終シナリオJSON（S_XXX.json）を組み立てる。
---

# Scripter Skill

このスキルは、シナリオライター・演出エンジニア・ボイスデザイナーの成果物を受け取り、Exiaゲームエンジンが直接読み込める最終シナリオJSONを組み立てます。

## 役割の定義

- **テキスト変換**: シナリオドラフトの散文をScenarioLineに変換する
- **アセット統合**: CGマニフェスト・オーディオマニフェストのファイル参照を各LineにマッピングF
- **フロー制御**: ラベル・フラグ・選択肢・ジャンプの実装
- **品質検証**: 生成JSONのスキーマ適合確認とレビュー

---

## Phase 1: 入力ファイルの確認

以下の3ファイルが存在することを確認する。不足があればプロデューサーに通知する。

| ファイル | 作成者 | 内容 |
|---------|-------|------|
| `workspace/scenario_draft.md` | シナリオライター | 本文・字コンテ・台本・各種リスト |
| `workspace/cg_manifest.json` | 演出エンジニア | CGファイル名とシーンのマッピング |
| `workspace/audio_manifest.json` | ボイスデザイナー | 音声ファイル名とセリフのマッピング |

---

## Phase 2: シナリオドラフトの解析

`workspace/scenario_draft.md` の「本文」セクションを解析し、各テキストブロックを以下に分類する。

### テキストタイプの判定

| 内容 | ScenarioLine type |
|------|------------------|
| ナレーション（地の文・独白） | `type: 0`（NarrationLine） |
| キャラクターの台詞（「」で囲まれたもの） | `type: 1`（DialogueLine） |
| 選択肢（分岐）| `type: 2`（ChoiceLine） |
| フラグ操作 | `type: "flag"`（FlagLine） |
| ジャンプ | `type: "jump"`（JumpLine） |

### 演出参照タグの解釈

本文中に埋め込まれた参照タグを読み取り、対応するアセットを割り当てる。

| 参照タグ形式 | 解釈 | 割り当て先 |
|------------|------|----------|
| `〈CG:CG_001〉` | CGマニフェストの `cg_id: "CG_001"` を参照 | `cutIn.imageFile` |
| `〈BG:opening〉` | CGマニフェストの `backgrounds` を参照 | `backgroundFile` |
| `〈VOICE:V001〉` | オーディオマニフェストの `voice_id: "V001"` を参照 | `voice` |
| `〈BGM:第1幕〉` | オーディオマニフェストの `bgm` を参照 | `bgmFile` |

---

## Phase 3: JSON組み立て

### 基本構造

```json
{
  "id": "[シーンID（例：S_001）]",
  "currentLineIndex": 0,
  "bgmFile": "[初期BGMファイル名]",
  "backgroundFile": "[初期背景ファイル名]",
  "characters": [...],
  "lines": [...],
  "logs": []
}
```

### characters配列の構築

シナリオドラフトの「登場人物」セクションからキャラクター情報を取得し、0始まりのindexで配列化する。

```json
{
  "index": 0,
  "name": "キャラ名",
  "imageFile": "ch_キャラ略称_default.webp",
  "isShow": true,
  "speakerId": 0
}
```

### lines配列の組み立てルール

#### NarrationLine（type: 0）

```json
{
  "id": "line_001",
  "type": 0,
  "text": "散文テキスト",
  "cutIn": {
    "imageFile": "cg_xxx.webp",
    "isFullScreen": false
  },
  "bgmFile": "b0001.mp3"
}
```

- `id` は節目となるラインにのみ付与する（全行に付与しない）
- `cutIn` は `〈CG:XXX〉` タグが付いている場合のみ追加する
- `bgmFile` はBGMが切り替わる行にのみ指定する

#### DialogueLine（type: 1）

```json
{
  "type": 1,
  "text": "「セリフ内容」",
  "character": {
    "index": 0,
    "name": "キャラ名",
    "imageFile": "ch_xxx_emotion.webp",
    "isShow": true
  },
  "voice": "l0001.wav",
  "cutIn": {
    "imageFile": "cg_xxx_face.webp",
    "isFullScreen": false
  }
}
```

- `character.imageFile` は対応するフェーズの立ち絵差分を使用する
- `voice` は `〈VOICE:XXX〉` タグからオーディオマニフェストを参照して取得する

#### ChoiceLine（type: 2）

```json
{
  "id": "choice_01",
  "type": 2,
  "text": "どうする？",
  "choices": [
    { "text": "選択肢A", "jumpTo": "label_a" },
    { "text": "選択肢B", "jumpTo": "label_b" }
  ]
}
```

#### FlagLine（type: "flag"）

```json
{
  "type": "flag",
  "set": {
    "flag_scene_cleared": true
  }
}
```

#### JumpLine（type: "jump"）

```json
{
  "type": "jump",
  "to": "label_xxx"
}
```

---

## Phase 4: ウェイトとタイミング調整

以下のシーンには意図的に「静止ウィンドウ」（テキスト変化なしのライン）を挿入する。

- 絶頂の直前：3〜5本の短い断片テキスト（`……`のみなど）
- BGM切り替え直後：1〜2本の余白
- 選択肢の直前：1本の問いかけナレーション

---

## Phase 5: 品質検証

### チェックリスト

- [ ] `lines` 配列の総数が100〜120本の範囲に収まっているか
- [ ] 全ての `cutIn.imageFile` がcg_manifestに存在するファイル名を参照しているか
- [ ] 全ての `voice` がaudio_manifestに存在するファイル名を参照しているか
- [ ] `type: 2`（ChoiceLine）の `jumpTo` に対応する `id` が存在するか
- [ ] `type: "flag"` で設定したフラグ名がフラグリストに記載されているか
- [ ] `characters` のindexが `character.index` と一致しているか

### レビューの実施

`workspace/scenario_draft.md` の上位にある `scenario-writer/resources/review.md` を読み込み、生成したJSONが鏡裕之流の理論（禁止と侵犯・誘惑ロジック・テンションコントロール）に沿っているかをレビューする。問題があれば箇所を特定してシナリオライターに差し戻す。

---

## Phase 6: 出力

検証が通ったら最終JSONを `public/scenarios/[シーンID].json` に出力する。

プロデューサーに完了を報告する。報告内容：
- 出力ファイルパス
- 総ライン数
- 使用CGファイル数・音声ファイル数
- 未解決の参照（アセット未生成のファイル名）があれば列挙する

---

## JSON Schema Reference

スクリプターが参照するJSONスキーマは `.agents/scenario-writer/` に格納されている。スキーマの詳細が必要な場合は元のSKILL.mdを参照すること。
