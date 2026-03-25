import type { Scenario } from '@/types'

/**
 * Loads a scenario JSON file from public/.
 *
 * @param filePath - Path without .json extension, e.g. "scenarios/main"
 * @returns Parsed Scenario object
 * @throws Error if fetch fails or response is not ok
 */
export async function loadScenario(filePath: string): Promise<Scenario> {
  const url = `/${filePath}.json`
  let response: Response

  try {
    response = await fetch(url)
  } catch {
    throw new Error(`[Exia] Failed to load scenario: ${filePath}.json (network error)`)
  }

  if (!response.ok) {
    throw new Error(`[Exia] Failed to load scenario: ${filePath}.json (HTTP ${response.status})`)
  }

  const data = await response.json() as Scenario
  return { ...data, logs: [] }
}
