// src/tests/assetManager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Tauri API and Firebase (Firebase integration comes in Task 9)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: (path: string) => `asset://localhost/${path.replace(/\\/g, '/')}`,
}))

vi.mock('@/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}))

import { invoke } from '@tauri-apps/api/core'
import { AssetManager } from '@/utils/assetManager'

describe('AssetManager', () => {
  let manager: AssetManager

  beforeEach(() => {
    manager = new AssetManager()
    vi.clearAllMocks()
  })

  describe('initialize()', () => {
    it('loads app_data_dir and manifest into memory', async () => {
      const manifest = JSON.stringify({
        schemaVersion: 1,
        lastChecked: '2026-03-31T00:00:00Z',
        packs: { pack_001: { version: '1.0.0', downloadedAt: '2026-03-31T00:00:00Z' } },
        assets: { 'bg_school.webp': 'assets/pack_001/images/bgimage/bg_school.webp' },
      })
      vi.mocked(invoke)
        .mockResolvedValueOnce('C:/AppData/exia')  // asset_app_data_dir
        .mockResolvedValueOnce(manifest)            // asset_read_manifest
      await manager.initialize()
      // initialized without error
    })

    it('handles missing manifest.json (null) without error', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce('C:/AppData/exia')
        .mockResolvedValueOnce(null)
      await expect(manager.initialize()).resolves.not.toThrow()
    })
  })

  describe('resolve()', () => {
    beforeEach(async () => {
      const manifest = JSON.stringify({
        schemaVersion: 1,
        lastChecked: '2026-03-31T00:00:00Z',
        packs: {},
        assets: { 'bg_school.webp': 'assets/pack_001/images/bgimage/bg_school.webp' },
      })
      vi.mocked(invoke)
        .mockResolvedValueOnce('C:/AppData/exia')
        .mockResolvedValueOnce(manifest)
      await manager.initialize()
    })

    it('resolves asset in manifest to asset:// URL', () => {
      const url = manager.resolve('bg_school.webp')
      expect(url).toContain('asset://localhost/')
      expect(url).toContain('bg_school.webp')
    })

    it('falls back to public path when asset not in manifest', () => {
      const url = manager.resolve('unknown.webp', 'images/bgimage')
      expect(url).toBe('/images/bgimage/unknown.webp')
    })

    it('throws if called before initialize()', () => {
      const uninit = new AssetManager()
      expect(() => uninit.resolve('foo.webp')).toThrow('AssetManager not initialized')
    })
  })
})
