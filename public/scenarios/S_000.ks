; S_000.ks — チュートリアルシナリオ
; Layer: 0=渚, 1=凛, 3=カットイン, 4=フルスクリーンCG

[image storage=bg_01.webp layer=base]
[image layer=0 storage=chara_01.webp visible=true]
[image layer=1 storage=chara_02.webp visible=true]

*start
ようこそ、Exiaノベルゲームエンジンへ！[r]このチュートリアルでは、基本機能を紹介します。[l]
画面をクリックするか、スペースキーを押して、ストーリーを進めることができます。[l]
[name text="渚"]
[voice storage=n0001.wav]
こんにちは！私が渚です。Exiaの機能を順に説明していきましょう。[l]
[name text="渚"]
[voice storage=n0002.wav]
まず、この画面のようにキャラクターがセリフを話すことができます。[r]これは「ダイアログ」モードと呼ばれています。[l]
これは「ナレーション」モードです。ストーリーの背景説明などに使用されます。[l]
[name text="凛"]
[voice storage=r0001.wav]
私は凛です！複数のキャラクターが会話することもできますね。[l]
[name text="渚"]
[voice storage=n0003.wav]
その通りです。次に特殊な表現方法を紹介します。[l]
[name text="凛"]
[voice storage=r0002.wav]
テキストは[r]このように改行したり、サイズを変えたりすることもできます。[l]

[image layer=3 storage=cut_01.webp visible=true left=0 top=0]
これはカットインです。特定のシーンを強調するために使用できます。[l]
[name text="渚"]
[voice storage=n0004.wav]
カットインが表示されている状態でもキャラクターが会話できますね。[l]
[image layer=3 visible=false]
カットインを非表示にすることもできます。[l]

[image layer=4 storage=cg_01.webp visible=true left=0 top=0]
これはフルスクリーンCGです。重要なシーンや背景の変更に使用できます。[l]
[name text="凛"]
[voice storage=r0003.wav]
CGの上にキャラクターのセリフを表示することもできます。物語の臨場感が増しますね！[l]
[image layer=4 visible=false]
CGを終了して、通常のシーンに戻ります。[l]
[name text="渚"]
[voice storage=n0005.wav]
そして最後に、Exiaの重要な機能である「選択肢」を紹介します。[r]ユーザーは物語の進行を選ぶことができます。[l]

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
[name text="渚"]
[voice storage=n0006.wav]
テキストスタイルについて説明します。Exiaでは、HTMLタグを使って色や太字などのスタイルを適用できます。[l]
[name text="渚"]
[voice storage=n0007.wav]
また、テキストの表示速度も調整できます。これはゲームの雰囲気作りに重要な要素です。[l]
[jump target=*choice_end]

*character_choice
[name text="凛"]
[voice storage=r0004.wav]
キャラクター表示について説明します。キャラクターの立ち絵は自由に切り替えることができます。[l]
[name text="凛"]
[voice storage=r0005.wav]
また、キャラクターの名前を途中で変更したり、表情を変えたりすることも可能です。ストーリーの展開に合わせて使い分けましょう。[l]
[jump target=*choice_end]

*choice_end
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
[name text="渚"]
[voice storage=n0008.wav]
わかりました！それでは...[l]
[if exp="f.second_choice == mechanism"]
[jump target=*choice_mechanism]
[else]
[jump target=*tutorial_end]
[endif]

*choice_mechanism
[name text="渚"]
[voice storage=n0009.wav]
選択肢の仕組みについて説明します。各選択肢には「jumpTo」があり、選択後にジャンプする先のIDを指定します。[l]
[name text="渚"]
[voice storage=n0010.wav]
フラグ（flag）でフラグをセットし、ifタグで条件分岐できます。今体験していただいた機能がまさにそれです。[l]
[name text="渚"]
[voice storage=n0011.wav]
さらにjumpタグを使えば別のシナリオファイルへ移動できます。このチュートリアルの最後でも使いますよ！[l]
[jump target=*tutorial_end]

*tutorial_end
[name text="渚"]
[voice storage=n0012.wav]
以上でExiaの基本機能紹介を終わります。実際にゲームを作る際は、これらの機能を組み合わせて豊かなストーリーテリングを実現してください。[l]
[name text="凛"]
[voice storage=r0006.wav]
お疲れ様でした！ちなみに、最初に選んだのは...[l]
（あなたの選択を振り返って）[l]
[if exp="f.first_choice == text"]
[jump target=*ending_text]
[else]
[jump target=*ending_chara]
[endif]

*ending_text
[name text="渚"]
[voice storage=n0013.wav]
テキストスタイルでしたね。文章表現へのこだわりを感じます！[l]
[jump target=*finale]

*ending_chara
[name text="凛"]
[voice storage=r0007.wav]
キャラクター表示でしたね。演出へのこだわりを感じます！[l]
[jump target=*finale]

*finale
チュートリアル終了。メインに戻ります...[l]
[jump target=*entry file=main.ks]
