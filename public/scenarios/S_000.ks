; S_000.ks — チュートリアルシナリオ
; Layer: 0=渚(左), 1=凛(右), 3=カットイン, 4=フルスクリーンCG

*entry
[laycount layers=0]
[backlay]
[image storage = "black.png" layer = base page = back left = 0 top = 0 visible = true]
[trans time = 500 method = crossfade]
[wt canskip = false]
;■文字クリア
[cm]
;■クリッカブルマップ無効化
[mapdisable layer = base page = fore]
;■背景レイヤを初期化
[freeimage layer = base page = fore]
[freeimage layer = base page = back]
;■レイヤーを初期化
[laycount layers = "&sf.default_layer_num"]
[laycount messages = 14]
;■ＢＧＭ停止
[STOP_BGM bgm_flag = 0]
;■ＳＥ停止
[STOP_SE se_flag = 0]
;■メッセージフレームの消去
[MESSAGE_OFF]
;■メッセージ履歴の出力を可能にする
[history output = true enabled = true]
;■右クリックを有効にする
[rclick enabled = true]
;■タイトルに戻る有効化
[startanchor enabled = true]
[call storage="macro_character_tool.ks" target=*character_macro]
[call storage="macro_image_tool.ks" target=*image_macro]
[call storage="macro_music_tool.ks" target=*voice_music_macro]
[call storage="macro_message_tool.ks" target=*message_name_macro]

*start
[image storage = "clear2" layer = base page = fore left = 0 top = 0 visible = true]
[backlay]
[image storage = "bg_01.webp" layer = base page = back left = 0 top = 0 visible = true]
[trans layer = base method = crossfade time = 1500]
[wt canskip = false]
[image layer = 1 storage = "clear2" page = fore left = 1050 top = 100 visible = true opacity = 255]
[image layer = 2 storage = "clear2" page = fore left = 200 top = 0 visible = true opacity = 255]
[backlay]
[image layer = 1 storage = "alicia/default/neutral/sprite_neutral__00001_.png" page = back left = 1050 top = 100 visible = true opacity = 255]
[image layer = 2 storage = "layra/default/neutral/sprite_neutral__00001_.png" page = back left = 200 top = 0 visible = true opacity = 255]
[trans layer = 1 method = crossfade time = 1000]
[trans layer = 2 method = crossfade time = 1000]
[wt canskip = false]
[MESSAGE_ON]
ようこそ、Exiaノベルゲームエンジンへ！[r]このチュートリアルでは、基本機能を紹介します。[l]
画面をクリックするか、スペースキーを押して、ストーリーを進めることができます。[l]
[CH_NAME_AKI name="渚"]
[VOICE voice="n0001.wav" voice_count=4]
こんにちは！私が渚です。Exiaの機能を順に説明していきましょう。[l]
[CH_NAME_AKI name="渚"]
[VOICE voice="n0002.wav" voice_count=4]
まず、この画面のようにキャラクターがセリフを話すことができます。[r]これは「ダイアログ」モードと呼ばれています。[l]
[CH_NAME_OFF]
これは「ナレーション」モードです。ストーリーの背景説明などに使用されます。[l]
[CH_NAME_PRECIOUS name="凛"]
[VOICE voice="r0001.wav" voice_count=4]
私は凛です！複数のキャラクターが会話することもできますね。[l]
[CH_NAME_AKI name="渚"]
[VOICE voice="n0003.wav" voice_count=4]
その通りです。次に特殊な表現方法を紹介します。[l]
[CH_NAME_PRECIOUS name="凛"]
[VOICE voice="r0002.wav" voice_count=4]
テキストは[r]このように改行したり、サイズを変えたりすることもできます。[l]

[ITEM_IN item_name=cut_01.webp]
[CH_NAME_OFF]
これはカットインです。特定のシーンを強調するために使用できます。[l]
[CH_NAME_AKI name="渚"]
[VOICE voice="n0004.wav" voice_count=4]
カットインが表示されている状態でもキャラクターが会話できますね。[l]
[ITEM_OUT]
[CH_NAME_OFF]
カットインを非表示にすることもできます。[l]

[ALL_OFF back_cg = "black.png" out_number=0 time=1000][STOP_BGM bgm_flag = 1]
[wait time=1000 canskip=true]
[FAID_IN_CG back_cg="cg_01.webp" time=1000]
[resetwait]

[CH_NAME_OFF]
これはフルスクリーンCGです。重要なシーンや背景の変更に使用できます。[l]
[CH_NAME_PRECIOUS name="凛"]
[VOICE voice="r0003.wav" voice_count=4]
CGの上にキャラクターのセリフを表示することもできます。物語の臨場感が増しますね！[l]
[image layer=4 visible=false]
[CH_NAME_OFF]
CGを終了して、通常のシーンに戻ります。[l]
[CH_NAME_AKI name="渚"]
[VOICE voice="n0005.wav" voice_count=4]
そして最後に、Exiaの重要な機能である「選択肢」を紹介します。[r]ユーザーは物語の進行を選ぶことができます。[l]

[CH_NAME_OFF]
どのような機能についてもっと知りたいですか？[r]
[glink target=*set_feature_text text="テキストスタイルについて"]
[glink target=*set_feature_chara text="キャラクター表示について"]
[s]

*set_feature_text
[flag name=first_choice value=text]
[jump target=*text_style_choice]

*set_feature_chara
[flag name=first_choice value=chara]
[jump target=*character_choice]

*text_style_choice
[CH_NAME_AKI name="渚"]
[VOICE voice="n0006.wav" voice_count=4]
テキストスタイルについて説明します。Exiaでは、HTMLタグを使って色や太字などのスタイルを適用できます。[l]
[CH_NAME_AKI name="渚"]
[VOICE voice="n0007.wav" voice_count=4]
また、テキストの表示速度も調整できます。これはゲームの雰囲気作りに重要な要素です。[l]
[jump target=*choice_end]

*character_choice
[CH_NAME_PRECIOUS name="凛"]
[VOICE voice="r0004.wav" voice_count=4]
キャラクター表示について説明します。キャラクターの立ち絵は自由に切り替えることができます。[l]
[CH_NAME_PRECIOUS name="凛"]
[VOICE voice="r0005.wav" voice_count=4]
また、キャラクターの名前を途中で変更したり、表情を変えたりすることも可能です。ストーリーの展開に合わせて使い分けましょう。[l]
[jump target=*choice_end]

*choice_end
[CH_NAME_OFF]
もう一つ説明して欲しい機能はありますか？[r]
[glink target=*set_want_mechanism text="選択肢の仕組みについて"]
[glink target=*set_want_end text="チュートリアルを終了する"]
[s]

*set_want_mechanism
[flag name=second_choice value=mechanism]
[jump target=*want_branch]

*set_want_end
[flag name=second_choice value=end]
[jump target=*want_branch]

*want_branch
[CH_NAME_AKI name="渚"]
[VOICE voice="n0008.wav" voice_count=4]
わかりました！それでは...[l]
[if exp="f.second_choice == mechanism"]
[jump target=*choice_mechanism]
[else]
[jump target=*tutorial_end]
[endif]

*choice_mechanism
[CH_NAME_AKI name="渚"]
[VOICE voice="n0009.wav" voice_count=4]
選択肢の仕組みについて説明します。各選択肢には「jumpTo」があり、選択後にジャンプする先のIDを指定します。[l]
[CH_NAME_AKI name="渚"]
[VOICE voice="n0010.wav" voice_count=4]
フラグ（flag）でフラグをセットし、ifタグで条件分岐できます。今体験していただいた機能がまさにそれです。[l]
[CH_NAME_AKI name="渚"]
[VOICE voice="n0011.wav" voice_count=4]
さらにjumpタグを使えば別のシナリオファイルへ移動できます。このチュートリアルの最後でも使いますよ！[l]
[jump target=*tutorial_end]

*tutorial_end
[CH_NAME_AKI name="渚"]
[VOICE voice="n0012.wav" voice_count=4]
以上でExiaの基本機能紹介を終わります。実際にゲームを作る際は、これらの機能を組み合わせて豊かなストーリーテリングを実現してください。[l]
[CH_NAME_PRECIOUS name="凛"]
[VOICE voice="r0006.wav" voice_count=4]
お疲れ様でした！ちなみに、最初に選んだのは...[l]
[CH_NAME_OFF]
（あなたの選択を振り返って）[l]
[if exp="f.first_choice == text"]
[jump target=*ending_text]
[else]
[jump target=*ending_chara]
[endif]

*ending_text
[CH_NAME_AKI name="渚"]
[VOICE voice="n0013.wav" voice_count=4]
テキストスタイルでしたね。文章表現へのこだわりを感じます！[l]
[jump target=*finale]

*ending_chara
[CH_NAME_PRECIOUS name="凛"]
[VOICE voice="r0007.wav" voice_count=4]
キャラクター表示でしたね。演出へのこだわりを感じます！[l]
[jump target=*finale]

*finale
[CH_NAME_OFF]
チュートリアル終了。メインに戻ります...[l]
[jump target=*entry storage=main.ks]
