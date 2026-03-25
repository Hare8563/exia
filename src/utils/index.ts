import { ScenarioLine } from '@/types'

export const getCurrentCharacterIndex = (lines: ScenarioLine[], currentLineIndex: number): number => {
  const line = lines[currentLineIndex]
  if (!line) return -1
  if (line.type === 'flag' || line.type === 'jump' || line.type === 2) return -1
  if (line.character === undefined) return -1
  return line.character.index
}
