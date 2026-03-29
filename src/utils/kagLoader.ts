// src/utils/kagLoader.ts
import { invoke } from '@tauri-apps/api/core'
import { KAGInterpreter } from '@/utils/kagInterpreter'
import type { KagToken, FlagValue } from '@/types/kag'

export async function loadKAGScenario(
  filePath: string,
  flags?: Record<string, FlagValue>
): Promise<KAGInterpreter> {
  const res = await fetch(`/${filePath}.ks`)
  if (!res.ok) throw new Error(`Failed to load ${filePath}.ks: ${res.status}`)
  const content = await res.text()
  const tokens: KagToken[] = await invoke('parse_kag_text', { content })
  return new KAGInterpreter(tokens, flags)
}

export async function loadKAGTokens(filePath: string): Promise<KagToken[]> {
  const res = await fetch(`/${filePath}.ks`)
  if (!res.ok) throw new Error(`Failed to load ${filePath}.ks: ${res.status}`)
  const content = await res.text()
  return invoke('parse_kag_text', { content })
}
