/**
 * Resolves a jumpTo path string into a filePath and labelId.
 *
 * Path rules:
 *   - Starts with "./" or "../": relative to the directory of currentFilePath
 *   - Otherwise: absolute from "scenarios/" root
 *
 * Format: "<path>::<labelId>"
 * The file path omits the .json extension.
 */
export function resolveJumpTo(
  jumpTo: string,
  currentFilePath: string
): { filePath: string; labelId: string } {
  const separatorIndex = jumpTo.lastIndexOf('::')
  if (separatorIndex === -1) {
    throw new Error(`[Exia] Invalid jumpTo format (missing '::'): "${jumpTo}"`)
  }

  const pathPart = jumpTo.slice(0, separatorIndex)
  const labelId = jumpTo.slice(separatorIndex + 2)

  if (!labelId) {
    throw new Error(`[Exia] Invalid jumpTo format (empty labelId): "${jumpTo}"`)
  }

  let filePath: string

  if (pathPart.startsWith('./') || pathPart.startsWith('../')) {
    // Relative path — resolve against current file's directory
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))

    if (pathPart === './') {
      filePath = currentFilePath
    } else if (pathPart.startsWith('./')) {
      filePath = `${currentDir}/${pathPart.slice(2)}`
    } else {
      // Handle ../ by splitting and resolving
      const parts = currentDir.split('/')
      const relParts = pathPart.split('/')
      const resolved = [...parts]
      for (const part of relParts) {
        if (part === '..') {
          resolved.pop()
        } else if (part !== '.') {
          resolved.push(part)
        }
      }
      filePath = resolved.join('/')
    }
  } else {
    // Absolute path from scenarios/ root
    filePath = pathPart ? `scenarios/${pathPart}` : 'scenarios/main'
  }

  return { filePath, labelId }
}
