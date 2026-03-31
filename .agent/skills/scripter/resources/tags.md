# KAG3 タグリファレンス

KAG3 の全タグ一覧。パラメータの「必須」欄: **必** = 必須, 任 = 任意。

> **Exia での使い方**: 直接タグを書く前に `macro_*.ks` の定義済みマクロで代替できないか確認すること。→ [`SKILL.md`](../SKILL.md) 参照

---

## テキスト・メッセージ操作

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[l]` | 行末クリック待ち | — |
| `[p]` | ページクリア + クリック待ち | — |
| `[r]` | テキスト改行 | `eol` 任(bool) |
| `[cm]` | 全メッセージレイヤをクリア | — |
| `[ct]` | 現在のメッセージレイヤをリセット | — |
| `[er]` | 現在レイヤのテキストのみ消去 | — |
| `[s]` | 停止（選択肢待ちなど） | — |
| `[ch text=xxx]` | 1文字を描画 | `text` **必**(文字列) |
| `[hch text=xxx]` | 縦中横表示 | `text` **必**(文字列), `expand` 任(bool) |
| `[graph storage=xxx]` | テキスト中にインライン画像を表示 | `storage` **必**(ファイル名), `key` 任(色), `char` 任(bool), `alt` 任(text) |
| `[ruby text=xxx ruby=yyy]` | ルビ | `text` **必**, `ruby` **必** |
| `[locate x=N y=N]` | テキスト描画位置を指定 | `x` **必**(px), `y` **必**(px) |
| `[indent]` / `[endindent]` | インデント設定/解除 | — |
| `[nowait]` / `[endnowait]` | 即時表示（待機なし）開始/終了 | — |
| `[delay speed=N]` | 文字表示速度 | `speed` **必**("nowait"/"user"/ms) |
| `[current layer=messageN page=fore]` | 現在のメッセージレイヤを切り替え | `layer` 任(messageN), `page` 任("fore"/"back"), `withback` 任(bool) |
| `[position ...]` | メッセージレイヤの位置・サイズ・外観 | `layer` 任, `page` 任, `left/top/width/height` 任(px), `frame` 任(ファイル), `color` 任(0xRRGGBB), `opacity` 任(0-255), `marginl/margint/marginr/marginb` 任(px), `visible` 任(bool) |
| `[font ...]` | 文字属性設定 | `size` 任(px), `face` 任(フォント名), `color` 任(0xRRGGBB), `bold/shadow/edge` 任(bool), `edgecolor` 任 |
| `[resetfont]` | フォントをデフォルトに戻す | — |
| `[deffont ...]` | デフォルトフォントを定義 | `font` と同じパラメータ |
| `[style ...]` | 行スタイル | `align` 任("left"/"center"/"right"/"default"), `linespacing/pitch/linesize` 任(px), `autoreturn` 任(bool) |
| `[resetstyle]` | スタイルをデフォルトに戻す | — |
| `[defstyle ...]` | デフォルトスタイルを定義 | `style` と同じパラメータ |
| `[emb exp="..."]` | 式の評価結果をテキストに埋め込む | `exp` **必**(TJS式) |
| `[glyph ...]` | クリック待ちアイコン設定 | `line/page` 任(ファイル名), `linekey/pagekey` 任(色), `fix` 任(bool), `left/top` 任(px) |
| `[locklink]` / `[unlocklink]` | リンク有効/無効 | — |

---

## レイヤー操作

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[image ...]` | レイヤーに画像を読み込む | `storage` **必**(ファイル名), `layer` **必**(base/0/1/...), `page` 任("fore"/"back"), `left/top` 任(px), `visible` 任(bool), `opacity` 任(0-255), `key` 任(透過色), `mode` 任(合成モード) |
| `[pimage ...]` | レイヤーの一部に画像を描画 | `storage` **必**, `layer` **必**, `page` 任, `left/top` 任(px) |
| `[freeimage layer=N page=fore]` | レイヤー画像を解放 | `layer` **必**, `page` 任 |
| `[layopt ...]` | レイヤー属性を設定 | `layer` **必**, `page` 任, `visible` 任(bool), `left/top` 任(px), `opacity` 任(0-255), `autohide` 任(bool), `index` 任(int) |
| `[backlay]` | fore → back にレイヤーをコピー | `layer` 任(省略時は全レイヤー) |
| `[copylay ...]` | レイヤーを別レイヤーへコピー | `srclayer` **必**, `destlayer` **必**, `srcpage` 任, `destpage` 任 |
| `[laycount layers=N messages=N]` | レイヤー数を変更 | `layers` 任(数), `messages` 任(数) |
| `[ptext ...]` | レイヤーに直接テキストを描画 | `layer` **必**, `page` 任, `x/y` **必**(px), `text` **必**, `size/face/color/bold/shadow/edge` 任 |
| `[trans ...]` | トランジション開始（即時） | `layer` 任(base/0/1/..), `page` 任, `time` **必**(ms), `method` 任("crossfade"など), `rule` 任(ファイル名), `vague` 任(px) |
| `[wt canskip=true]` | 全トランジション完了まで待機 | `canskip` 任(bool) |
| `[stoptrans]` | トランジションを即時中断 | — |
| `[move ...]` | レイヤーを自動移動 | `layer` **必**, `page` 任, `time` **必**(ms), `path` **必**(座標リスト), `spline` 任(bool), `delay` 任(ms), `accel` 任(数) |
| `[wm canskip=true]` | レイヤー移動完了まで待機 | `canskip` 任(bool) |
| `[stopmove]` | レイヤー移動を停止 | — |
| `[animstart ...]` | アニメーション開始 | `layer` **必**, `page` 任, `seg` **必**(番号), `target` **必**(ラベル) |
| `[animstop ...]` | アニメーション停止 | `layer` **必**, `page` 任, `seg` **必**(番号) |
| `[wa]` | アニメーション完了まで待機 | — |
| `[mapimage ...]` | クリッカブルマップ領域画像 | `layer` **必**, `page` 任, `storage` **必** |
| `[mapaction ...]` | クリッカブルマップ操作ファイル | `layer` **必**, `page` 任, `storage` **必** |
| `[mapdisable ...]` | クリッカブルマップ無効化 | `layer` **必**, `page` 任 |

---

## サウンド・BGM

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[playbgm storage=xxx]` | BGM再生 | `storage` **必**(ファイル名), `loop` 任(bool), `volume/gvolume` 任(0-100) |
| `[stopbgm]` | BGM停止 | — |
| `[pausebgm]` / `[resumebgm]` | BGM一時停止/再開 | — |
| `[fadeinbgm storage=xxx time=N]` | BGMフェードイン | `storage` **必**, `time` **必**(ms), `loop` 任(bool) |
| `[fadeoutbgm time=N]` | BGMフェードアウト | `time` **必**(ms) |
| `[fadebgm volume=N time=N]` | BGMフェード（音量指定） | `volume` **必**(0-100), `time` **必**(ms) |
| `[fadepausebgm time=N]` | BGMフェードアウトして一時停止 | `time` **必**(ms) |
| `[xchgbgm storage=xxx time=N]` | BGMクロスフェード切り替え | `storage` **必**, `time` **必**(ms), `overlap` 任(ms), `volume` 任 |
| `[bgmopt ...]` | BGMオプション | `volume/gvolume` 任(0-100) |
| `[wb canskip=true]` | BGMフェード完了まで待機 | `canskip` 任(bool) |
| `[wl canskip=true]` | BGM再生終了まで待機 | `canskip` 任(bool) |
| `[setbgmlabel ...]` | BGMラベルハンドラ登録 | `name` **必**(ラベル), `storage/target/exp` 任 |
| `[clearbgmlabel]` | BGMラベルハンドラ解除 | — |
| `[setbgmstop ...]` | BGM停止ハンドラ登録 | `storage/target/exp` 任 |
| `[clearbgmstop]` | BGM停止ハンドラ解除 | — |
| `[playse buf=N storage=xxx]` | SE再生 | `buf` 任(バッファ番号), `storage` **必**, `loop` 任(bool), `volume/gvolume/pan` 任 |
| `[stopse buf=N]` | SE停止 | `buf` 任(省略時=0) |
| `[fadeinse buf=N storage=xxx time=N]` | SEフェードイン | `buf` 任, `storage` **必**, `time` **必**(ms) |
| `[fadeoutse buf=N time=N]` | SEフェードアウト | `buf` 任, `time` **必**(ms) |
| `[fadese buf=N volume=N time=N]` | SEフェード | `buf` 任, `volume` **必**, `time` **必**(ms) |
| `[seopt buf=N ...]` | SEオプション | `buf` 任, `volume/gvolume/pan` 任 |
| `[ws buf=N canskip=true]` | SE再生終了まで待機 | `buf` 任, `canskip` 任(bool) |
| `[wf canskip=true]` | SEフェード完了まで待機 | `canskip` 任(bool) |

> **ボイスのバッファ番号 (Exia 規約)**: buf 0 = SE, buf 1 = SEループ, buf 2〜9 = ボイス（`VOICE` マクロが管理）

---

## ビデオ/SWF（Exia では no-op）

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[video ...]` | ビデオ/SWF 表示領域の属性 | `slot` 任, `layer` **必**, `page` 任, `left/top/width/height` 任(px), `visible` 任(bool) |
| `[playvideo storage=xxx]` | ビデオ/SWF 再生 | `storage` **必**, `slot` 任, `autostop` 任(bool) |
| `[stopvideo]` | ビデオ/SWF 停止 | `slot` 任 |
| `[pausevideo]` / `[resumevideo]` | ビデオ一時停止/再開 | `slot` 任 |
| `[openvideo storage=xxx]` | ビデオを事前に開く | `storage` **必**, `slot` 任 |
| `[preparevideo]` | ビデオ再生準備 | `slot` 任 |
| `[rewindvideo]` | ビデオ巻き戻し | `slot` 任 |
| `[videoevent time=N exp=...]` | ビデオタイムドイベント | `time` **必**(ms), `exp` **必**(TJS式), `slot` 任 |
| `[videosegloop start=N end=N]` | ビデオセグメントループ | `start/end` **必**(ms), `slot` 任 |
| `[videolayer channel=N layer=N]` | ビデオレイヤ設定 | `channel` **必**(1-2), `layer` **必**, `slot` 任, `page` 任 |
| `[clearvideolayer channel=N]` | ビデオレイヤ解除 | `channel` **必**, `slot` 任 |
| `[wp ...]` | ビデオ期間イベント待機 | `slot` 任, `for` 任("loop"/"period"/"prepare"/"segLoop") |
| `[wv ...]` | ビデオ再生終了まで待機 | `slot` 任, `canskip` 任(bool) |

---

## ラベル・ジャンプ・フロー制御

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[jump storage=xxx target=*label]` | ラベルへジャンプ（戻らない） | `storage` 任(ファイル名), `target` 任(ラベル名), `countpage` 任(bool) |
| `[call storage=xxx target=*label]` | サブルーチン呼び出し | `storage` 任(ファイル名), `target` 任(ラベル名), `countpage` 任(bool) |
| `[return]` | サブルーチンから戻る | — |
| `[glink target=*label text="xxx"]` | 選択肢ボタン | `target` **必**(ラベル), `text` **必**(表示テキスト), `exp` 任(TJS式) |
| `[button ...]` | グラフィカルボタン | `graphic` **必**(ファイル名), `storage/target/exp` 任, `hint` 任(テキスト), `onenter/onleave` 任(TJS式), `clickse/enterse/leavese` 任(ファイル名) |
| `[link ...]` | ハイパーリンク | `storage/target/exp` 任, `se` 任, `hint` 任, `countpage` 任(bool) |
| `[endlink]` | ハイパーリンク終了 | — |
| `[click ...]` | クリック待ちジャンプ | `storage/target/exp` 任, `se` 任 |
| `[cclick]` | クリック待ちキャンセル | — |
| `[timeout time=N ...]` | タイムアウトジャンプ | `time` **必**(ms), `storage/target/exp` 任 |
| `[ctimeout]` | タイムアウトキャンセル | — |
| `[wheel ...]` | ホイール入力ジャンプ | `storage/target/exp` 任, `func` 任(メソッド名) |
| `[cwheel]` | ホイール入力キャンセル | — |

---

## 変数・条件分岐・TJS

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[flag name=xxx value=yyy]` | フラグ設定（f.xxx に値をセット） | `name` **必**, `value` **必** |
| `[eval exp="f.xxx = yyy"]` | TJS式を評価してフラグ設定 | `exp` **必**(TJS式) |
| `[if exp="f.xxx == yyy"]` | 条件分岐 | `exp` **必**(TJS式) |
| `[elsif exp="..."]` | else if | `exp` **必**(TJS式) |
| `[else]` | else | — |
| `[endif]` | 分岐終了 | — |
| `[ignore exp="..."]` | 条件が真の間ブロックを無視 | `exp` **必**(TJS式) |
| `[endignore]` | ignore ブロック終了 | — |
| `[emb exp="..."]` | 式の結果をテキストに埋め込む | `exp` **必**(TJS式) |
| `[trace exp="..."]` | コンソールに値を出力（デバッグ） | `exp` **必**(値) |
| `[clearvar]` | 全ゲーム変数をクリア | — |
| `[clearsysvar]` | 全システム変数をクリア | — |
| `[iscript]` … `[endscript]` | TJS スクリプトブロック | — |
| `[input name=xxx prompt=yyy]` | 文字入力ダイアログ | `name` **必**(変数名), `prompt` 任(テキスト), `title` 任(タイトル) |
| `[waittrig]` | トリガー待機 | — |

---

## システム制御

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[wait time=N canskip=true]` | N ミリ秒待機 | `time` **必**(ms), `canskip` 任(bool) |
| `[quake ...]` | 画面揺れ | `time` **必**(ms), `timemode` 任("ms"/"delay"), `hmax/vmax` 任(px) |
| `[stopquake]` | 画面揺れ停止 | — |
| `[wq canskip=true]` | 画面揺れ終了まで待機 | `canskip` 任(bool) |
| `[resetwait]` | オートモードタイマーリセット | — |
| `[hidemessage]` | メッセージレイヤを非表示 | — |
| `[rclick ...]` | 右クリック設定 | `call/jump` 任(bool), `storage/target/exp` 任 |
| `[clickskip enabled=true]` | クリックスキップ有効/無効 | `enabled` **必**(bool) |
| `[nextskip enabled=true]` | 次の選択肢まで読み飛ばし | `enabled` **必**(bool) |
| `[autowc ...]` | 自動改行待機設定 | `enabled` 任(bool), `ch` 任(文字), `time` 任(ms) |
| `[wc time=N]` | 文字数ベースの待機 | `time` **必**(文字数) |
| `[cancelautomode]` | オートモード解除 | — |
| `[cancelskip]` | スキップモード解除 | — |
| `[cursor ...]` | マウスカーソル変更 | `default/pointed/click/draggable` 任(カーソルファイル) |
| `[title text=xxx]` | ウィンドウタイトル設定 | `text` **必**(文字列) |
| `[close ask=true]` | ウィンドウを閉じる | `ask` 任(bool) |
| `[loadplugin storage=xxx]` | プラグイン読み込み | `storage` **必** |
| `[mappfont storage=xxx]` | 事前レンダリングフォント割り当て | `storage` **必** |
| `[startanchor enabled=true]` | タイトルへ戻るアンカー設定 | `enabled` 任(bool) |

---

## メッセージ履歴

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[history output=true enabled=true]` | 履歴設定 | `output` 任(bool), `enabled` 任(bool) |
| `[hr]` | 履歴に改行を挿入 | — |
| `[hact exp="..."]` | 履歴再生時のアクション登録 | `exp` **必**(TJS式) |
| `[endhact]` | 履歴アクション終了 | — |
| `[showhistory]` | 履歴を表示 | — |

---

## セーブ・ブックマーク

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[save place=N]` | ブックマーク保存 | `place` 任(番号) |
| `[load place=N]` | ブックマーク読み込み | `place` 任(番号) |
| `[tempsave place=N]` | メモリへ一時保存 | `place` 任(番号) |
| `[tempload place=N]` | メモリから読み込み | `place` 任(番号) |
| `[erasebookmark place=N]` | ブックマーク削除 | `place` 任(番号) |
| `[copybookmark from=N to=N]` | ブックマークコピー | `from` **必**, `to` **必** |
| `[store enabled=true]` | ブックマーク機能設定 | `enabled` **必**(bool) |
| `[disablestore ...]` | 一時的にセーブ/ロード無効化 | `store/restore` 任(bool) |
| `[record]` | 通過記録 | — |
| `[locksnapshot place=N]` | スナップショットをロック | `place` 任 |
| `[unlocksnapshot place=N]` | スナップショットのロック解除 | `place` 任 |
| `[goback ask=true]` | 前のシーンへ戻る | `ask` 任(bool) |
| `[gotostart ask=true]` | タイトルへ戻る | `ask` 任(bool) |

---

## マクロ定義

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[macro name=xxx]` | マクロ定義開始 | `name` **必**(タグ名) |
| `[endmacro]` | マクロ定義終了 | — |
| `[erasemacro name=xxx]` | マクロを削除 | `name` **必**(タグ名) |

マクロ内で `%param` = パラメータ参照, `&expr` = 式展開, `mp.param` = TJS 式内でのパラメータ参照。

---

## フォーム操作（UI 入力）

| タグ | 説明 | 主なパラメータ |
|------|------|---------------|
| `[edit name=xxx length=N]` | 1行テキスト入力フィールド | `name` **必**(変数名), `length` 任(px), `maxchars` 任(文字数), `bgcolor/color` 任 |
| `[checkbox name=xxx]` | チェックボックス | `name` **必**(変数名), `bgcolor/color` 任 |
| `[commit]` | フォーム内容を確定 | — |

---

## 変数スコープ

| 変数 | スコープ | 説明 |
|------|---------|------|
| `f.xxx` | ゲームセーブ | ゲーム進行フラグ。セーブデータに保存される |
| `sf.xxx` | システム | ゲーム全体の設定・永続データ（スライダー値など） |
| `kag.xxx` | エンジン | KAGエンジンのプロパティ（`kag.autoMode` など） |
| `mp.xxx` | マクロ内 | マクロ呼び出し時のパラメータ参照 |
