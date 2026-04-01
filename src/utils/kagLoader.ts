// src/utils/kagLoader.ts
import { invoke } from '@tauri-apps/api/core'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import type { KagToken, FlagValue } from '@/types/kag'
import { assetManager } from '@/utils/assetManager'

function resolveKAGUrl(filePath: string): string {
  // filePath is e.g. "scenarios/main" — asset ID is just the filename
  const fileName = filePath.split('/').pop() ?? filePath
  return assetManager.resolve(`${fileName}.ks`, 'scenarios')
}

export async function loadKAGScenario(
  filePath: string,
  flags?: Record<string, FlagValue>
): Promise<KAGInterpreter> {
  const url = resolveKAGUrl(filePath)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${filePath}.ks: ${res.status}`)
  const content = await res.text()
  const tokens: KagToken[] = await invoke('parse_kag_text', { content })
  return new KAGInterpreter(tokens, flags)
}

export async function loadKAGTokens(filePath: string): Promise<KagToken[]> {
  const url = resolveKAGUrl(filePath)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${filePath}.ks: ${res.status}`)
  const content = await res.text()
  return invoke('parse_kag_text', { content })
}
