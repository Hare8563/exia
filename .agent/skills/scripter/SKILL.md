---
name: scripter
description: シナリオドラフト・CGマニフェスト・オーディオマニフェストを統合し、Exiaエンジン向けの最終KAGスクリプト（S_XXX.ks）を組み立てる。
---

# Scripter Skill

このスキルは、シナリオライター・演出エンジニア・ボイスデザイナーの成果物を受け取り、Exiaゲームエンジンが直接読み込めるKAG3スクリプト（`.ks`）を組み立てます。

## 役割の定義

- **テキスト変換**: シナリオドラフトの散文をKAGタグ付きテキスト行に変換する
- **アセット統合**: CGマニフェスト・オーディオマニフェストのファイル参照を各行にマッピング
- **レイヤー管理**: キャラクター・CG・背景をKAGレイヤーシステムで制御
- **フロー制御**: ラベル・フラグ・選択肢・ジャンプをKAGタグで実装
- **品質検証**: 生成スクリプトの構文確認とレビュー

---

## レイヤー割り当て規約

| レイヤー | 用途 | 例 |
|---------|------|---|
| `base` | 背景 | `[image storage=bg_xxx.webp layer=base]` |
| `0` | キャラクター1（メイン） | `[image layer=0 storage=chara_A.webp visible=true]` |
| `1` | キャラクター2 | `[image layer=1 storage=chara_B.webp visible=true]` |
| `2` | キャラクター3 | `[image layer=2 storage=chara_C.webp visible=true]` |
| `3` | カットイン・演出オーバーレイ | `[image layer=3 storage=cut_01.webp visible=true]` |
| `4` | フルスクリーンCG | `[image layer=4 storage=cg_01.webp visible=true]` |

各スクリプトの先頭に、そのシナリオで使用するキャラクターのレイヤー割り当てをコメントで明記すること：

```ks
; Layer: 0=キャラA, 1=キャラB, 3=カットイン, 4=フルスクリーンCG
```

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

`workspace/scenario_draft.md` の「本文」セクションを解析し、各テキストブロックを以下のKAG出力に変換する。

### テキストタイプの判定とKAG出力

| 内容 | KAG出力 |
|------|---------|
| ナレーション（地の文・独白） | `[name]`なしでテキスト直書き + `[l]` |
| キャラクターの台詞 | `[name text="キャラ名"]` + テキスト + `[l]` |
| ページ送り（長いシーン区切り） | `[p]`（テキストをクリアして次へ） |
| 選択肢 | `[glink]` × N + `[s]` |
| フラグ操作 | `[flag name=xxx value=yyy]` |
| ジャンプ | `[jump target=*label]` |
| 改行（テキスト内） | `[r]` |

### 演出参照タグの解釈

本文中に埋め込まれた参照タグを読み取り、対応するKAGタグを出力する。

| 参照タグ形式 | KAG出力 |
|------------|---------|
| `〈CG:CG_001〉` | `[image layer=3 storage=CG_001.webp visible=true]` |
| `〈BG:opening〉` | `[image storage=opening.webp layer=base]` |
| `〈VOICE:V001〉` | `[voice storage=V001.wav]` |
| `〈BGM:第1幕〉` | `[bgm storage=第1幕.mp3]` |
| `〈SE:name〉` | `[se storage=name.wav]` |
| `〈FACE:emotion〉` | `[image layer=N storage=chara_XX_emotion.webp]`（N=そのキャラのレイヤー番号） |

---

## Phase 3: KAGスクリプト組み立て

### 基本構造

```ks
; S_XXX.ks — [シーン説明]
; Layer: [レイヤー割り当て表]

; --- 初期化 ---
[image storage=bg_xxx.webp layer=base]
[image layer=0 storage=chara_A.webp visible=true]

*entry
[bgm storage=bgm_opening.mp3]

; --- 本文 ---
ナレーションテキスト[l]
[name text="キャラA"]
[voice storage=chara_a_001.wav]
セリフテキスト[l]
```

### ナレーション行

```ks
これは地の文です。[l]
長い場面では[r]このように改行できます。[l]
```

### ダイアログ行

```ks
[name text="渚"]
[voice storage=n0001.wav]
こんにちは！セリフテキストです。[l]
```

- `[name text="xxx"]` は発話キャラが変わる行の直前に挿入する
- `[voice storage=xxx.wav]` で音声ファイルを直指定する
- セリフの直後に `[l]` で待機ポイントを設ける

### 選択肢

```ks
どうしますか？[r]
[glink target=*label_a text="選択肢A"]
[glink target=*label_b text="選択肢B"]
[s]

*label_a
[flag name=choice_result value=a]
[jump target=*scene_continue]

*label_b
[flag name=choice_result value=b]
[jump target=*scene_continue]
```

### 条件分岐

```ks
[if exp="f.choice_result == a"]
Aを選んだ場合のテキスト[l]
[else]
Bを選んだ場合のテキスト[l]
[endif]
```

### BGM・SE制御

```ks
[bgm storage=scene_bgm.mp3]   ; BGM開始
[stopbgm]                      ; BGM停止
[se storage=effect.wav]        ; SE再生
```

### CG・レイヤー制御

```ks
; カットイン表示
[image layer=3 storage=cut_scene.webp visible=true left=0 top=0]
演出テキスト[l]
[image layer=3 visible=false]  ; カットイン非表示

; フルスクリーンCG
[image layer=4 storage=cg_climax.webp visible=true left=0 top=0]
CGの説明テキスト[l]
[image layer=4 visible=false]  ; CG非表示

; 背景変更（クロスフェード）
[trans method=crossfade time=800]
[image storage=bg_new.webp layer=base]
[wt]
```

### フラグとジャンプ

```ks
[flag name=scene_cleared value=true]
[jump target=*next_scene]
[jump target=*start file=S_002.ks]  ; ファイルをまたいだジャンプ
```

---

## Phase 4: タイミング調整

以下のシーンには意図的に余白行（テキストなし・`[l]`のみ）や `[wait time=N]` を挿入する。

- 絶頂の直前：3〜5本の短い断片テキスト（`……`など）を `[l]` で区切る
- BGM切り替え直後：1〜2本の余白ナレーション
- 選択肢の直前：1本の問いかけナレーション

---

## Phase 5: 品質検証

### チェックリスト

- [ ] 全テキスト行の末尾に `[l]` または `[p]` が付いているか
- [ ] `[glink]` の `target` に対応する `*label` が存在するか
- [ ] `[jump target=*xxx]` に対応する `*label` が存在するか（ファイルをまたぐ場合は `file=` を指定しているか）
- [ ] `[if exp="f.xxx == yyy"]` で参照するフラグが事前に `[flag]` で設定されているか
- [ ] 全ての `storage=xxx` がcg_manifestまたはaudio_manifestに存在するファイル名を参照しているか
- [ ] KAGレイヤー割り当てがスクリプト先頭のコメントと一致しているか
- [ ] 総テキスト行数が100〜120行の範囲に収まっているか

### レビューの実施

`workspace/scenario_draft.md` の上位にある `scenario-writer/resources/review.md` を読み込み、生成したスクリプトが鏡裕之流の理論（禁止と侵犯・誘惑ロジック・テンションコントロール）に沿っているかをレビューする。問題があれば箇所を特定してシナリオライターに差し戻す。

---

## Phase 6: 出力

検証が通ったら最終スクリプトを `public/scenarios/[シーンID].ks` に出力する。

プロデューサーに完了を報告する。報告内容：
- 出力ファイルパス
- 総テキスト行数
- 使用CGファイル数・音声ファイル数
- 未解決の参照（アセット未生成のファイル名）があれば列挙する

---

## KAG タグ早見表

| タグ | 説明 |
|------|------|
| `[l]` | クリック待ち（行末必須） |
| `[p]` | ページクリア＋クリック待ち |
| `[r]` | テキスト内改行 |
| `[cm]` | テキストバッファクリア（待機なし） |
| `[s]` | 停止（選択肢待ちなどで使用） |
| `[name text="xxx"]` | 話者名設定 |
| `[image layer=N storage=xxx visible=true/false]` | レイヤー画像設定 |
| `[bgm storage=xxx]` | BGM再生 |
| `[stopbgm]` | BGM停止 |
| `[se storage=xxx]` | SE再生 |
| `[voice storage=xxx]` | 音声ファイル再生 |
| `[trans method=crossfade time=N]` | トランジション設定 |
| `[wt]` | トランジション完了待ち |
| `[wait time=N]` | Nミリ秒待機 |
| `[flag name=xxx value=yyy]` | フラグ設定 |
| `[if exp="f.xxx == yyy"]` | 条件分岐 |
| `[else]` | else節 |
| `[endif]` | 分岐終了 |
| `[jump target=*label]` | ラベルジャンプ |
| `[jump target=*label file=S_XXX.ks]` | ファイルをまたいだジャンプ |
| `[call target=*label]` | サブルーチン呼び出し |
| `[return]` | サブルーチンから戻る |
| `[glink target=*label text="xxx"]` | 選択肢ボタン |
