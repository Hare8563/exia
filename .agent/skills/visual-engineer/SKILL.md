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

### イベントCG命名パターン（grand002準拠）

イベントCGはキャラ略称 + シーン番号 + アルファベット差分の体系を使う。

```
[キャラ略称]_[NN]        ← ベースCG（最初の1枚。キャラ名+2桁連番）
[キャラ略称]_[NN]a       ← 差分1（脱衣・表情変化など）
[キャラ略称]_[NN]b       ← 差分2
[キャラ略称]_[NN]c       ← 差分3
...（アルファベット順に続く）
```

**例（kazari の第1CGセット）：**
```
kazari_01        ← ベース（衣服あり・羞恥）
kazari_01a       ← 差分（胸露出）
kazari_01b       ← 差分（快感表情）
kazari_01c       ← 差分（恍惚）
kazari_01d       ← 差分（動画プレースホルダ用途：INVISIBLE_CGで参照）
kazari_01e       ← 差分（絶頂・液体）
```

**キャラ略称の規則：**

| キャラクター | 略称 |
|------------|------|
| 風璃 | `kazari` |
| 月乃 | `tsukino` |
| 唄葉 | `utaha` |
| その他（複数キャラ登場） | `other` |

**背景ファイルは別系統：**
```
bg_[NN].webp     ← 通常背景（bg_001〜）
```

### 差分の設計指針

差分は以下の状態変化を基準に切る。スクリプターが `FAID_CH_CG` で都度切り替えるため、**差分間の連続性（前差分との視覚的つながり）**が重要：

| 差分タイミング | 例 |
|--------------|-----|
| 脱衣の段階ごと（ブラ着用→外す→全裸） | `_01` → `_01a` → `_01b` |
| 感情の段階（羞恥→快感→恍惚） | 同一構図で表情のみ変化 |
| 行為の進行（挿入前→挿入→絶頂） | 構図は変えてよい |
| 射精・液体（体液追加） | 絶頂差分の直後 |

### アニメーション対応差分（INVISIBLE_CG 用）

動画アニメーション（`PLAY_MOVIE_LOOP`）が再生されている間は、静止画CGは**画面に表示しない**。その代わりにスクリプターが `INVISIBLE_CG` を呼び出して「CGを見た」フラグだけを立てる。

このため、動画との切り替えポイントとなる差分は必ず用意する：

```
[キャラ略称]_[NN]d  ← 動画ループ中に対応する静止画差分（INVISIBLE_CGで参照）
[キャラ略称]_[NN]e  ← 動画終了後の静止画（FAID_CH_CGで表示再開）
```

マニフェストには `is_invisible: true` を付けて区別する。

---

## Phase 5: マニフェスト出力

全CG生成後、`workspace/cg_manifest.json` を以下の形式で出力する。

```json
{
  "generated_at": "YYYY-MM-DD",
  "cgs": [
    {
      "cg_id": "CG_001",
      "scene_log_label": "scene_log_kazari01",
      "seen_flag": "sf.seen_kazari_no01",
      "description": "風璃・第1CGセット",
      "files": [
        {
          "imageFile": "kazari_01.webp",
          "isFullScreen": true,
          "variant": "base",
          "scene_note": "ベース（衣服あり・羞恥）"
        },
        {
          "imageFile": "kazari_01a.webp",
          "isFullScreen": true,
          "variant": "diff_a",
          "scene_note": "差分（胸露出）"
        },
        {
          "imageFile": "kazari_01d.webp",
          "isFullScreen": true,
          "variant": "diff_d",
          "is_invisible": true,
          "scene_note": "動画ループ中の静止画フラグ用（INVISIBLE_CG）"
        },
        {
          "imageFile": "kazari_01e.webp",
          "isFullScreen": true,
          "variant": "diff_e",
          "scene_note": "動画終了後の絶頂差分"
        }
      ]
    }
  ],
  "backgrounds": [
    {
      "backgroundFile": "bg_055.webp",
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
