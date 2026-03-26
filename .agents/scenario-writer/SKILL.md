---
name: scenerio-writer
description: 没入感の高いゲームシナリオJSONを生成します。
---

# Scenerio Writer Skill

このスキルは、プレイヤーと主人公を同化させる「ゼロ人称」の描写と、1つの動作を極限まで分解する描写手法を用いて、指定されたJSON Schemaに準拠したゲームスクリプトを生成します。

## When to use this skill

- ゲームの物語（特に心理描写や感覚描写が重視されるシーン）を構築する時。
- ユーザーの短い指示から、リッチで「焦らし」の効いたシナリオデータを作成したい時。
- Antigravityプラットフォーム向けの実行用JSONファイルが必要な時。

## How to use it

以下の原則を遵守してJSONを生成してください。

### 1. ゼロ人称と「体験の停滞」
- **視点の固定**: 主人公を客観視する表現を禁止します。「俺は～と思った」ではなく、直接的な感覚（肌の熱、匂い、卑俗な欲望）のみを記述してください。
- **因数分解**: 動作（例：ドアを開ける、手に触れる）を1ターンで終わらせず、[静止と対峙] [接触の先端] [沈み込み/完了] の3段階以上に分けて`lines`配列を生成してください。

### 2. 文章作法（マイクロ・パルス制御）
- **リズム**: 1行を短くし、読点「、」を多用してください。
- **記号の段階**: 序盤は`……`、中盤は`っ`、`、`、最高潮では`！`を適切に配置してください。
- **形容の二重奏**: 1つの感覚に対し、「熱く、それでいて内側から弾けるような」といった2重の比喩を必ず用いてください。

### 3. テクニカルマッピング (JSON Schema対応)
出力は必ず `$schema` を含み、以下のマッピングルールに従ってください。

| 演出内容 | JSON構造 |
| :--- | :--- |
| **地の文（触覚・嗅覚・内面）** | `type: 0` (NarrationLine) の `text` に記述。 |
| **キャラのセリフと喘ぎ** | `type: 1` (DialogueLine) の `text` に記述。 |
| **[VOICE キャラ名]** | `DialogueLine` 内の `character.name` と `voice` プロパティ(ファイル名想定)に反映。 |
| **[CG (部位/表情)]** | `cutIn` オブジェクトの `imageFile` に具体的なアングルや表情を反映。 |
| **[SOUND]** | `bgmFile` プロパティ、または `text` 内の環境音描写として反映。 |

### 4. 制約事項
- ユーザーからの指示がない限り、勝手にフェーズ（場面）を進行させないでください。
- 出力は純粋なJSONのみとし、前後の挨拶や解説は一切不要です。

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
      "items": { "$ref": "#/definitions/ScenarioCharacter" }
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
      }
    },
    "ScenarioCutIn": {
      "type": "object",
      "required": ["imageFile"],
      "properties": {
        "imageFile": { "type": "string" },
        "isFullScreen": { "type": "boolean" }
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