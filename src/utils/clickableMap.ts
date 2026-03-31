export type ClickableMapAction = {
  storage?: string
  target?: string
  onenter?: string
  onleave?: string
  hint?: string
  exp?: string
  countpage?: string
  cursor?: string
  autodisable?: string
}

export type ParsedClickableMap = {
  autodisable: boolean
  actions: Record<number, ClickableMapAction>
}

function parseQuotedValue(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseActionAssignments(source: string): ClickableMapAction {
  const action: ClickableMapAction = {}
  const assignments = source.split(';')

  for (const assignment of assignments) {
    const trimmed = assignment.trim()
    if (!trimmed) continue
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue
    const key = trimmed.slice(0, equalsIndex).trim()
    const rawValue = trimmed.slice(equalsIndex + 1)
    action[key as keyof ClickableMapAction] = parseQuotedValue(rawValue)
  }

  return action
}

export function parseClickableMap(content: string): ParsedClickableMap {
  const parsed: ParsedClickableMap = {
    autodisable: true,
    actions: {},
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith(';') || line.startsWith('//') || line.startsWith('#')) continue
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const regionToken = line.slice(0, colonIndex).trim()
    const actionSource = line.slice(colonIndex + 1).trim()
    const regionId = Number(regionToken)

    if (!Number.isInteger(regionId)) continue
    if (regionId === 0) {
      const controlAction = parseActionAssignments(actionSource)
      if (controlAction.autodisable === 'false') {
        parsed.autodisable = false
      }
      continue
    }

    parsed.actions[regionId] = parseActionAssignments(actionSource)
  }

  return parsed
}

export async function fetchFirstAvailable(paths: string[]): Promise<string | null> {
  for (const path of paths) {
    const response = await fetch(path)
    if (response.ok) {
      return response.text()
    }
  }
  return null
}

export async function loadClickableMapDefinition(storage: string): Promise<ParsedClickableMap | null> {
  const normalized = storage.replace(/^\/+/, '')
  const paths = normalized.endsWith('.ma')
    ? [`/${normalized}`]
    : [`/${normalized}.ma`, `/scenarios/${normalized}.ma`]
  const content = await fetchFirstAvailable(paths)
  return content ? parseClickableMap(content) : null
}

export async function loadClickableMapImage(storage: string): Promise<HTMLImageElement | null> {
  const normalized = storage.replace(/^\/+/, '')
  const candidates = [
    `/${normalized}`,
    `/images/image/${normalized}`,
    `/images/bgimage/${normalized}`,
    `/images/fgimage/${normalized}`,
    `/${normalized}.png`,
    `/${normalized}.webp`,
    `/images/image/${normalized}.png`,
    `/images/image/${normalized}.webp`,
    `/images/bgimage/${normalized}.png`,
    `/images/bgimage/${normalized}.webp`,
  ]

  for (const src of candidates) {
    const img = await new Promise<HTMLImageElement | null>(resolve => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => resolve(null)
      image.src = src
    })
    if (img) return img
  }

  return null
}
