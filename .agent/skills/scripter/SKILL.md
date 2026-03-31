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

## 重要原則：マクロを使う

このゲームはKAG3マクロシステムを使用している。**生のKAG3タグを直接書かずに、定義済みのマクロを使うこと。**

スクリプトの先頭で必ずマクロファイルを読み込む：

```ks
[call storage="macro_character_tool.ks" target=*character_macro]
[call storage="macro_image_tool.ks" target=*image_macro]
[call storage="macro_music_tool.ks" target=*voice_music_macro]
[call storage="macro_message_tool.ks" target=*message_name_macro]
```

---

## レイヤー割り当て規約

| レイヤー | 用途 | 位置 (left/top) |
|---------|------|----------------|
| `base` | 背景 | 0, 0 |
| `0` | キャラクター・左 | 50, 100 |
| `1` | キャラクター・中央 | 1050, 100 |
| `2` | キャラクター・右（または前面） | 200, 0 または 1350, 100 |
| `3` | カットイン・演出オーバーレイ | — |
| `4` | フルスクリーンCG（直接imageタグで制御） | — |

各スクリプトの先頭に、そのシナリオで使用するキャラクターのレイヤー割り当てをコメントで明記すること：

```ks
; Layer: 0=キャラA(左), 1=キャラB(中央), 2=キャラC(右), 3=カットイン
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
| ナレーション（地の文・独白） | `[CH_NAME_OFF]` + テキスト直書き + `[l]` |
| キャラクターの台詞 | `[CH_NAME_XXX name="キャラ名"]` + `[VOICE voice=xxx voice_count=N]` + テキスト + `[l]` |
| ページ送り（長いシーン区切り） | `[p]`（テキストをクリアして次へ） |
| 選択肢 | `[glink]` × N + `[s]` |
| フラグ操作 | `[flag name=xxx value=yyy]` |
| ラベルジャンプ（同ファイル内） | `[jump target=*label]` |
| ラベルジャンプ（別ファイル） | `[jump storage=S_XXX.ks target=*label]` |
| 改行（テキスト内） | `[r]` |

### 演出参照タグの解釈

本文中に埋め込まれた参照タグを読み取り、対応するKAGマクロを出力する。

| 参照タグ形式 | KAG出力 |
|------------|---------|
| `〈BG:image_name〉` | `[FAID_IN_CG back_cg="image_name.webp" time=1500]` |
| `〈BG_CHANGE:image_name〉` | `[FAID_CH_CG back_cg="image_name.webp" time=500]` |
| `〈CG:image_name〉` | イベントCGフルパターンを展開（後述） |
| `〈VOICE:V001〉` | `[VOICE voice="V001.wav" voice_count=N]` |
| `〈BGM:filename〉` | `[PLAY_BGM bgm="filename.mp3" bgm_flag=0]` |
| `〈SE:filename〉` | `[PLAY_SE se="filename.wav" se_flag=0]` |
| `〈CHARA_ON:slot,file〉` | `[CHARA_ON ch_count=N ch_l="file" time=1000]` など |
| `〈CHARA_OFF:slot〉` | `[CHARA_OFF ch_count=N time=500]` |
| `〈CUTIN:filename〉` | `[ITEM_IN item_name="filename.webp"]` |
| `〈CUTIN_OFF〉` | `[ITEM_OUT]` |

---

## 演出パターン参照

シーン開幕・背景転換・キャラクター登場・衝撃・フラッシュ・アイテム提示など、状況に応じた演出の具体的な実装パターンは [`resources/direction_patterns.md`](resources/direction_patterns.md) を参照すること。

---

## Phase 3: KAGスクリプト組み立て

### 基本構造（スクリプトヘッダー）

S_000.ks のように、各スクリプトは `*entry` ラベルで初期化し、マクロファイルを読み込んでから `*start` で本文を始める：

```ks
; S_XXX.ks — [シーン説明]
; Layer: [レイヤー割り当て表]

*entry
[laycount layers=0]
[backlay]
[image storage="black.png" layer=base page=back left=0 top=0 visible=true]
[trans time=500 method=crossfade]
[wt canskip=false]
[cm]
[mapdisable layer=base page=fore]
[freeimage layer=base page=fore]
[freeimage layer=base page=back]
[laycount layers="&sf.default_layer_num"]
[laycount messages=14]
[STOP_BGM bgm_flag=0]
[STOP_SE se_flag=0]
[MESSAGE_OFF]
[history output=true enabled=true]
[rclick enabled=true]
[startanchor enabled=true]
[call storage="macro_character_tool.ks" target=*character_macro]
[call storage="macro_image_tool.ks" target=*image_macro]
[call storage="macro_music_tool.ks" target=*voice_music_macro]
[call storage="macro_message_tool.ks" target=*message_name_macro]

*start
; --- 背景・キャラクター初期化 ---
[FAID_IN_CG back_cg="bg_xxx.webp" time=1500]
[MESSAGE_ON]

; --- 本文 ---
```

### ナレーション行

```ks
[CH_NAME_OFF]
これは地の文です。[l]
長い場面では[r]このように改行できます。[l]
```

### ダイアログ行

```ks
[CH_NAME_KAZARI name="風璃"]
[VOICE voice="k0001.wav" voice_count=0]
こんにちは！セリフテキストです。[l]
```

- `[CH_NAME_XXX name="表示名"]` — 発話キャラが変わる行の直前に挿入する（キャラごとに固有マクロを使う）
- `[VOICE voice="filename.wav" voice_count=N]` — `voice_count` はキャラ番号（0〜7）。`0`が最もよく使われる
- セリフの直後に `[l]` で待機ポイントを設ける
- キャラ変更時は必ず `[CH_NAME_OFF]` または次の `[CH_NAME_XXX]` で上書きする

### 話者名マクロ一覧

| マクロ | キャラクター |
|--------|------------|
| `[CH_NAME_OFF]` | 話者名を非表示（ナレーション） |
| `[CH_NAME_M name="名前"]` | 主人公 |
| `[CH_NAME_KAZARI name="名前"]` | 風璃 |
| `[CH_NAME_TSUKINO name="名前"]` | 月乃 |
| `[CH_NAME_PRECIOUS name="名前"]` | Precious |
| `[CH_NAME_AKI name="名前"]` | 渚 |
| `[CH_NAME_SARARA name="名前"]` | さらら |
| `[CH_NAME_UTAHA name="名前"]` | 詩羽 |
| `[CH_NAME_HINAMI name="名前"]` | 陽奈実 |
| `[CH_NAME_KAGAHO name="名前"]` | 翔鳳 |
| `[CH_NAME_KYOSUKE name="名前"]` | 恭介 |
| `[CH_NAME_ONECE name="名前"]` | お姉ちゃん |
| `[CH_NAME_O name="名前"]` | その他 |

### 背景・CG制御マクロ

| マクロ | 説明 | 主なパラメータ |
|--------|------|---------------|
| `[FAID_IN_CG back_cg=xxx time=N]` | 背景フェードイン（透明→画像） | `back_cg`=ファイル名, `time`=ms |
| `[FAID_IN_CG2 back_cg=xxx time=N]` | 背景フェードイン（白→画像） | 同上 |
| `[FAID_CH_CG back_cg=xxx time=N]` | 背景クロスフェード（画像→画像） | 同上 |
| `[FAID_OUT_CG back_cg=xxx time=N]` | 背景フェードアウト | 同上 |
| `[INSTANT_CG back_cg=xxx]` | 背景即時切り替え（エフェクトなし） | `back_cg`=ファイル名 |
| `[ITEM_IN item_name=xxx]` | カットイン（layer=3）表示 | `item_name`=ファイル名 |
| `[ITEM_OUT]` | カットイン非表示 | — |

### イベントCGのフルパターン

イベントCGはベースCG開始→差分切り替え→終了の3段階で構成する。

#### ① CGシーン開始（暗転 → CG表示）

```ks
;■暗転
[cm][MESSAGE_OFF]
[ALL_OFF back_cg="black" out_number=0 time=1500][STOP_BGM bgm_flag=1]

;■イベントCG：xxx_01
*scene_log_xxx01
[eval exp="sf.seen_xxx_no01 = 1"]
[FAID_IN_CG back_cg="xxx_01" time=1500]
[PLAY_BGM bgm="bgm_009" bgm_flag=1]
[cm][MESSAGE_ON]
```

- `*scene_log_xxx01` ラベル：CGシーン回想ログの再生開始点。必ず付ける
- `[eval exp="sf.seen_xxx_no01 = 1"]`：そのCGを初回閲覧したことを記録するフラグ
- ラベル名・フラグ名はcg_manifest.jsonの `scene_log_label` / `seen_flag` フィールドを参照する

#### ② 差分切り替え（静止画のみ）

```ks
;■イベントCG：xxx_01a
[FAID_CH_CG back_cg="xxx_01a" time=500]
[cm][MESSAGE_ON]
```

- 差分切り替えは必ず `[FAID_CH_CG time=500]`（クロスフェード、500ms固定）
- 新規CG開始の `[FAID_IN_CG time=1500]` とは使い分けること

#### ③ 差分切り替え（アニメーション対応）

動画アニメが存在するシーンでは、`sf.config_anime_mode` で静止画/動画を切り替える：

```ks
;■イベントCG：xxx_01e（動画ループ開始 or アニメなし差分）
[eval exp="sf.movie_xxx_no01 = 1"]
[if exp="sf.config_anime_mode == 0"]
    [PLAY_MOVIE_LOOP movie_name1="xxx_01a.mpg" movie_name2="xxx_01a.mpg" layer_name="xxx_01d"]
    [eval exp="f.anime_name1 = 'xxx_01a.mpg'"]
    [eval exp="f.anime_name2 = 'xxx_01b.mpg'"]
    [eval exp="f.anime_name3 = 'xxx_01c.mpg'"]
    [eval exp="f.anime_name4 = 'xxx_01d.mpg'"]
    [eval exp="f.anime_play = 0"]
    [eval exp="f.slot_flag = 0"]
    [eval exp="f.zoom_flag = 0"]
    [eval exp="f.camera_flag = 0"]
    [INVISIBLE_CG back_cg="xxx_01e"]
[else]
    [FAID_CH_CG back_cg="xxx_01e" time=500]
[endif]
[cm][MESSAGE_ON]
```

動画なしで単純に「動画モードONなら不可視切り替え」の場合：

```ks
;■イベントCG：xxx_01e
[if exp="sf.config_anime_mode == 0"]
    [INVISIBLE_CG back_cg="xxx_01e"]
[elsif exp="sf.config_anime_mode == 1"]
    [FAID_CH_CG back_cg="xxx_01e" time=500]
[endif]
[cm][MESSAGE_ON]
```

- `[INVISIBLE_CG back_cg="xxx"]`：画像は表示せず `sf["xxx_01e"] = 1` フラグのみ立てる（動画が既に表示中のため）
- cg_manifest.jsonで `is_invisible: true` が付いている差分ファイルにはこのパターンを使う

#### ④ CGシーン終了（暗転 → 通常背景に戻る）

```ks
;■暗転（CGシーン終了）
[cm][MESSAGE_OFF]
[ALL_OFF back_cg="black" out_number=0 time=1500][STOP_BGM bgm_flag=1]
[FAID_IN_CG back_cg="bg_xxx" time=1500]
[PLAY_BGM bgm="bgm_xxx" bgm_flag=1]
[cm][MESSAGE_ON]
```

### キャラクター制御マクロ

| マクロ | 説明 | 主なパラメータ |
|--------|------|---------------|
| `[CHARA_ON ch_count=N ch_l=xxx time=N]` | キャラクター表示（フェードイン） | `ch_count`=スロット(0=左,1=中,2=右,3=全3,4=左中,5=中右,6=左右), `ch_l/ch_c/ch_r`=ファイル名, `time`=ms |
| `[CHARA_CH ch_count=N ch_l=xxx time=N]` | キャラクター切り替え | 同上 |
| `[CHARA_OFF ch_count=N time=N]` | キャラクター非表示（フェードアウト） | `ch_count`=スロット(0=左,1=中,2=右,3=全3,4=左中,5=中右,6=左右), `time`=ms |
| `[ALL_OFF back_cg=xxx out_number=N time=N]` | 全キャラ非表示 + 背景クリア | `back_cg`=フェード後の背景, `out_number`=フェード種別, `time`=ms |
| `[CHARA_SHAKE ch_count=N]` | キャラクター揺れエフェクト | `ch_count`=スロット |
| `[CHARA_MOVE ch_count=N]` | キャラクター移動 | `ch_count`=スロット |

### 音楽・SE制御マクロ

| マクロ | 説明 | 主なパラメータ |
|--------|------|---------------|
| `[PLAY_BGM bgm=xxx bgm_flag=0]` | BGM再生 | `bgm`=ファイル名, `bgm_flag`=0:通常/1:フェードイン |
| `[STOP_BGM bgm_flag=0]` | BGM停止 | `bgm_flag`=0:通常/1:フェードアウト |
| `[VOICE voice=xxx voice_count=N]` | ボイス再生（buf 2〜9） | `voice`=ファイル名, `voice_count`=キャラ番号(0〜7) |
| `[STOP_VOICE]` | 全ボイス停止 | — |
| `[PLAY_SE se=xxx se_flag=0]` | SE再生（buf 0） | `se`=ファイル名, `se_flag`=0:通常/1:フェード/2:停止待ち |
| `[PLAY_SE_LOOP se=xxx se_flag=0]` | SEループ再生（buf 1） | 同上 |
| `[STOP_SE se_flag=0]` | SE停止 | `se_flag`=0:通常/1:フェード |

### メッセージウィンドウ制御マクロ

| マクロ | 説明 |
|--------|------|
| `[MESSAGE_ON]` | メッセージウィンドウ表示（各シーン本文前に呼ぶ） |
| `[MESSAGE_OFF]` | メッセージウィンドウ非表示（演出中・CG表示前など） |
| `[SYSTEM_MENU_ON]` | システムメニュー表示（`[p]` 相当の改ページ + ボイス停止） |

### 選択肢

```ks
[CH_NAME_OFF]
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
[if exp="f.choice_result == text"]
Aを選んだ場合のテキスト[l]
[elsif exp="f.choice_result == chara"]
Bを選んだ場合のテキスト[l]
[else]
その他の場合のテキスト[l]
[endif]
```

### ファイルをまたぐジャンプ・呼び出し

```ks
; 別シナリオファイルへジャンプ（戻らない）
[jump storage=S_002.ks target=*start]

; 別ファイルのサブルーチンを呼ぶ（[return]で戻る）
[call storage=S_SUB.ks target=*subroutine_label]
```

**注意**: `file=` ではなく `storage=` を使うこと。

---

## Phase 4: タイミング調整

以下のシーンには意図的に余白行（テキストなし・`[l]`のみ）や `[wait time=N canskip=true]` を挿入する。

- 絶頂の直前：3〜5本の短い断片テキスト（`……`など）を `[l]` で区切る
- BGM切り替え直後：1〜2本の余白ナレーション
- 選択肢の直前：1本の問いかけナレーション
- 全消え演出の後：`[wait time=1000 canskip=true]` で間を取る

---

## Phase 5: 品質検証

### チェックリスト

- [ ] 全テキストページの末尾に `[SYSTEM_MENU_ON]` が付いているか（`[l]`/`[p]` は使わない）
- [ ] イベントCG開始前に `[ALL_OFF][STOP_BGM]` → `*scene_log_XXX` ラベル → `[eval sf.seen_xxx=1]` → `[FAID_IN_CG]` の順になっているか
- [ ] CG差分切り替えは `[FAID_CH_CG time=500]`（500ms固定）を使っているか（`FAID_IN_CG` は新規CG開始のみ）
- [ ] `is_invisible: true` の差分に `[INVISIBLE_CG]` を使い、アニメモード分岐を書いているか
- [ ] `[image layer=4 visible=false]` など低レベルタグでCGを消していないか（`ALL_OFF` を使うこと）
- [ ] `[glink]` の `target` に対応する `*label` が存在するか
- [ ] `[jump storage=xxx target=*label]` の `storage=` 表記が正しいか（`file=` は使わない）
- [ ] `[call storage=xxx target=*label]` の表記が正しいか
- [ ] `[if exp="f.xxx == yyy"]` で参照するフラグが事前に `[flag]` で設定されているか
- [ ] 全ての `storage=xxx` がcg_manifestまたはaudio_manifestに存在するファイル名を参照しているか
- [ ] KAGレイヤー割り当てがスクリプト先頭のコメントと一致しているか
- [ ] `[VOICE voice=xxx voice_count=N]` の `voice_count` がキャラクターに対応しているか
- [ ] `[CH_NAME_OFF]` がナレーション行の前に必ず呼ばれているか
- [ ] 総テキスト行数が100〜120行の範囲に収まっているか

### レビューの実施

`workspace/scenario_draft.md` の上位にある `scenario-writer/resources/review.md` を読み込み、生成したスクリプトが鏡裕之流の理論（禁止と侵犯・誘惑ロジック・テンションコントロール）に沿っているかをレビューする。問題があれば箇所を特定してシナリオライターに差し戻す。

---

## Phase 6: プロデューサーレビュー

スクリプトを出力したら、**プロデューサーに以下の形式でレビューを依頼すること。**

### スクリプターからプロデューサーへの提出フォーマット

```
【スクリプト提出】S_XXX.ks — [シーン名]
出力パス: public/scenarios/S_XXX.ks
総テキストページ数: XX ページ
使用CG: XX 件
使用ボイス: XX 件
未解決アセット: [なし / ファイル名列挙]

--- スクリプト本文 ---
（生成したKSスクリプト全文を貼り付け）
```

### プロデューサーのレビュー観点

プロデューサーは以下を確認してフィードバックする：

**演出チェック**
- [ ] シーン開幕の演出（フェードイン方法・BGM選択）はシーンの雰囲気に合っているか
- [ ] 背景転換のタイミングは自然か（セリフの途中で背景が変わっていないか）
- [ ] キャラクター登場・退場のタイミングは会話の流れと合っているか
- [ ] 表情変化（`CHARA_CH`）はセリフの感情に合っているか
- [ ] シェイク・フラッシュ演出の強度はシーンのインパクトに見合っているか
- [ ] アイテム提示のタイミング・演出は効果的か
- [ ] 暗転（`ALL_OFF`）の前にセリフがきちんと完結しているか
- [ ] `[SYSTEM_MENU_ON]` の付け忘れがないか
- [ ] イベントCGに `*scene_log_XXX` ラベルと `sf.seen_xxx_no01` フラグが付いているか
- [ ] CG差分のタイミングはシーンの感情変化に合っているか（差分が多すぎ/少なすぎないか）
- [ ] アニメーション対応差分（`is_invisible`）に正しく `INVISIBLE_CG` / `FAID_CH_CG` の分岐が書かれているか

**テキスト・フローチェック**
- [ ] ナレーションと台詞の使い分けが適切か
- [ ] 1ページあたりのテキスト量は適切か（長すぎず・短すぎず）
- [ ] 選択肢の直前に問いかけナレーションがあるか
- [ ] ラベル・ジャンプの接続先が正しいか
- [ ] キャラクター名の表記ゆれがないか（`name=` の文字列）

**BGM・SE チェック**
- [ ] BGM番号はシーンの雰囲気に合っているか
- [ ] 重要な演出前にBGMが適切にフェードアウトされているか
- [ ] SE（効果音）はシェイク・フラッシュと同時に呼ばれているか

### フィードバックの記述例

```
【フィードバック】
■ p.15 (grand002_XXX_0015)
  → キャラクター退場が早すぎる。次のセリフまで画面に残してほしい。
  　 CHARA_OFF を 0015 → 0017 の後に移動。

■ p.22 (grand002_XXX_0022)
  → フラッシュが不要。THREE_FLASH → ONE_FLASH に変更。

■ 全体
  → BGM が bgm_003 のままシリアスシーンに突入している。
  　 0031 以降は bgm_008 または bgm_009 に変えること。
```

スクリプターはフィードバックを受け取ったら、指摘箇所のみを修正して再提出する。

---

## Phase 7: 出力

プロデューサーのレビューが通ったら最終スクリプトを `public/scenarios/[シーンID].ks` に出力する。

プロデューサーに完了を報告する。報告内容：
- 出力ファイルパス
- 総テキストページ数
- 使用CGファイル数・音声ファイル数
- 未解決の参照（アセット未生成のファイル名）があれば列挙する

---

## KAGタグ早見表（低レベル）

マクロで解決できない場合のみ使用する。完全なタグ仕様は [`resources/tags.md`](resources/tags.md) を参照。

| タグ | 説明 |
|------|------|
| `[l]` | クリック待ち（行末必須） |
| `[p]` | ページクリア＋クリック待ち |
| `[r]` | テキスト内改行 |
| `[cm]` | テキストバッファクリア（待機なし） |
| `[er]` | テキストバッファクリア（メッセージレイヤ） |
| `[s]` | 停止（選択肢待ちなどで使用） |
| `[image layer=N storage=xxx page=fore/back visible=true/false left=N top=N]` | レイヤー画像直接設定 |
| `[backlay]` | fore→backへバッファをコピー |
| `[trans layer=N/base method=crossfade time=N]` | トランジション開始（即時） |
| `[wt canskip=true/false]` | 全トランジション完了待ち |
| `[wait time=N canskip=true/false]` | Nミリ秒待機 |
| `[playbgm storage=xxx]` | BGM再生（直接） |
| `[stopbgm]` | BGM停止（直接） |
| `[playse buf=N storage=xxx loop=true/false]` | SE再生（直接） |
| `[stopse buf=N]` | SE停止（直接） |
| `[flag name=xxx value=yyy]` | フラグ設定 |
| `[eval exp="f.xxx = yyy"]` | 式評価・フラグ設定 |
| `[if exp="f.xxx == yyy"]` | 条件分岐 |
| `[elsif exp="..."]` | else if節 |
| `[else]` | else節 |
| `[endif]` | 分岐終了 |
| `[jump target=*label]` | ラベルジャンプ（同ファイル内） |
| `[jump storage=S_XXX.ks target=*label]` | ラベルジャンプ（別ファイル） |
| `[call storage=S_XXX.ks target=*label]` | サブルーチン呼び出し |
| `[return]` | サブルーチンから戻る |
| `[glink target=*label text="xxx"]` | 選択肢ボタン |
| `[layopt layer=N/message0/etc page=fore/back visible=true/false]` | レイヤー表示制御 |
| `[history output=true/false enabled=true/false]` | 履歴設定 |
| `[rclick enabled=true/false]` | 右クリック有効/無効 |
| `[startanchor enabled=true/false]` | タイトル戻り有効/無効 |
| `[resetwait]` | 自動読み進みタイマーリセット |
| `[freeimage layer=N/base page=fore/back]` | レイヤー画像解放 |
| `[laycount layers=N messages=N]` | レイヤー数設定 |
