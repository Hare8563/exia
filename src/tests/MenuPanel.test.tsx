// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MenuPanel } from '@/components/modules/Navigation/MenuPanel'

afterEach(cleanup)

describe('MenuPanel', () => {
  it('renders three icon buttons', () => {
    render(<MenuPanel onFullscreen={vi.fn()} onLog={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'fullscreen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'log' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'skip' })).not.toBeNull()
  })

  it('calls onFullscreen when fullscreen button clicked', () => {
    const onFullscreen = vi.fn()
    render(<MenuPanel onFullscreen={onFullscreen} onLog={vi.fn()} onSkip={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'fullscreen' }))
    expect(onFullscreen).toHaveBeenCalledOnce()
  })

  it('calls onLog when log button clicked', () => {
    const onLog = vi.fn()
    render(<MenuPanel onFullscreen={vi.fn()} onLog={onLog} onSkip={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'log' }))
    expect(onLog).toHaveBeenCalledOnce()
  })

  it('calls onSkip when skip button clicked', () => {
    const onSkip = vi.fn()
    render(<MenuPanel onFullscreen={vi.fn()} onLog={vi.fn()} onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: 'skip' }))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
