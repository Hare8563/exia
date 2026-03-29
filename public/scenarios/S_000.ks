; S_000.ks — チュートリアルシナリオ
; Layer: 0=渚, 1=凛, 3=カットイン, 4=フルスクリーンCG

[image storage=bg_01.webp layer=base]
[image layer=0 storage=chara_01.webp visible=true]
[image layer=1 storage=chara_02.webp visible=true]

*start
ようこそ、Exiaノベルゲームエンジンへ！[r]このチュートリアルでは、基本機能を紹介します。[l]
画面をクリックするか、スペースキーを押して、ストーリーを進めることができます。[l]
[name text="渚"]
[voice speaker=3]
こんにちは！私が渚です。Exiaの機能を順に説明していきましょう。[l]
[name text="渚"]
まず、この画面のようにキャラクターがセリフを話すことができます。[r]これは「ダイアログ」モードと呼ばれています。[l]
これは「ナレーション」モードです。ストーリーの背景説明などに使用されます。[l]
[name text="凛"]
[voice speaker=2]
私は凛です！複数のキャラクターが会話することもできますね。[l]
[name text="渚"]
[voice speaker=3]
その通りです。次に特殊な表現方法を紹介します。[l]
[name text="凛"]
[voice speaker=2]
テキストは[r]このように改行したり、サイズを変えたりすることもできます。[l]

[image layer=3 storage=cut_01.webp visible=true left=0 top=0]
これはカットインです。特定のシーンを強調するために使用できます。[l]
[name text="渚"]
[voice speaker=3]
カットインが表示されている状態でもキャラクターが会話できますね。[l]
[image layer=3 visible=false]
カットインを非表示にすることもできます。[l]

[image layer=4 storage=cg_01.webp visible=true left=0 top=0]
これはフルスクリーンCGです。重要なシーンや背景の変更に使用できます。[l]
[name text="凛"]
[voice speaker=2]
CGの上にキャラクターのセリフを表示することもできます。物語の臨場感が増しますね！[l]
[image layer=4 visible=false]
CGを終了して、通常のシーンに戻ります。[l]
[name text="渚"]
[voice speaker=3]
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
[voice speaker=3]
テキストスタイルについて説明します。Exiaでは、HTMLタグを使って色や太字などのスタイルを適用できます。[l]
また、テキストの表示速度も調整できます。これはゲームの雰囲気作りに重要な要素です。[l]
[jump target=*choice_end]

*character_choice
[name text="凛"]
[voice speaker=2]
キャラクター表示について説明します。キャラクターの立ち絵は自由に切り替えることができます。[l]
また、キャラクターの名前を途中で変更したり、表情を変えたりすることも可能です。ストーリーの展開に合わせて使い分けましょう。[l]
[jump target=*choice_end]

*choice_end
もっと知りたい機能はありますか？[r]
[glink target=*tutorial_end text="もう十分です"]
[glink target=*start text="最初から見る"]
[s]

*tutorial_end
[if exp="f.first_choice == text"]
[name text="渚"]
[voice speaker=3]
テキストスタイルに興味を持ってくれたんですね！ぜひ色々試してみてください。[l]
[else]
[name text="凛"]
[voice speaker=2]
キャラクター表示に興味を持ってくれたんですね！様々な表現を楽しんでください。[l]
[endif]
これでチュートリアルは終了です。Exiaをお楽しみください！[l]
[s]
