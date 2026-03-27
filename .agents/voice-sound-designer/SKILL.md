---
name: voice-sound-designer
description: シナリオドラフトの「台本」を読み取り、Irodori-TTSでキャラクターボイスを生成し、ACE-Step-1.5でBGMを生成する。audio_manifest.jsonを出力する。
---

# Voice & Sound Designer Skill

このスキルは、シナリオライターが作成した台本を受け取り、キャラクターボイスの生成とBGMの生成を行います。音響演出全体を担当し、スクリプターが参照できる `audio_manifest.json` を出力します。

## 役割の定義

- **ボイスキャスティング**: キャラクターとリファレンス音声のマッピング
- **音声生成**: Irodori-TTSを通じたキャラクターボイスの合成
- **BGM生成**: ACE-Step-1.5を通じたシーン専用BGMの生成
- **ファイル管理**: 命名規則に従ってファイル名を確定し、マニフェストに記録する

---

## Phase 1: 台本の読み込みとキャスティング

`workspace/scenario_draft.md` の「台本」セクションを読み込み、キャラクター別のRefWavマッピングを確定させる。

### RefWavマッピング表

台本のキャラクター別RefWav指針を参考に、以下を確定する。

| キャラ名 | フェーズ | RefWavの雰囲気 | 適用タイミング |
|---------|---------|--------------|-------------|
| [キャラ名] | 序盤（理性あり） | 冷静・落ち着いた声質 | 第1幕〜第2幕前半 |
| [キャラ名] | 中盤（崩れ始め） | 感情が滲む・息遣いが増す | 第2幕後半〜第3幕前半 |
| [キャラ名] | 絶頂・崩壊 | 激昂・声が割れる | 第3幕後半 |

**マッピングの原則**: フェーズによってRefWavを切り替えることで、感情の変化を音声に反映させる。

---

## Phase 2: テキストの最適化

Irodori-TTSの性能を引き出すため、台本テキストを調整する。

### 鏡流記号の活用

鏡裕之流の特殊記号はそのまま活かす。TTSはこれらを「間」として解釈する。

| 記号 | 音声への反映 |
|------|------------|
| `……` | 長い沈黙・溜め |
| `っ` | 音の詰まり・感嘆 |
| `、` | 短い息継ぎ・喘ぎ |
| `！` | 強い感情の発露 |
| `！！` | 絶叫・絶頂 |

### テキスト分割ルール

- 1つのセリフが長い場合（20文字以上）、自然な息継ぎ位置で分割する
- `……` の前後は別の音声ファイルとして生成し、ゲーム側でウェイトを制御できるようにする
- 喘ぎ声（`あ……、あ、ぁ…………っ`）は短い単位で分割し、複数ファイルに分ける

---

## Phase 3: 音声生成

### Irodori-TTSコマンドテンプレート

```bash
cd F:\\repo\\Irodori-TTS; uv run python infer.py \
  --hf-checkpoint Aratako/Irodori-TTS-500M-v2 \
  --text "{text}" \
  --ref-wav {path_to_ref_wav} \
  --output-wav {output_path}
```

### 生成手順

1. `台本セリフリスト` を上から順に処理する
2. 各セリフのフェーズに対応するRefWavを選択する
3. テキスト最適化を適用してからTTSに投入する
4. 出力されたwavファイルを命名規則に従ってリネームする
5. マニフェストに記録する

---

## Phase 4: BGM生成（ACE-Step-1.5）

`workspace/scenario_draft.md` の「BGM/SEリスト」セクションを読み込み、各幕のBGMをACE-Step-1.5で生成する。

### 4-1. captionの設計方針

シナリオの感情アークに合わせて、幕ごとに異なるcaptionを設計する。

| 幕・雰囲気 | captionの方向性 | BPM目安 | duration目安 |
|-----------|--------------|--------|------------|
| 第1幕：静寂・緊張感 | `ambient, minimalist piano, single notes, tense silence, dark atmosphere` | 60〜75 | 90〜120s |
| 第2幕：官能的・低音強調 | `sensual, slow rhythm, deep strings, synth pad, intimate atmosphere, erotic tension` | 70〜85 | 120〜180s |
| 第3幕：昂揚・絶頂 | `intense, building tension, orchestral swell, climactic, pulse-driven beat` | 110〜130 | 90〜120s |
| 第4幕：余韻・脱力 | `quiet, sparse piano, fade, melancholic, post-climax stillness` | 50〜65 | 60〜90s |

### 4-2. TOMLコンフィグの作成

各BGMごとに一時的なTOMLファイルを作成してからACE-Stepに投げる。

```toml
# bgm_act1.toml の例
task_type = "text2music"
caption = "ambient, minimalist piano, single notes, tense silence, dark atmosphere, sparse arrangement"
lyrics = "[Instrumental]"
instrumental = true
duration = 120
bpm = 70
keyscale = "C minor"
timesignature = "4"
save_dir = "F:/repo/exia/public/sounds"
audio_format = "mp3"
```

### 4-3. ACE-Step実行コマンド

```bash
cd F:\repo\ACE-Step-1.5 && uv run python cli.py -c {path_to_toml}
```

### 4-4. BGMファイル命名規則

ACE-Stepが出力したファイルを以下の規則でリネームする。

```
b[シーン番号][幕識別子].mp3
```

例：
```
b001a.mp3   → シーン001の第1幕BGM（緊張感）
b001b.mp3   → シーン001の第2幕BGM（官能的）
b001c.mp3   → シーン001の第3幕BGM（絶頂）
b001d.mp3   → シーン001の第4幕BGM（余韻）
```

### 4-5. BGMトランジションの原則

- BGMの切り替えは幕の変わり目に合わせる
- 絶頂シーンではBGMをフェードアウトし、声と息遣いだけが空間を満たすことも検討する
- 余韻シーンは前の幕のBGMを弱音で継続させると効果的

---

## Phase 5: ファイル命名規則

### ボイスファイル命名パターン

```
[キャラ略称][シーン番号]_[連番4桁].wav
```

### 例

```
n0001.wav   → 渚（nagisa）のシーン001、01番目のセリフ
r0001.wav   → 凛（rin）のシーン001、01番目のセリフ
l0001.wav   → ライラのシーン001、01番目のセリフ
```

---

## Phase 6: マニフェスト出力

全音声生成後、`workspace/audio_manifest.json` を以下の形式で出力する。

```json
{
  "generated_at": "YYYY-MM-DD",
  "voices": [
    {
      "voice_id": "V001",
      "character": "キャラ名",
      "phase": "序盤",
      "original_text": "……っ、何を",
      "voice_file": "l0001.wav",
      "acting_note": "驚きと警戒。まだ理性がある。"
    },
    {
      "voice_id": "V002",
      "character": "キャラ名",
      "phase": "中盤",
      "original_text": "あ……、あ、ぁ…………っ",
      "voice_file": "l0002.wav",
      "acting_note": "理性が崩れ始め。喘ぎと混乱が混在。"
    }
  ],
  "bgm": [
    {
      "bgm_file": "b0001.mp3",
      "start_scene": "第1幕冒頭",
      "mood": "静寂・緊張感",
      "scene_note": "シーン開始時に再生。ループ設定推奨。"
    },
    {
      "bgm_file": "b0002.mp3",
      "start_scene": "第3幕・絶頂直前",
      "mood": "アップテンポ・昂揚感",
      "scene_note": "緊張が頂点に達する直前からフェードイン。"
    }
  ]
}
```

---

## 音響演出哲学

1. **声が感情のバロメーター**: ボイスの変化がプレイヤーにとってキャラクターの感情崩壊を最も直接的に伝える手段
2. **無音の演出力**: 絶頂の直前に音楽を止めることで、声と息遣いだけが空間を満たす緊張感を生む
3. **RefWavの切り替えタイミング**: 感情のフェーズが変わる直前のセリフから切り替える（変化を先読みする）
4. **鏡流の「溜め」を音で表現**: `……` の長さは声優の間で表現するよりも、テキスト分割+ウェイトで精密に制御する
