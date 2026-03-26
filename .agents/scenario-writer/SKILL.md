---
name: scenerio-writer
description: 鏡裕之流「ゼロ人称」と「因数分解」を用いた、100ウィンドウ超の構成を厭わない、鏡裕之流「実況中継的」超長大シナリオ生成。
---

# Scenerio Writer Skill (Ver. 2.0)

このスキルは、プレイヤーと主人公を同化させる「ゼロ人称」視点を用い、1つの性的・心理的動作を極限まで分解（因数分解）して描写することで、圧倒的な没入感と「焦らし」を内包したJSONデータを生成します。

## 1. 核心原理：描写の「完全同期」
- **非要約原則**: 1つのレスポンスでシーンの開始から終了までを「要約」することを厳禁とする。
- **100ウィンドウ・マインドセット**: 
    - ユーザーの1回の指示に対し、**最小100〜最大120のScenarioLine配列**を生成せよ。
    	- **注意: JSON全体ではなく、配列の数で数えること。**
    - 「乳房を吸う」「腰を動かす」といった個別のフェーズだけで20〜30ウィンドウを費やすこと。
    - 動作の完了ではなく、動作の「継続中」の官能を1ページずつめくるように記述せよ。

## 2. 核心理論：ゼロ人称と「体験の停滞」
- **ゼロ人称の遵守**: 主人公はプレイヤーの「透明なレンズ」です。三人称客観（神の視点）を排し、肌に伝わる熱、粘度、匂い、および卑俗な独白（カッコ書きモノローグ）のみで構成してください。
- **時間の引き延ばし（アンチ・スピードラン）**: 1レスポンスで事象を完結させず、その瞬間に「留まる」描写を徹底してください。

## 3. 執筆アルゴリズム：高密度・長大出力
1つのレスポンスで以下の密度を維持してください。

### A. 動作の「因数分解」ノルマ
1つの主要アクション（例：服を脱がせる、口に含む、挿入する）に対し、**最低100個以上の`ScenarioLine`**を費やしてください。以下の3フェーズをループさせ、時間を引き延ばします。
1. **予兆と対峙**: 対象を見つめる、期待と恐怖、(……生唾を呑む)。
2. **微細な接触**: 先端が触れる、皮膚の摩擦、温度の変化、[SOUND]の発生。
3. **沈み込みと反応**: 異物感の受容、表情の崩壊[CG]、理性の喪失、[VOICE]による喘ぎ。

### B. 描写の「二重奏」と「接写」
- **比喩の二重化**: 1つの感覚に対し、「熱く、それでいて内側から弾けるような」といった重層的な形容を必ず行います。
- **超接写**: 常にカメラを性的部位（粘膜、毛穴、体液の糸）から離さず、背景描写を捨てて肉体のディテールに集中してください。

### C. 「鏡流」長大化ロジック
LLMの圧縮本能を排除するため、以下の「水増し（ポジティブな冗長性）」を強制する。

- **応答のピンポン（Dialogue ↔ Dialogue）**: 
    - [主人公]と[ヒロイン]の短いやり取りを交互に発生させ、会話だけで20ウィンドウ以上を稼ぐこと。
- **状態の反芻（State Ruminating）**: 
    - 「気持ちいい」という事実に対し、「どこが」「どう」「どれくらい」気持ちいいのかを、キャラの台詞、主人公の独白、ナレーションの3方向から、角度を変えて3回以上繰り返せ。

### D. 鏡裕之流・特殊記号とリズム
- **絶頂の「タメ」と「余韻」**: 
    - 「イク！！」の直前に、呼吸が止まるような沈黙（……）や、筋肉の強張りだけで10ウィンドウ以上停滞せよ。
    - 射精・絶頂の瞬間（●フェードアウト等）の後、さらに20ウィンドウ以上の「賢者タイム描写/事後愛撫」を継続せよ。

## 4. テクニカルマッピング（演出タグの変換）

| 演出要素 | JSONマッピング | 執筆ルール |
| :--- | :--- | :--- |
| **主観独白** | `type: 0` の `text` | `（……早く、めちゃくちゃにしてやりたい）` 等の卑俗な本音。 |
| **感触描写** | `type: 0` の `text` | 視覚を除いた、熱・粘度・脈動・匂いに特化した描写。 |
| **キャラ台詞** | `type: 1` の `text` | 鏡流記号（……、っ、！、！！）を用いた段階的な喘ぎ。 |
| **視覚演出** | `cutIn.imageFile` | `cg_laura_shame_closeup.png` 等、アングルを具体的に指定。 |
| **聴覚演出** | `voice`, `bgmFile` | `v_laura_001.mp3` または `text` 内での湿った音描写。 |

## 4. 進行と文字数制約
- **出力ボリューム**: 1レスポンスの`lines`配列は、**合計70〜100要素**を目指してください。
- **足踏み描写**: 行為を進めず、現在の快感に浸るだけの「静止ウィンドウ」を意図的に3つ以上挿入してください。
- **NG**: 安易な合意形成（「いいよ」「しよう」）を避け、なし崩し的に理性が壊れる過程を重視してください。

## Scenerio Review
ゲームシナリオのJSONファイルを生成後、`resources/review.md`を読み込み、ゲームシナリオのレビューを行ってください。

## JSON Schema Reference

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Scenario",
  "type": "object",
  "required": ["id", "currentLineIndex", "lines", "logs"],
  "properties": {
    "id": { "type": "string" },
    "bgmFile": { "type": "string" },
    "backgroundFile": { "type": "string" },
    "currentLineIndex": { "type": "integer" },
    "characters": {
      "type": "array",
      "items": { "$ref": "#/definitions/ScenarioCharacter" },
      "description": "キャラクターの立ち絵を作るのに使う"
    },
    "lines": {
      "type": "array",
      "items": { "$ref": "#/definitions/ScenarioLine" }
    },
    "currentLine": { "$ref": "#/definitions/ScenarioLine" },
    "currentCharacterIndex": { "type": "integer" },
    "logs": {
      "type": "array",
      "items": { "$ref": "#/definitions/ScenarioLogEntry" }
    }
  },
  "definitions": {
    "ScenarioCharacter": {
      "type": "object",
      "required": ["index", "name", "imageFile", "isShow"],
      "properties": {
        "index": { "type": "integer" },
        "name": { "type": "string" },
        "imageFile": { "type": "string" },
        "animation": { "type": "string" },
        "speakerId": { "type": "integer" },
        "isShow": { "type": "boolean" }
      }
    },
    "FlagValue": {
      "anyOf": [
        { "type": "boolean" },
        { "type": "number" },
        { "type": "string" }
      ]
    },
    "ScenarioCondition": {
      "type": "object",
      "required": ["flag", "then"],
      "properties": {
        "flag": { "type": "string" },
        "equals": { "$ref": "#/definitions/FlagValue" },
        "gt": { "type": "number" },
        "lt": { "type": "number" },
        "then": { "type": "string" },
        "else": { "type": "string" }
      }
    },
    "ScenarioLineCharacter": {
      "type": "object",
      "properties": {
        "index": { "type": "integer" },
        "name": { "type": "string" },
        "imageFile": { "type": "string" },
        "animation": { "type": "string" },
        "isShow": { "type": "boolean" },
        "speakerId": { "type": "integer" }
      },
      "description": "キャラクターの立ち絵を作るのに使う"
    },
    "ScenarioCutIn": {
      "type": "object",
      "required": ["imageFile"],
      "properties": {
        "imageFile": { "type": "string" },
        "isFullScreen": {
          "type": "boolean",
          "description": "カットイン画像をフルスクリーンで出すかどうか。一般的にフルスクリーンの画像は16:9の比率で作られている。フルスクリーンでない場合は1:1サイズで画面の真ん中に補足的に表示して使われる"
        }
      }
    },
    "ScenarioChoice": {
      "type": "object",
      "required": ["text", "jumpTo"],
      "properties": {
        "text": { "type": "string" },
        "jumpTo": { "type": "string" }
      }
    },
    "ScenarioLine": {
      "oneOf": [
        {
          "title": "NarrationLine",
          "type": "object",
          "required": ["type", "text"],
          "properties": {
            "id": { "type": "string" },
            "type": { "const": 0 },
            "text": { "type": "string" },
            "character": { "$ref": "#/definitions/ScenarioLineCharacter" },
            "cutIn": { "$ref": "#/definitions/ScenarioCutIn" },
            "backgroundFile": { "type": "string" },
            "jumpTo": { "type": "string" },
            "if": { "$ref": "#/definitions/ScenarioCondition" },
            "voice": { "type": "string" },
            "bgmFile": { "type": "string" }
          }
        },
        {
          "title": "DialogueLine",
          "type": "object",
          "required": ["type", "text"],
          "properties": {
            "id": { "type": "string" },
            "type": { "const": 1 },
            "text": { "type": "string" },
            "character": { "$ref": "#/definitions/ScenarioLineCharacter" },
            "cutIn": { "$ref": "#/definitions/ScenarioCutIn" },
            "backgroundFile": { "type": "string" },
            "jumpTo": { "type": "string" },
            "if": { "$ref": "#/definitions/ScenarioCondition" },
            "voice": { "type": "string" },
            "bgmFile": { "type": "string" }
          }
        },
        {
          "title": "ChoiceLine",
          "type": "object",
          "required": ["type", "text", "choices"],
          "properties": {
            "id": { "type": "string" },
            "type": { "const": 2 },
            "text": { "type": "string" },
            "choices": {
              "type": "array",
              "items": { "$ref": "#/definitions/ScenarioChoice" }
            }
          }
        },
        {
          "title": "FlagLine",
          "type": "object",
          "required": ["type", "set"],
          "properties": {
            "id": { "type": "string" },
            "type": { "const": "flag" },
            "set": {
              "type": "object",
              "additionalProperties": { "$ref": "#/definitions/FlagValue" }
            }
          }
        },
        {
          "title": "JumpLine",
          "type": "object",
          "required": ["type", "to"],
          "properties": {
            "id": { "type": "string" },
            "type": { "const": "jump" },
            "to": { "type": "string" },
            "keepState": { "type": "boolean" }
          }
        }
      ]
    },
    "ScenarioLogEntry": {
      "allOf": [
        {
          "oneOf": [
            { "required": ["type"], "properties": { "type": { "const": 0 } } },
            { "required": ["type"], "properties": { "type": { "const": 1 } } },
            { "required": ["type"], "properties": { "type": { "const": 2 } } }
          ]
        },
        { "$ref": "#/definitions/ScenarioLine" },
        {
          "type": "object",
          "properties": {
            "character": {
              "type": "object",
              "required": ["index", "name", "imageFile"],
              "properties": {
                "index": { "type": "integer" },
                "name": { "type": "string" },
                "imageFile": { "type": "string" }
              }
            }
          }
        }
      ]
    }
  }
}
```

## 出力例

```
{
  "id": "scenario_001",
  "currentLineIndex": 0,
  "lines": [
    {
      "type": 0,
      "text": "熱い、それでいて内側から弾けるような、彼女の体温が指先を伝ってくる……。",
      "cutIn": {
        "imageFile": "cg_laura_closeup_01.png",
        "isFullScreen": false
      }
    },
    {
      "type": 1,
      "text": "「あ……、あ、ぁ…………っ」",
      "character": {
        "name": "ライラ",
        "imageFile": "ch_laura_shame.png",
        "isShow": true
      },
      "voice": "v_laura_001.mp3"
    }
    // ... 続く
  ],
  "logs": []
}
```