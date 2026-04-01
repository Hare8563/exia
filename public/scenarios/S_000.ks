; S_000.ks — チュートリアルシナリオ
; Layer: 1=渚(中央), 2=凛(前面), 3=カットイン

*entry
[laycount layers=0]
[backlay]
[image storage="black.png" layer=base page=back left=0 top=0 visible=true]
[trans time=500 method=crossfade]
[wt canskip=false]
;■文字クリア
[cm]
;■クリッカブルマップ無効化
[mapdisable layer=base page=fore]
;■背景レイヤを初期化
[freeimage layer=base page=fore]
[freeimage layer=base page=back]
;■レイヤーを初期化
[laycount layers="&sf.default_layer_num"]
[laycount messages=14]
;■ＢＧＭ停止
[STOP_BGM bgm_flag=0]
;■ＳＥ停止
[STOP_SE se_flag=0]
;■メッセージフレームの消去
[MESSAGE_OFF]
;■メッセージ履歴の出力を可能にする
[history output=true enabled=true]
;■右クリックを有効にする
[rclick enabled=true]
;■タイトルに戻る有効化
[startanchor enabled=true]
[call storage="macro_character_tool.ks" target=*character_macro]
[call storage="macro_image_tool.ks" target=*image_macro]
[call storage="macro_music_tool.ks" target=*voice_music_macro]
[call storage="macro_message_tool.ks" target=*message_name_macro]

*start
;■背景:チュートリアル背景・昼
[FAID_IN_CG back_cg="bg_forest.png" time=1500]
[PLAY_BGM bgm="b0001.mp3" bgm_flag=1]
;■立ち絵：渚（中央）・凛（前面）登場
[CHARA_ON ch_c="alicia_default_neutral_00001.png" ch_r="layra_default_neutral_00001.png" time=1000 ch_count=5]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
ようこそ、Exiaノベルゲームエンジンへ！[r]このチュートリアルでは、基本機能を紹介します。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
画面をクリックするか、スペースキーを押して、ストーリーを進めることができます。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="n0001.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
こんにちは！私が渚です。Exiaの機能を順に説明していきましょう。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="n0002.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
まず、この画面のようにキャラクターがセリフを話すことができます。[r]これは「ダイアログ」モードと呼ばれています。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
これは「ナレーション」モードです。ストーリーの背景説明などに使用されます。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="r0001.wav" voice_count=1]
[CH_NAME_PRECIOUS name="凛"]
私は凛です！複数のキャラクターが会話することもできますね。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="n0003.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
その通りです。次に特殊な表現方法を紹介します。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="r0002.wav" voice_count=1]
[CH_NAME_PRECIOUS name="凛"]
テキストは[r]このように改行したり、サイズを変えたりすることもできます。[SYSTEM_MENU_ON]

;■カットイン表示
[ITEM_IN item_name="bg_forest_hypno.png"]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
これはカットインです。特定のシーンを強調するために使用できます。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="n0004.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
カットインが表示されている状態でもキャラクターが会話できますね。[SYSTEM_MENU_ON]
;■カットイン非表示
[cm][MESSAGE_OFF][ITEM_OUT]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
カットインを非表示にすることもできます。[SYSTEM_MENU_ON]

;■暗転 → フルスクリーンCG表示
[cm][MESSAGE_OFF]
[ALL_OFF back_cg="black.png" out_number=0 time=1000][STOP_BGM bgm_flag=1]
[wait time=1000 canskip=true]
[FAID_IN_CG back_cg="cg_01.webp" time=1000]
[resetwait]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
これはフルスクリーンCGです。重要なシーンや背景の変更に使用できます。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="r0003.wav" voice_count=1]
[CH_NAME_PRECIOUS name="凛"]
CGの上にキャラクターのセリフを表示することもできます。物語の臨場感が増しますね！[SYSTEM_MENU_ON]

;■CGシーン終了 → 通常シーンに戻る
[FAID_CH_CG back_cg="bg_01.webp" time=1500]
[PLAY_BGM bgm="b0001.mp3" bgm_flag=1]
;■立ち絵：再表示
[CHARA_ON ch_c="alicia/default/neutral/sprite_neutral__00001_.png" ch_r="layra/default/neutral/sprite_neutral__00001_.png" time=1000 ch_count=5]
[cm][MESSAGE_ON]
[CH_NAME_OFF]
CGを終了して、通常のシーンに戻ります。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="n0005.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
そして最後に、Exiaの重要な機能である「選択肢」を紹介します。[r]ユーザーは物語の進行を選ぶことができます。[SYSTEM_MENU_ON]

[cm][MESSAGE_ON]
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
[cm][MESSAGE_ON]
[VOICE voice="n0006.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
テキストスタイルについて説明します。Exiaでは、HTMLタグを使って色や太字などのスタイルを適用できます。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="n0007.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
また、テキストの表示速度も調整できます。これはゲームの雰囲気作りに重要な要素です。[SYSTEM_MENU_ON]
[jump target=*choice_end]

*character_choice
[cm][MESSAGE_ON]
[VOICE voice="r0004.wav" voice_count=1]
[CH_NAME_PRECIOUS name="凛"]
キャラクター表示について説明します。キャラクターの立ち絵は自由に切り替えることができます。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="r0005.wav" voice_count=1]
[CH_NAME_PRECIOUS name="凛"]
また、キャラクターの名前を途中で変更したり、表情を変えたりすることも可能です。ストーリーの展開に合わせて使い分けましょう。[SYSTEM_MENU_ON]
[jump target=*choice_end]

*choice_end
[cm][MESSAGE_ON]
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
[cm][MESSAGE_ON]
[VOICE voice="n0008.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
わかりました！それでは...[SYSTEM_MENU_ON]
[jump target=*choice_mechanism cond="f.second_choice == 'mechanism'"]
[jump target=*tutorial_end cond="f.second_choice != 'mechanism'"]

*choice_mechanism
[cm][MESSAGE_ON]
[VOICE voice="n0009.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
選択肢の仕組みについて説明します。各選択肢には「jumpTo」があり、選択後にジャンプする先のIDを指定します。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="n0010.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
フラグ（flag）でフラグをセットし、ifタグで条件分岐できます。今体験していただいた機能がまさにそれです。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="n0011.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
さらにjumpタグを使えば別のシナリオファイルへ移動できます。このチュートリアルの最後でも使いますよ！[SYSTEM_MENU_ON]
[jump target=*tutorial_end]

*tutorial_end
[cm][MESSAGE_ON]
[VOICE voice="n0012.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
以上でExiaの基本機能紹介を終わります。実際にゲームを作る際は、これらの機能を組み合わせて豊かなストーリーテリングを実現してください。[SYSTEM_MENU_ON]
[cm][MESSAGE_ON]
[VOICE voice="r0006.wav" voice_count=1]
[CH_NAME_PRECIOUS name="凛"]
お疲れ様でした！ちなみに、最初に選んだのは...[SYSTEM_MENU_ON]
[jump target=*ending_text cond="f.first_choice == 'text'"]
[jump target=*ending_chara cond="f.first_choice != 'text'"]

*ending_text
[cm][MESSAGE_ON]
[VOICE voice="n0013.wav" voice_count=0]
[CH_NAME_AKI name="渚"]
テキストスタイルでしたね。文章表現へのこだわりを感じます！[SYSTEM_MENU_ON]
[jump target=*finale]

*ending_chara
[cm][MESSAGE_ON]
[VOICE voice="r0007.wav" voice_count=1]
[CH_NAME_PRECIOUS name="凛"]
キャラクター表示でしたね。演出へのこだわりを感じます！[SYSTEM_MENU_ON]
[jump target=*finale]

*finale
[cm][MESSAGE_OFF]
[ALL_OFF_WIHTE time=2000][STOP_BGM bgm_flag=1]
[jump storage=main.ks target=*entry]
