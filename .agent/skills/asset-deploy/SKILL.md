---
name: asset-deploy
description: ローカルのアセットディレクトリをXP3形式にパックし、Firebase StorageへアップロードしてFirestoreにパックメタデータと個別アセットサブコレクションを登録する。
---

# Asset Deploy Skill

このスキルは、ローカルのアセットディレクトリをXP3パックファイルに変換し、Firebase StorageおよびFirestoreへデプロイします。ゲームクライアントの `AssetManager` が参照できる状態にするまでの全工程を担います。

## 役割の定義

- **インベントリ収集**: ソースディレクトリを走査してアセットの一覧を確認する
- **XP3パッキング**: `scripts/pack_xp3.py` を使ってXP3アーカイブを作成する
- **MD5計算**: アップロード前にXP3ファイルのMD5ハッシュを取得する
- **Firebase デプロイ**: `scripts/deploy_pack.js` を使ってStorage + Firestoreを更新する
- **検証と報告**: デプロイ結果をまとめてユーザーに提示する

---

## 前提条件の確認

> **STOP**: Phase 1 に進む前に、以下の前提条件がすべて満たされていることを確認すること。不足があればユーザーに通知して対処を求める。

### 必須ツール

| ツール | 確認コマンド | 最低バージョン |
|--------|-------------|-------------|
| Python 3 | `python3 --version` | 3.8以上 |
| Node.js | `node --version` | 18以上 |
| firebase-admin | `node -e "require('firebase-admin')"` | インストール済みであること |

firebase-admin が未インストールの場合はユーザーに以下を実行させる:

```
npm install firebase-admin --save-dev
```

### 必須ファイル

| ファイル | 場所 | 取得方法 |
|---------|------|---------|
| サービスアカウントJSON | `.firebase-service-account.json`（リポジトリルート） | Firebase Console → プロジェクト設定 → サービスアカウント → 「新しい秘密鍵の生成」でダウンロードし、リポジトリルートに配置する |
| 環境変数ファイル | `.env`（リポジトリルート） | `.env.example` をコピーして `VITE_FIREBASE_STORAGE_BUCKET` を設定する |

`.firebase-service-account.json` が `.gitignore` に含まれていることを確認する。含まれていない場合はユーザーに追記を求める:

```
# .gitignore に追記
.firebase-service-account.json
```

---

## Inputs（ユーザーへのヒアリング）

デプロイ前に以下の情報をユーザーから収集する。**全項目が揃うまで Phase 1 に進まない。**

| 項目 | 説明 | 例 |
|------|------|-----|
| **ソースディレクトリ** | パックするアセットが格納されているディレクトリパス | `public/images/bgimage` |
| **パックID** | Firestore ドキュメントID（英数字・ハイフン・アンダースコアのみ） | `chapter1-bg` |
| **パック名** | Firestore に保存する人間可読な名前 | `Chapter 1 Backgrounds` |
| **バージョン** | セマンティックバージョン文字列 | `1.0.0` |
| **必要ロール** | `free` または `premium` | `free` |
| **出力XP3パス** | パック先のXP3ファイルパス | `scripts/output/{pack_id}.xp3` |

収集した情報を以下の形式でユーザーに提示し、承認を得る:

```
以下の設定でデプロイを実行します。問題なければ「OK」と返答してください。

【ソースディレクトリ】: {source_dir}
【パックID】: {pack_id}
【パック名】: {pack_name}
【バージョン】: {version}
【必要ロール】: {role}
【出力XP3】: {xp3_path}
```

> **「OK」の確認が取れるまで Phase 1 に進まない。**

---

## Phase 1: アセットインベントリ

ソースディレクトリ内のファイルを列挙し、パック対象を確認する。

### 1-1. ファイル一覧の取得

```bash
find {source_dir} -type f | sort
```

ファイル数と概算サイズをユーザーに提示する。

### 1-2. インベントリ確認ゲート

ユーザーに以下を提示して確認を求める:

```
【インベントリ確認】
ディレクトリ: {source_dir}
ファイル数: {N} 件
合計サイズ: {size} MB（概算）

上記のファイル群をXP3にパックします。続行しますか？ (yes/no)
```

> ユーザーから `yes` が得られるまで Phase 2 に進まない。

---

## Phase 2: XP3パッキング

### 2-1. 出力ディレクトリの作成

```bash
mkdir -p {xp3_output_dir}
```

### 2-2. パックの実行

```bash
python3 scripts/pack_xp3.py {source_dir} {xp3_path} > {xp3_path}.manifest.json
```

- **stdout**: JSON配列（マニフェスト）— `{xp3_path}.manifest.json` に保存
- **stderr**: 進捗とサイズ情報 — ユーザーに表示

### 2-3. 完了確認

```bash
ls -lh {xp3_path}
```

ファイルが存在しサイズが 0 より大きいことを確認する。

---

## Phase 3: MD5計算

Rustクライアント（`asset_commands.rs`）はダウンロード後にMD5を検証するため、XP3ファイルのMD5ハッシュを事前に計算してFirestoreに記録する。

```bash
python3 -c "import hashlib; print(hashlib.md5(open('{xp3_path}','rb').read()).hexdigest())"
```

出力されたハッシュ文字列（小文字16進数）を記録する。

---

## Phase 4: Firebase デプロイ

### 4-1. デプロイ前最終確認

```
【デプロイ前確認】
XP3ファイル: {xp3_path}
Storage 保存先: packs/{uuid}.xp3（UUIDはスクリプトが自動生成）
Firestore パック: /packs/{pack_id}
アセット件数: {N} 件
MD5: {md5_hash}

Firebase にデプロイします。続行しますか？ (yes/no)
```

### 4-2. デプロイ実行

```bash
node scripts/deploy_pack.js \
  --xp3 {xp3_path} \
  --packId {pack_id} \
  --name "{pack_name}" \
  --version {version} \
  --role {role} \
  --md5 {md5_hash} \
  --manifest {xp3_path}.manifest.json
```

スクリプトが実行すること:
1. XP3ファイルを Firebase Storage の `packs/{uuid}.xp3` にアップロード
2. Firestore `/packs/{pack_id}` ドキュメントを作成
3. Firestore `/packs/{pack_id}/assets/{assetId}` サブコレクションをバッチ書き込み

### 4-3. エラー対応

| エラー内容 | 対処 |
|-----------|------|
| `ENOENT: .firebase-service-account.json` | サービスアカウントJSONが未配置。前提条件セクションを参照 |
| `VITE_FIREBASE_STORAGE_BUCKET not set` | `.env` に `VITE_FIREBASE_STORAGE_BUCKET` が未設定 |
| `PERMISSION_DENIED` | サービスアカウントにStorage/Firestoreの書き込み権限がない。Firebase Consoleでロールを確認する |
| MD5 mismatch | `--md5` 引数を再計算して渡し直す |

---

## Phase 5: 検証とサマリーレポート

### 5-1. 確認案内

Firebase Console で以下を確認するようユーザーに案内する:

- **Firestore**: `/packs/{pack_id}` ドキュメントと `/packs/{pack_id}/assets/` サブコレクションが存在するか
- **Storage**: `packs/` フォルダに XP3 ファイルが存在するか

### 5-2. サマリーレポート

```
【デプロイ完了レポート】

パックID: {pack_id}
パック名: {pack_name}
バージョン: {version}
必要ロール: {role}

Storage 保存先: packs/{uuid}.xp3
Firestore ドキュメント: /packs/{pack_id}
アセット登録数: {N} 件
MD5: {md5_hash}
XP3 ファイルサイズ: {size} MB

【登録アセット一覧（先頭20件）】
- {assetId_1}  →  assets/{pack_id}/{rel_path_1}
...

デプロイが完了しました。ゲームクライアントの AssetManager が
checkUpdates() を呼び出した際にこのパックが検出されます。
```

---

## Workspace 構造

```
scripts/
  pack_xp3.py              ← XP3パッカー（Pythonスクリプト）
  deploy_pack.js           ← Firebase デプロイスクリプト（Node.js）
  output/                  ← gitignored
    {pack_id}.xp3
    {pack_id}.xp3.manifest.json
```

`scripts/output/` を `.gitignore` に追加すること。XP3ファイルはバイナリかつ大サイズになるため、Git管理に適さない。
