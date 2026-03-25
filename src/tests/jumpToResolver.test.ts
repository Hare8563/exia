import { describe, it, expect } from 'vitest'
import { resolveJumpTo } from '@/utils/jumpToResolver'

describe('resolveJumpTo', () => {
  // Absolute paths (no ./ or ../ prefix)
  it('resolves absolute path from root', () => {
    expect(resolveJumpTo('main::entry', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/main', labelId: 'entry' })
  })

  it('resolves absolute nested path from root', () => {
    expect(resolveJumpTo('scenes/scene_01::scene', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/scenes/scene_01', labelId: 'scene' })
  })

  // Relative paths
  it('resolves ./ as current file', () => {
    expect(resolveJumpTo('./::end', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/chapter1/scene_1', labelId: 'end' })
  })

  it('resolves ./file as sibling file', () => {
    expect(resolveJumpTo('./scene_2::start', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/chapter1/scene_2', labelId: 'start' })
  })

  it('resolves ../ as parent directory', () => {
    expect(resolveJumpTo('../main::hub', 'scenarios/chapter1/scene_1'))
      .toEqual({ filePath: 'scenarios/main', labelId: 'hub' })
  })

  it('resolves deeply nested absolute path', () => {
    expect(resolveJumpTo('a/b/c::label', 'scenarios/x/y'))
      .toEqual({ filePath: 'scenarios/a/b/c', labelId: 'label' })
  })
})
