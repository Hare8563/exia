// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Choice } from '@/components/modules/Choice'

afterEach(cleanup)

const choices = [
  { text: "Hello, Hoshino!", jumpTo: "label1" },
  { text: "Goodbye!", jumpTo: "label2" },
]

describe('Choice', () => {
  it('does not render a full-screen black overlay', () => {
    const { container } = render(<Choice choices={choices} onSelect={() => {}} />)
    // Must not have a fixed inset-0 bg-black element
    const overlay = container.querySelector('.fixed.inset-0.bg-black')
    expect(overlay).toBeNull()
  })

  it('renders all choice texts', () => {
    render(<Choice choices={choices} onSelect={() => {}} />)
    expect(screen.getByText("Hello, Hoshino!")).not.toBeNull()
    expect(screen.getByText("Goodbye!")).not.toBeNull()
  })

  it('renders buttons with light background color', () => {
    const { container } = render(<Choice choices={choices} onSelect={() => {}} />)
    const buttons = container.querySelectorAll('button')
    buttons.forEach(btn => {
      // jsdom normalizes hex to rgb; #F2F3F5 == rgb(242, 243, 245)
      expect(btn.style.background).toBe('rgb(242, 243, 245)')
    })
  })

  it('renders button text in dark blue color', () => {
    const { container } = render(<Choice choices={choices} onSelect={() => {}} />)
    const spans = container.querySelectorAll('span')
    spans.forEach(span => {
      // jsdom normalizes hex to rgb; #364A63 == rgb(54, 74, 99)
      expect(span.style.color).toBe('rgb(54, 74, 99)')
    })
  })
})
