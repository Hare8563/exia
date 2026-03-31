// src/utils/assetManager.ts
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import type { AssetManifest, FirestorePack } from '@/types/asset'

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
  async checkUpdates(_userRoles: string[]): Promise<FirestorePack[]> {
    throw new Error('checkUpdates: not implemented yet')
  }

  async downloadPack(
    _pack: FirestorePack,
    _onProgress?: (pct: number) => void,
  ): Promise<void> {
    throw new Error('downloadPack: not implemented yet')
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
