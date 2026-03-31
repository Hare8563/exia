# 演出パターン集（grand002 実績から抽出）

スクリプターはこのファイルを参照し、各シチュエーションに対応する演出を選択すること。
実際の用法は `F:/repo/sound_bank/scenerio/scenario/grand002_*.ks` の実装が最終根拠。

---

## 1. シーン開幕

### 通常シーン（暗転→フェードイン）

シナリオファイルの冒頭、または時間・場所が切り替わるシーン切り替えで使用。

```ks
;■背景:○○○・昼
[FAID_IN_CG back_cg="bg_XXX" time=1500]
[PLAY_BGM bgm="bgm_XXX" bgm_flag=1]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
（冒頭ナレーション）[SYSTEM_MENU_ON]
```

- `time=1500` が標準。重い場面の開幕は `time=2000`。
- BGMは必ずフェードイン（`bgm_flag=1`）。

### 白い背景からフェードイン（夢・回想冒頭）

```ks
[FAID_IN_CG2 back_cg="bg_XXX" time=1500]
```

- 白からクロスフェード。夢・過去回想の入り口に使う。

### ワイプ演出で開幕（フラッシュバック・回想）

```ks
;■背景:○○・回想
[TR_IN_CG back_cg="bg_XXX" t_rule="mask_clock_rl" time=800]
[PLAY_BGM bgm="bgm_XXX" bgm_flag=1]
```

| t_rule（マスクファイル） | 視覚的効果 | 主な用途 |
|--------------------------|-----------|---------|
| `mask_speedlr.png` | 高速横ワイプ（左→右） | 回想突入・スピード感 |
| `mask_speedrl.png` | 高速横ワイプ（右→左） | 同上、逆方向 |
| `mask_clock_rl` / `mask_clock_lr` | 時計回り/反時計回り | 回想、時間経過 |
| `mask_melt.png` | 溶けるように | 意識が薄れる・夢 |
| `mask_lr_blind.png` / `mask_rl_blind.png` | ブラインド | コミカル、場面転換 |
| `mask_eyeopen.png` / `mask_eyeclose` | 瞳が開く/閉じる | 意識が戻る/気を失う |
| `mask_volute_io` / `mask_volute_oi` | 渦巻き | 混乱・催眠 |
| `mask_burst_io.png` / `mask_burst_oi.png` | 爆発 | 激しい場面転換 |
| `mask_lurd_b.png` | 斜め | 個性的な転換 |
| `mask_uzumaki.png` | 螺旋 | 特殊演出 |

---

## 2. 背景転換（シーン中）

### 同一シーン内で場所や時間が変わる（クロスフェード）

```ks
;■背景:○○・夕
[FAID_CH_CG back_cg="bg_XXX" time=1500]
```

- `time=1500` 標準。感情的な切り替えは `time=2000`。
- BGMは継続の場合そのまま。変える場合は同じ行か直後に `[PLAY_BGM]`。

### 素早い場面切り替え（コミカル・テンポ重視）

```ks
[FAID_CH_CG back_cg="bg_XXX" time=500]
```

### ワイプで転換（高速・アクション中）

```ks
[TR_CH_CG back_cg="bg_XXX" t_rule="mask_speedlr.png" time=300]
```

---

## 3. 暗転（シーン終了・間）

### 標準暗転 + BGMフェードアウト

**最も多用されるパターン**（全シナリオで400回超）。
セリフの途中ではなく、**セリフが完結した直後**に入れること。

```ks
[ALL_OFF back_cg="black" out_number=0 time=1500][STOP_BGM bgm_flag=1]
```

- `out_number=0` = クロスフェード暗転
- `out_number=1` + `t_rule=マスク` = ワイプ暗転

### 瞬間暗転（ショック・急展開）

```ks
[ALL_OFF back_cg="black" out_number=0 time=300]
```

### ワイプ暗転（特殊演出）

```ks
[ALL_OFF back_cg="black" out_number=1 t_rule="mask_speedrl.png" time=300]
```

### 白転（エンディング・ルート分岐の幕引き）

```ks
[ALL_OFF_WIHTE time=4000][STOP_BGM bgm_flag=1]
[jump storage="title.ks" target="*main_title"]
```

- **エンディング専用**。ゲーム本編の途中では使わない。
- 必ずBGMフェードと同時に使う。

---

## 4. キャラクター登場・退場

### 通常登場（フェードイン）

```ks
;■立ち絵：風璃：表情
[if exp="sf.body_paint_patch == 0"]
[CHARA_ON ch_c="KAZARI_SE_010" time=1000 ch_count=1]
[endif]
[if exp="sf.body_paint_patch == 1"]
[CHARA_ON ch_c="KAZARI_SE_010B" time=1000 ch_count=1]
[endif]
```

- `time=1000` = 標準登場。
- 複数人同時登場も可（`ch_count=3`: 左中右全員）。

### 退場（フェードアウト）

```ks
;■風璃消す
[CHARA_OFF time=1000 ch_count=1]
```

- 退場後もナレーションが続く場合は退場してからテキストを書く。

### キャラクターが走り込む（勢いよく登場）

**必ず `[CHARA_MOVE]`（位置をずらす）→ `[CHARA_DASH]`（走り込み）の順で使う。**

```ks
[CHARA_MOVE character_move=0 time=200]
[CHARA_DASH ch_c="KAZARI_CO_004" time=300 character_move=0]
```

- `CHARA_MOVE` で一旦フレーム外に動かし、`CHARA_DASH` で元の位置に戻す動きになる。
- `time=300` 程度の高速で。

### 複数人を同時に登場させる

```ks
[CHARA_ON ch_l="KAZARI_SE_004" ch_c="clear2" ch_r="SARARA_SE_002" time=1000 ch_count=3]
```

- 登場させないスロットには `"clear2"` を指定。

---

## 5. 表情・服装変化

### セリフ間の表情変更（標準）

```ks
[CHARA_CH ch_c="KAZARI_SE_011" time=500 ch_count=1]
```

- `time=500` = 標準。気持ちの変化が小さければそのまま。
- `time=0` = 瞬間切り替え（ビックリ・ツッコミなど）。

### 複数人の表情を同時に変える

```ks
[CHARA_CH ch_l="KAZARI_CO_GL_002" ch_r="AKI_CO_GL_002" time=500 ch_count=6]
```

---

## 6. 衝撃・インパクト演出

### 画面揺れ（シェイク）

**必ずSEと同時に使う。** SEを先に呼んで揺れを起動する。

```ks
;■シェイク
[PLAY_SE se="se_025" se_flag=0]
[SHAKE_CG x=0 y=25 time=500 shake_flag=0]
```

| パラメータ設定 | 効果 | 用途 |
|--------------|------|------|
| `x=0 y=25 time=500` | 縦揺れ・中 | 落下・着地・ドスン |
| `x=0 y=25 time=800` | 縦揺れ・長 | 大きな衝撃・爆発 |
| `x=25 y=0 time=800` | 横揺れ | 殴打・横からの衝撃 |
| `x=25 y=25 time=800` | 全方向揺れ | 爆発・大地震 |
| `x=50 y=50 time=800` | 激しい全方向 | 大爆発・壊滅的衝撃 |
| `x=75 y=75 time=1000` | 最大強度 | 特大インパクト |
| `x=0 y=15 time=350` | 縦揺れ・弱 | 小さな衝撃・テーブルドン |

### キャラクターの揺れ（キャラクター単体）

```ks
[CHARA_SHAKE ch_count=1]
```

---

## 7. フラッシュ演出

### 3回フラッシュ（成人向けシーンのクライマックス演出）

```ks
;■フラッシュ
[PLAY_SE se="se_006" se_flag=0]
[THREE_FLASH_CG back_cg="kazari_02c" flash_back="white"]
```

- `flash_back="white"` = 白フラッシュ（最も多用）
- SEと同時に使う。

### 1回フラッシュ（成人向けシーンの挿入の瞬間のシーン）

```ks
;■フラッシュ
[PLAY_SE se="se_005" se_flag=0]
[ONE_FLASH_CG back_cg="tsukino_01c" flash_back="fire"]
```

- `flash_back="fire"` = 炎・爆発フラッシュ
- `flash_back="white"` = 白フラッシュ

### 2回フラッシュ（成人向けシーンの絶頂演出 (3回フラッシュより弱め)）

```ks
[TWO_FLASH_CG back_cg="bg_XXX" flash_back="white"]
```

---

## 8. アイテム提示（カットイン）

アイテム入手・重要アイテムの見せ場。**BGMを止め、SE→アイテム表示の順。**

```ks
（直前のセリフ）[SYSTEM_MENU_ON]

[cm][MESSAGE_OFF][STOP_BGM bgm_flag=1]

[eval exp="sf.item_flagXX = 1"]

;;■SE:道具を取り出す音
[PLAY_SE se="se_031" se_flag=0]
[ITEM_IN item_name=item_XXX]
[cm][MESSAGE_ON]
[CH_NAME_M name="峡哉"]
「『アイテム名』〜」[SYSTEM_MENU_ON]

[cm][MESSAGE_OFF][ITEM_OUT]

[PLAY_BGM bgm="bgm_XXX" bgm_flag=1]
（アイテムの説明セリフ）
```

- `[ITEM_IN]` 〜 `[ITEM_OUT]` の間でアイテム名のセリフを1行入れる。
- アイテム表示中はBGMなし（SE効果を際立たせる）。
- アイテムを片付けてからBGMを再開。

---

## 9. BGM・SE 運用

### BGM選択の目安

| BGM番号 | 用途（grand002での傾向） |
|---------|------------------------|
| `bgm_003` | 日常・探索・学校シーン（最多使用） |
| `bgm_005` | コミカル・軽快・部活動 |
| `bgm_004` | ほのぼの・会話 |
| `bgm_008` | 緊張・対決 |
| `bgm_009` | シリアス・重要な場面 |
| `bgm_010` | 複数人会話・賑やか |
| `bgm_002` | しっとり・感情的な場面 |

> BGM番号はゲームの実装に依存。実際のファイル名リストは音楽マニフェスト参照。

### BGM切り替えタイミング

- 新シーン開幕と同時に `[PLAY_BGM]` を呼ぶ
- 同一シーン内での感情転換：`[FAID_CH_CG]` と同タイミングで `[PLAY_BGM]`
- 重要な演出直前：`[STOP_BGM bgm_flag=1]` でフェードアウト → 演出後に再開

### SE 参考

SE の完全な一覧・用途・シェイク/フラッシュとの組み合わせは [`sound_effect.md`](sound_effect.md) を参照。

よく使う代表例：

| SE番号 | 用途 |
|--------|------|
| `se_005` / `se_006` | フラッシュ演出（ONE_FLASH / THREE_FLASH と必ずセット） |
| `se_007` | 足音ループ |
| `se_010` | きゅぴーん！（ひらめき・気づき） |
| `se_016` | がーん（ショック・衝撃） |
| `se_024` | チャイム / ドアが開く |
| `se_025` / `se_026` | 体当たり / 爆発（SHAKE_CG と組み合わせ） |
| `se_028` | ドアを開ける音 |
| `se_031` | 道具を取り出す音（アイテム提示に必須） |
| `se_036` | 殴る / 蹴る / 魔法衝突 |
| `se_062` | 倒れる / 崩れ落ちる（SHAKE_CG と組み合わせ） |

---

## 10. ページ区切りの書き方

各テキストページの末尾は `[SYSTEM_MENU_ON]` で統一する。
`[l]` や `[p]` は通常使わない。

```ks
[cm][MESSAGE_ON]
[CH_NAME_KAZARI name="風璃"]
「セリフテキスト」[SYSTEM_MENU_ON]
```

ただし、`[MESSAGE_OFF]` 直後など、テキストを出さずに演出のみ行う行は `[SYSTEM_MENU_ON]` 不要。

---

## 11. 場面コメントの書き方

各シーンブロックの前にコメントを入れる。スクリプターは必ずコメントを付けること。

```ks
;■背景:○○○・昼
;■SE:足音・ループ
;■立ち絵：風璃：登場
;■フラッシュ
;■シェイク
;■暗転
;■イベントＣＧ：○○○
;■以下、Xを？？？に（ボイス指示）
```

---

## 12. よくある演出の組み合わせ

### 「緊張場面」パターン

```ks
[FAID_IN_CG back_cg="bg_XXX" time=1500]
[PLAY_BGM bgm="bgm_008" bgm_flag=1]
;（緊張したセリフ群）
[PLAY_SE se="se_010" se_flag=0]
;■フラッシュ
[ONE_FLASH_CG back_cg="bg_XXX" flash_back="white"]
;（衝撃の台詞）[SYSTEM_MENU_ON]
[ALL_OFF back_cg="black" out_number=0 time=1500][STOP_BGM bgm_flag=1]
```

### 「登場→会話→退場」パターン

```ks
[FAID_IN_CG back_cg="bg_XXX" time=1500]
[PLAY_BGM bgm="bgm_003" bgm_flag=1]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
ナレーション[SYSTEM_MENU_ON]
;■立ち絵：キャラA
[CHARA_ON ch_c="CHARA_SE_001" time=1000 ch_count=1]
[cm][MESSAGE_ON]
[VOICE voice="v_XXXX_chara" voice_count=0]
[CH_NAME_KAZARI name="風璃"]
「セリフ」[SYSTEM_MENU_ON]
;■表情変化
[CHARA_CH ch_c="CHARA_SE_005" time=500 ch_count=1]
[cm][MESSAGE_ON]
[VOICE voice="v_YYYY_chara" voice_count=0]
[CH_NAME_KAZARI name="風璃"]
「次のセリフ」[SYSTEM_MENU_ON]
;■風璃消す
[CHARA_OFF time=1000 ch_count=1]
```

### 「場面転換（回想突入）」パターン

```ks
;（転換直前のセリフ）[SYSTEM_MENU_ON]
[ALL_OFF back_cg="black" out_number=1 t_rule="mask_clock_lr" time=800][STOP_SE se_flag=0][STOP_BGM bgm_flag=1]
;■以下回想
;■背景:○○・昼
[TR_IN_CG back_cg="bg_XXX" t_rule="mask_clock_rl" time=800]
[PLAY_BGM bgm="bgm_003" bgm_flag=1]
```

### 「衝撃→会話再開」パターン

```ks
;■シェイク
[PLAY_SE se="se_025" se_flag=0]
[SHAKE_CG x=0 y=25 time=500 shake_flag=0]
[cm][MESSAGE_ON]
[CH_NAME_M name="峡哉"]
「うわっ！」[SYSTEM_MENU_ON]
```
