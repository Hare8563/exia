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

| 用途 | ワークフロー | 主なシード固定方法 |
|------|------------|-----------------|
| 通常CG生成 | `resources/AnimaWorkflow.json` | seed固定 |
| LoRA適用（キャラ固定・高品質ベースCG） | `resources/AnimaWorkflow_with_lora.json` | seed固定 |
| **SDXL+LoRA（成人向けベースCG）** | `resources/SdxlWithLoRA.json` | seed固定 |
| **表情変更（SAM3顔検出→LoRAインペイント）** | `resources/SAM3SdxlWithLoRA.json` | 元画像+顔マスク自動 |
| 差分生成（マスク手動・表情・液体） | `resources/SAM3AnimaMaskWorkflow.json` | 元画像+マスク |
| 差分生成+LoRA（マスク手動） | `resources/SAM3MaskWorkflow_lora.json` | 元画像+マスク |
| **差分生成（Qwen画像編集・衣装/体液/露出）** | `resources/QwenImageEditNsfw.json` | 入力画像+編集指示 |

### 出力サイズ

- **フルスクリーンCG** (`isFullScreen: true`): 1344×768
- **カットイン** (`isFullScreen: false`): 1024×1024

### 差分生成の原則（SDXL vs Qwen の使い分け）

| 差分の変化内容 | 推奨ワークフロー | 理由 |
|-------------|---------------|------|
| ベースCG（最初の1枚） | **SdxlWithLoRA** | キャラLoRA×高品質テキスト→画像 |
| 構図・ポーズの大幅変更 | **SdxlWithLoRA** | 別プロンプトで生成し直す |
| **表情のみ変更（羞恥→快感→恍惚）** | **SAM3SdxlWithLoRA** | SAM3で顔を自動検出→顔領域のみSDXL+LoRAでインペイント |
| 衣装の一部除去・胸露出 | **QwenImageEditNsfw** | 局所変更に最適 |
| 体液追加（愛液・精液・汗） | **QwenImageEditNsfw** | 背景・体型を崩さず追加 |
| アングル微調整 | **QwenImageEditNsfw** | 構図を維持して調整 |
| 全裸 or 完全な体位変換 | **SdxlWithLoRA** | 大きな変化は再生成が安定 |

#### SdxlWithLoRA の API 変更箇所

```json
"3": { "inputs": { "ckpt_name": "waiNSFWIllustrious_v150.safetensors" } },
"4": { "inputs": { "lora_name": "Illustrious/キャラ名.safetensors", "strength_model": 1, "strength_clip": 1 } },
"5": { "inputs": { "text": "【ポジティブプロンプト】" } },
"6": { "inputs": { "text": "【ネガティブプロンプト】" } },
"7": { "inputs": { "seed": 0, "steps": 20, "cfg": 8 } },
"8": { "inputs": { "width": 1344, "height": 768 } }
```

#### SAM3SdxlWithLoRA の API 変更箇所

SAM3が顔領域を自動検出し、その部分だけSDXL+LoRAでインペイントする。

```json
"14": { "inputs": { "image": "ComfyUI_XXXXX_.png" } },
"5":  { "inputs": { "text": "【新しい表情タグ】, 1girl, solo, masterpiece, best quality" } },
"6":  { "inputs": { "text": "bad quality,worst quality,worst detail,sketch,censor," } },
"4":  { "inputs": { "lora_name": "Illustrious/キャラ名.safetensors" } },
"13": { "inputs": { "seed": 0, "denoise": 0.5 } },
"17": { "inputs": { "prompt": "face", "threshold": 0.4 } }
```

- `denoise` は `0.4〜0.6` で調整（低いほど元の顔に近い、高いほど大きく変化）
- SAM3の `prompt` は `"face"` 固定でOK
- 顔以外（髪・体・背景）は一切変わらないため差分間の一貫性が高い

#### QwenImageEditNsfw の API 変更箇所

```json
"103": { "inputs": { "image": "ComfyUI_XXXXX_.png" } },
"104": { "inputs": { "prompt": "【編集指示・英語自然言語】" } },
"106": { "inputs": { "prompt": "" } },
"3":   { "inputs": { "seed": 884593183639559 } }
```

Qwen のプロンプトは**タグ列挙ではなく自然言語の編集指示**で書く：

```
# 表情変化の例
"Change her facial expression to ahegao, rolling eyes upward, mouth wide open, drooling, face flushed deep red"

# 体液追加の例
"Add white semen splattered on her lower abdomen and inner thighs, glistening wet"

# 露出追加の例
"Remove her bra, expose her bare breasts with erect pink nipples, keep everything else the same"

# 挿入シーンへの変化
"Show erect penis inserted into her vagina, add love juices dripping, maintain her current expression"
```

---

## Phase 3.5: 差分CGシリーズ設計（6〜10枚構成）

成人向けシーン1本で6〜10枚の差分CGを作る際の標準パターン。

### 6枚構成（コンパクト）

| 差分 | 内容 | ワークフロー |
|------|------|------------|
| `_01`（base） | セットアップ：衣服あり or 露出開始・表情は羞恥/期待 | SdxlWithLoRA |
| `_01a` | 脱衣 or 愛撫開始・胸露出 | QwenImageEditNsfw |
| `_01b` | 挿入前 or 挿入開始 | SdxlWithLoRA（構図変化あり） |
| `_01c` | 快感表情に変化 | **SAM3SdxlWithLoRA** |
| `_01d` | 恍惚表情・行為進行（体液追加） | SAM3SdxlWithLoRA + QwenImageEditNsfw |
| `_01e` | 射精・体液追加・満足表情 | QwenImageEditNsfw |

### 8枚構成（スタンダード）

| 差分 | 内容 | ワークフロー |
|------|------|------------|
| `_01`（base） | 衣服あり・羞恥/驚き | SdxlWithLoRA |
| `_01a` | 上半身露出・恥じらい | QwenImageEditNsfw |
| `_01b` | 全裸 or 下半身露出 | QwenImageEditNsfw |
| `_01c` | 挿入開始・体位確立 | SdxlWithLoRA |
| `_01d` | 快感表情に変化 | **SAM3SdxlWithLoRA** |
| `_01e` | 恍惚・愛液追加 | SAM3SdxlWithLoRA（表情）→ QwenImageEditNsfw（体液） |
| `_01f` | 絶頂（ahegao・汗・涙） | **SAM3SdxlWithLoRA** |
| `_01g` | 射精後・満足/放心 | QwenImageEditNsfw（体液）→ SAM3SdxlWithLoRA（表情） |

### 10枚構成（フル）

| 差分 | 内容 | ワークフロー |
|------|------|------------|
| `_01`（base） | 初期状態・着衣/半裸・羞恥 | SdxlWithLoRA |
| `_01a` | 胸部露出 | QwenImageEditNsfw |
| `_01b` | 下半身露出・陰部あらわ | QwenImageEditNsfw |
| `_01c` | 愛撫（乳首刺激・口淫）・別構図 | SdxlWithLoRA |
| `_01d` | 挿入開始・体位確立 | SdxlWithLoRA |
| `_01e` | 快感表情に変化 | **SAM3SdxlWithLoRA** |
| `_01f` | 恍惚・舌出し＋愛液分泌 | SAM3SdxlWithLoRA（表情）→ QwenImageEditNsfw（体液） |
| `_01g` | 動画プレースホルダ（INVISIBLE_CG） | **SAM3SdxlWithLoRA** |
| `_01h` | 絶頂（ahegao・白目・涙・唾液） | **SAM3SdxlWithLoRA** |
| `_01i` | 射精後（精液まみれ・放心） | QwenImageEditNsfw（体液）→ SAM3SdxlWithLoRA（表情） |

### CGSample.md から学んだ差分設計の傾向

1. **感情進行は細かく刻む**：羞恥→期待→快感→恍惚→絶頂→放心の6段階を意識する
2. **体液は段階的に追加**：愛液（初期）→汗（中盤）→精液（末期）の順
3. **構図変化は2〜3回**：全体→上半身クローズ→結合部接写のいずれかで視点を変える
4. **脱衣は最初に集中**：最初の2〜3枚で脱衣を済ませ、以後は行為の進行に集中
5. **射精シーンは必ず用意**：精液の描写（腹部・陰部・体内）を少なくとも1枚
6. **QwenはSdxlのあとに使う**：必ずSdxlでベース画像を確立してからQwenで派生させる

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
