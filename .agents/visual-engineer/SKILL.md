---
name: visual-engineer
description: シナリオドラフトの「字コンテ」を読み取り、ComfyUI(127.0.0.1:8188)でイベントCGおよび差分を生成する。実際のファイル名を確定させてcg_manifest.jsonを出力する。
---

# Visual Direction Engineer Skill

このスキルは、シナリオライターが作成した字コンテを演出設計図として受け取り、ComfyUI APIを使って実際の画像を生成します。ファイル名命名規則を管理し、スクリプターが参照できる `cg_manifest.json` を出力します。

## 役割の定義

- **演出設計**: 字コンテの意図を具体的なComfyUIプロンプトに変換する
- **画像生成**: ComfyUI APIを通じてイベントCG・差分を生成する
- **ファイル管理**: 命名規則に従ってファイル名を確定し、マニフェストに記録する

---

## Phase 1: 字コンテの読み込みと演出設計

`workspace/scenario_draft.md` の「字コンテ」セクションを読み込み、各CG仕様について以下の「内部仕様書」を確定させる。

### 仕様書の必須項目

| 項目 | 内容 |
|------|------|
| キャラクター | 特徴・服装・状態（脱衣段階含む） |
| シーンテーマ | そのCGが伝えるべき一言の感情（例：「屈辱」「とろけるような快感」） |
| 場所と光源 | 光源の位置（逆光/窓/スポットライト）を具体的に指定 |
| 構図 | POV基本。キスシーンはドアップ。結合部は真上から |
| 差分リスト | 表情段階・脱衣段階・液体（愛液/精液/汗）の必要数 |
| 出力タイプ | `fullscreen`（16:9, 1344×768）/ `cutIn`（1:1, 1024×1024）|

---

## Phase 2: プロンプト構築

### 画風の基本タグ（全CGに必須）

```
game cg, digital painting, highly detailed eyes, transparent skin,
glossy clothing, anime style, clean lines, soft shading
```

### 構図別タグ

| 構図 | 追加タグ |
|------|---------|
| POV（主観） | `pov, point of view, viewer pov, no protagonist` |
| 顔の接写 | `extreme close-up, focus on face, macro shot` |
| 結合部接写 | `extreme close-up, focus on crotch, macro shot` |
| 半身 | `upper body, portrait` |
| 全身 | `full body, cowgirl shot` |

### 感情段階別タグ

| 段階 | タグ |
|------|------|
| `_shame`（羞恥） | `embarrassed, blushing, teary eyes, looking away` |
| `_pleasure`（快感） | `pleasure face, half-lidded eyes, open mouth` |
| `_ecstasy`（恍惚） | `ahegao, rolling eyes, drooling, flushed face` |
| `_collapsed`（崩壊） | `mind break, vacant stare, completely flushed` |

### 湿潤性タグ（性的シーンまたはその前後）

```
sweat, saliva, wet, glistening, viscous fluids, glossy skin
```

### ネガティブプロンプト（基本）

```
lowres, bad anatomy, bad hands, text, error, missing fingers,
extra digit, fewer digits, cropped, worst quality, low quality,
normal quality, jpeg artifacts, signature, watermark, username, blurry
```

---

## Phase 3: ComfyUI API連携

### エンドポイント

```
POST http://127.0.0.1:8188/prompt
```

### ワークフロー選択基準

| 用途 | ワークフロー |
|------|------------|
| 通常CG生成 | `resources/AnimaWorkflow.json` |
| LoRA適用（キャラ固定） | `resources/AnimaWorkflow_with_lora.json` |
| 差分生成（表情・液体のみ変更） | `resources/SAM3AnimaMaskWorkflow.json` |
| 差分生成+LoRA | `resources/SAM3MaskWorkflow_lora.json` |

### 出力サイズ

- **フルスクリーンCG** (`isFullScreen: true`): 1344×768
- **カットイン** (`isFullScreen: false`): 1024×1024

### 差分生成の原則

差分が必要な場合：
1. ベースCG（表情なし/中間状態）を先に生成して固定する
2. SAM3ワークフローでマスキングし、表情レイヤーのみ変更する
3. ControlNetでポーズを固定し、液体・衣装レイヤーを差し替える

---

## Phase 4: ファイル命名規則

生成した画像に以下の規則でファイル名を付与する。

### 命名パターン

```
cg_[キャラ略称]_[シーン略称]_[差分識別子].webp
```

### 差分識別子の規則

| 識別子 | 意味 |
|--------|------|
| `_face` | 顔（通常） |
| `_face_red` | 赤面 |
| `_mouth` | 口元接写 |
| `_oppai` | 胸部接写 |
| `_genital` | 結合部接写 |
| `_zoom` | 超接写（毛穴レベル） |
| `_shame` | 羞恥表情 |
| `_pleasure` | 快感表情 |
| `_ecstasy` | 恍惚表情 |
| `_collapsed` | 崩壊表情 |
| `_spasm` | 痙攣 |
| `_whiteout` | 白フェード（絶頂） |

### 例

```
cg_laura_ch01_face_shame.webp
cg_laura_ch01_face_ecstasy.webp
cg_laura_ch01_genital_zoom.webp
cg_laura_ch01_whiteout.webp
```

---

## Phase 5: マニフェスト出力

全CG生成後、`workspace/cg_manifest.json` を以下の形式で出力する。

```json
{
  "generated_at": "YYYY-MM-DD",
  "cgs": [
    {
      "cg_id": "CG_001",
      "description": "字コンテの識別名",
      "files": [
        {
          "imageFile": "cg_laura_ch01_face_shame.webp",
          "isFullScreen": false,
          "variant": "shame",
          "scene_note": "第2幕・接触開始時の羞恥表情"
        },
        {
          "imageFile": "cg_laura_ch01_face_ecstasy.webp",
          "isFullScreen": false,
          "variant": "ecstasy",
          "scene_note": "第3幕・恍惚状態"
        }
      ]
    }
  ],
  "backgrounds": [
    {
      "backgroundFile": "bg_room_evening.webp",
      "scene_note": "シーン全体の背景"
    }
  ]
}
```

---

## 演出哲学

1. **枚数よりインパクト**: 1枚のクオリティと、そこから生まれる差分の多様性が命
2. **主観視点**: プレイヤーがその場にいる没入感を最優先。カメラは産毛が見える距離まで寄る
3. **光源が雰囲気を決める**: ライティング指定を怠らない
4. **静止画の禁止**: シーンが動いている間、画像を固定してはならない。最低でも「表情差分」か「アングル」を交互に切り替える
5. **演出の同期**: テキストで「熱い吐息」を描写したなら、次のcutInは必ず `_mouth` や `_face_red` を指定する
