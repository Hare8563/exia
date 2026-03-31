// src/utils/assetManager.ts
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import type { AssetManifest, FirestorePack } from '@/types/asset'
import { collection, getDocs } from 'firebase/firestore'
import { getDownloadURL, ref } from 'firebase/storage'
import { db, storage } from '@/firebase'

export class AssetManager {
  private appDataDir: string | null = null
  private assets = new Map<string, string>()         // assetId → relative path
  private packsCache: Record<string, { version: string; downloadedAt: string }> = {}
  private initialized = false

  async initialize(): Promise<void> {
    this.appDataDir = await invoke<string>('asset_app_data_dir')
    const raw = await invoke<string | null>('asset_read_manifest')
    if (raw) {
      const manifest: AssetManifest = JSON.parse(raw)
      this.packsCache = { ...manifest.packs }
      for (const [id, path] of Object.entries(manifest.assets)) {
        this.assets.set(id, path)
      }
    }
    this.initialized = true
  }

  // Resolve asset ID to WebView URL (synchronous — must be fast)
  // Returns asset:// URL if in manifest, else falls back to public/ path
  resolve(assetId: string, fallbackCategory = ''): string {
    if (!this.initialized) throw new Error('AssetManager not initialized')
    const relative = this.assets.get(assetId)
    if (relative && this.appDataDir) {
      const abs = `${this.appDataDir}/${relative}`.replace(/\\/g, '/')
      return convertFileSrc(abs)
    }
    return fallbackCategory ? `/${fallbackCategory}/${assetId}` : `/${assetId}`
  }

  // Firebase integration — stubbed until Task 9
  async checkUpdates(userRoles: string[]): Promise<FirestorePack[]> {
    const snapshot = await getDocs(collection(db, 'packs'))
    const updates: FirestorePack[] = []

    for (const docSnap of snapshot.docs) {
      const pack = { id: docSnap.id, ...docSnap.data() } as FirestorePack
      if (!userRoles.includes(pack.requiredRole)) continue
      const local = this.packsCache[pack.id]
      if (!local || local.version !== pack.version) {
        updates.push(pack)
      }
    }
    return updates
  }

  async downloadPack(
    pack: FirestorePack,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    onProgress?.(5)

    // 1. Get download URL from Firebase Storage
    const packRef = ref(storage, pack.storageRef)
    const url = await getDownloadURL(packRef)

    onProgress?.(10)

    // 2. Rust sync command: download, MD5 verify, XP3 extract
    const extracted = await invoke<{ id: string; extracted_path: string }[]>(
      'asset_download_and_extract',
      { url, packId: pack.id, expectedMd5: pack.md5 },
    )

    onProgress?.(80)

    // 3. Update manifest (merge, preserve existing packs)
    const newAssets: Record<string, string> = {}
    for (const entry of extracted) {
      newAssets[entry.id] = entry.extracted_path
    }
    await this.applyPackToManifest(pack.id, pack.version, newAssets)

    onProgress?.(100)
  }

  // Update in-memory cache and manifest.json after a pack download
  // Merges with existing packs (multi-pack support)
  async applyPackToManifest(
    packId: string,
    version: string,
    newAssets: Record<string, string>,
  ): Promise<void> {
    this.packsCache[packId] = { version, downloadedAt: new Date().toISOString() }
    for (const [id, path] of Object.entries(newAssets)) {
      this.assets.set(id, path)
    }
    const manifest: AssetManifest = {
      schemaVersion: 1,
      lastChecked: new Date().toISOString(),
      packs: { ...this.packsCache },
      assets: Object.fromEntries(this.assets),
    }
    await invoke('asset_write_manifest', { content: JSON.stringify(manifest, null, 2) })
  }
}

export const assetManager = new AssetManager()
