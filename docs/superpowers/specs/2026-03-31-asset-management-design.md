# アセット管理システム 設計ドキュメント

**日付**: 2026-03-31
**ブランチ**: asset-management
**ステータス**: 承認済み

---

## 概要

現在KAGスクリプトおよびコンポーネントにハードコードされているファイルパスを、IDベースのアセット管理システムに置き換える。Firebase Storage・Firestore・Firebase Authenticationを用いて、ソシャゲ型のオンラインコンテンツアップデートとユーザーアカウント管理を実現する。

---

## 背景・現状の問題

- `KAGLayer.file`、`bgmFile`、`seFiles`、`voiceFile` 等にファイル名が直接格納されている
- 各コンポーネントがパスプレフィックスをハードコード（例: `/images/bgimage/${file}`、`/sounds/bgm/${bgmFile}`）
- アセットは `public/` にバンドルされており、リリース後の追加・更新ができない
- 同じファイル（例: `black.png`）でも呼び出し元によってパスが異なりうる

---

## 設計方針

- KAGスクリプト・KAGInterpreter・型定義は**変更しない**
- `storage=` パラメータの値（ファイル名）をそのままアセットIDとして使用
- コンポーネント側のパスプレフィックスを `AssetManager.resolve()` に差し替えるだけ
- ダウンロードアセットは Tauri の `app_data_dir()` 以下に保存し、`convertFileSrc()` でURL化
- アプリ起動には**強制サインイン**が必要（未サインインではゲーム不可）

---

## 全体アーキテクチャ

```
Firebase (バックエンド)
├── Authentication   ← アカウント管理・セーブデータ同期のID基盤
├── Firestore        ← パック情報、アセットマニフェスト、ユーザーデータ
└── Storage          ← 圧縮パックファイル（UUIDで管理）

Tauri App (フロントエンド)
├── AssetManager     ← ID解決 / DL管理 / キャッシュ管理
├── AppData/Roaming/com.exia.app/
│   ├── manifest.json   ← ローカルキャッシュ（app_data_dir() からの相対パスで記録）
│   └── assets/         ← ダウンロード済みアセット実体
└── KAG Engine       ← storage=xxx を AssetManager 経由で解決
```

**AppDataパス例（Windows）**:
`C:\Users\{user}\AppData\Roaming\com.exia.app\`

---

## データモデル

### Firebase Storage

```
packs/
└── {uuid}.{ext}   ← UUIDで管理された圧縮パック（zip/XP3等、形式はTBD）
```

### Firestore

```
/packs/{packId}
  - storageRef: string        // "packs/550e8400-e29b-41d4-a716-446655440000.zip"
  - version: string           // "1.2.0"
  - name: string              // 表示名
  - requiredRole: string      // "free" | "premium" など
  - releaseDate: timestamp

  /packs/{packId}/assets/{assetId}   ← サブコレクション
    - extractedPath: string   // "images/bgimage/bg_school.webp"
    // ドキュメントIDがアセットID（"bg_school" 等）と一致

/users/{uid}
  - roles: string[]           // ["free", "premium"]
  - downloadedPacks: string[] // 参考情報（表示用、権限の正源はroles）
  - createdAt: timestamp

/saves/{uid}/slots/{slotId}
  - scenarioFile: string
  - flags: Record<string, FlagValue>
  - savedAt: timestamp
```

**アクセス制御ロジック**: パックの `requiredRole` に対して、ユーザーの `roles` 配列が `hasAny([requiredRole])` を満たすかで判定。Firestore Security Rules および Storage Rules に同ロジックを実装する。

`downloadedPacks` は表示・統計用の参考情報であり、DL権限の正源は `roles` とする（マルチデバイスでの競合を避けるため）。

### ローカル manifest.json

manifest.json のパスはすべて **`app_data_dir()` からの相対パス**。`AssetManager.resolve()` が実行時に `app_data_dir()` を取得して絶対パスに変換してから `convertFileSrc()` に渡す。

```json
{
  "schemaVersion": 1,
  "lastChecked": "2026-03-31T00:00:00Z",
  "packs": {
    "pack_001": { "version": "1.2.0", "downloadedAt": "2026-03-31T00:00:00Z" }
  },
  "assets": {
    "bg_school":      "assets/pack_001/images/bgimage/bg_school.webp",
    "black.png":      "assets/pack_001/images/black.png",
    "bgm_main.ogg":   "assets/pack_001/sounds/bgm/main_theme.ogg",
    "se_click.ogg":   "assets/pack_001/sounds/se/click.ogg",
    "v001_001.ogg":   "assets/pack_001/sounds/voices/v001_001.ogg"
  }
}
```

`schemaVersion` のマイグレーションは本フェーズのスコープ外とする（将来バージョンで対応）。

---

## AssetManager

`src/utils/assetManager.ts` にシングルトンとして実装する。

```ts
class AssetManager {
  // アプリ起動時に以下を実行する（同期アクセスのため必須）:
  // 1. app_data_dir() を取得してインスタンス変数にキャッシュ
  // 2. manifest.json を読み込んでインメモリMapに展開
  async initialize(): Promise<void>

  // アセットIDをWebView用URLに解決する（同期・高速）
  // manifest にあれば convertFileSrc(app_data_dir() + 相対パス)
  // なければ public/ へのfallback URL（/images/bgimage/ 等）
  resolve(assetId: string): string

  // Firestoreと比較して未DLまたは更新あるパック一覧を返す
  async checkUpdates(): Promise<Pack[]>

  // 指定パックをFirebase StorageからDL→解凍→manifest更新
  async downloadPack(packId: string, onProgress?: (pct: number) => void): Promise<void>
}

export const assetManager = new AssetManager()
```

**重要**: `resolve()` は同期関数。KAGのレンダリングサイクル（Three.js `useTexture()` 含む）から呼ばれるため、アプリ起動時の `initialize()` でマニフェストと `app_data_dir()` の両方を完全にメモリへロードしておく必要がある。`app_data_dir()` はTauriの非同期APIのため、`initialize()` 内でキャッシュし、`resolve()` はそのキャッシュ値を使う。

**アセットID設計の利点**: `black.png` は foreground/background/キャラクターのいずれで使われても、常に同一ファイルに解決される。

---

## コンポーネント変更箇所

KAGスクリプト・KAGInterpreter・型定義は**変更しない**。

| ファイル | 変更前 | 変更後 |
|---|---|---|
| `Background3D.tsx` | `` `/images/bgimage/${file}` `` | `assetManager.resolve(file)` |
| `ForegroundLayer.tsx` | `` `/images/${imageDir}/${file}` `` | `assetManager.resolve(file)` |
| `Bgm/index.tsx` | `` `/sounds/bgm/${bgmFile}` `` | `assetManager.resolve(bgmFile)` |
| `Se/index.tsx` | `` `/sounds/se/${channel.file}` `` | `assetManager.resolve(channel.file)` |
| `Voice/index.tsx` | `` `/sounds/voices/${voiceFile}` `` | `assetManager.resolve(voiceFile)` |
| `ClickableMap/index.tsx` | `fetch()` / `new Image()` でパスを直接構築 | `assetManager.resolve(id)` |

**`ForegroundLayer.tsx` の注意点**: 現在 `layer.id >= 3` かどうかで `/images/image/` と `/images/fgimage/` を切り替えているが、AssetManager 導入後はIDからパスが一意に決まるためこの分岐は不要になる。

---

## Tauriプラグイン要件

以下のプラグインを `Cargo.toml` と `capabilities/default.json` に追加する必要がある。

| プラグイン | 用途 |
|---|---|
| `tauri-plugin-fs` | `app_data_dir()` の取得・AppDataへのファイル書き込み |
| `tauri-plugin-http` | Firebase StorageからのパックDL（Rust側で実装する場合）|
| `tauri-plugin-store` | セーブデータのローカル永続化 |

DLをJS側のFirebase SDK経由で行う場合は `tauri-plugin-http` は不要。解凍処理はRust側で行うため `tauri-plugin-fs` は必須。

---

## ダウンロードフロー

```
起動時 or 手動チェック
  → Firestoreからパック一覧取得（requiredRole確認）
  → ローカルmanifest.jsonと比較
  → 未DLまたは更新ありのパックをリストアップ
  → ユーザーへ通知・DL開始
  → Firebase StorageからUUID.{ext}をDL（進捗表示）
  → AppData/assets/{packId}/ に解凍
  → manifest.jsonのpacksとassetsを更新
  → AssetManagerのインメモリキャッシュを更新
```

---

## 認証・認可

### 起動時フロー（強制サインイン）

```
アプリ起動
  → AssetManager.initialize()（manifest.jsonをメモリロード）
  → Firebase Auth トークン確認
  → 未サインイン → サインイン画面（ゲームプレイ不可）
  → サインイン済み → Firestoreからユーザーロール取得
      → ロールに応じてダウンロード可能パック一覧を表示
      → メイン画面へ
```

### アクセス制御

- **Firebase Storage Rules**: 認証済みかつ `requiredRole` を持つユーザーのみDL可
- **Firestore Rules**: `/users/{uid}` と `/saves/{uid}` は本人のみ読み書き可、`/packs` は認証済みユーザー全員が読み取り可

### セーブデータ同期

- ローカル保存（`tauri-plugin-store`）を主、Firestoreを副（クラウドバックアップ）
- サインイン時に最新スロットをFirestoreと同期

### トークン管理

- Firebase Auth JS SDK をWebView内で使用
- トークンはFirebase SDKが自動管理（Tauri secure storage不要）

---

## アーカイブ形式

**XP3**（吉里吉里ネイティブ形式）を採用する。フォーマットの実装詳細は `krkrz/base/XP3Archive.cpp` を参照。解凍処理はTauriバックエンド（Rust）側で行い、AppDataへ展開する。

## チェックサム

**MD5** でパックファイルの整合性を検証する。Firestoreのパックドキュメントに `md5: string` を追加し、DL後に照合する。

## 部分更新

スコープ外。パック単位での追加・差し替えのみ対応する。

---

## 未解決事項

- `schemaVersion` マイグレーション戦略（本フェーズはスコープ外）
