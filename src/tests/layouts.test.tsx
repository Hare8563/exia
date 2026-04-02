// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DialogueLayout } from '@/components/modules/Message/layouts'

describe('DialogueLayout', () => {
  it('applies blue gradient background', () => {
    const { container } = render(
      <DialogueLayout showArrowIcon={false} isAutoPlay={false}>text</DialogueLayout>
    )
    const box = container.firstElementChild as HTMLElement
    expect(box.style.background).toContain('rgba(0, 18, 28')
  })

  it('renders separator line when characterName is provided', () => {
    const { container } = render(
      <DialogueLayout characterName="星野" showArrowIcon={false} isAutoPlay={false}>text</DialogueLayout>
    )
    const hr = container.querySelector('[data-testid="dialogue-separator"]')
    expect(hr).not.toBeNull()
  })

  it('does not render separator line when characterName is absent', () => {
    const { container } = render(
      <DialogueLayout showArrowIcon={false} isAutoPlay={false}>text</DialogueLayout>
    )
    const hr = container.querySelector('[data-testid="dialogue-separator"]')
    expect(hr).toBeNull()
  })

  it('renders diamond indicator when showArrowIcon=true and not autoplay', () => {
    const { container } = render(
      <DialogueLayout showArrowIcon={true} isAutoPlay={false}>text</DialogueLayout>
    )
    const diamond = container.querySelector('[data-testid="dialogue-diamond"]')
    expect(diamond).not.toBeNull()
  })

  it('hides diamond indicator during autoplay', () => {
    const { container } = render(
      <DialogueLayout showArrowIcon={true} isAutoPlay={true}>text</DialogueLayout>
    )
    const diamond = container.querySelector('[data-testid="dialogue-diamond"]')
    expect(diamond).toBeNull()
  })
})
