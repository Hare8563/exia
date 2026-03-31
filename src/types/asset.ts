export interface PackMeta {
  version: string
  downloadedAt: string
}

export interface AssetManifest {
  schemaVersion: 1
  lastChecked: string
  packs: Record<string, PackMeta>   // packId → meta
  assets: Record<string, string>    // assetId (filename+ext) → relative path
}

// Firestore /packs/{packId} document
export interface FirestorePack {
  id: string
  storageRef: string      // "packs/uuid.xp3"
  version: string
  name: string
  requiredRole: string    // "free" | "premium"
  md5: string
}
