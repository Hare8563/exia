// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Navigation } from '@/components/modules/Navigation'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'

afterEach(cleanup)

// Minimal mock store setup
vi.mock('@/states/navigationStore', () => ({
  useNavigationStore: () => ({
    navigation: { isAutoPlay: false, isLogOpen: false, isSkipModalOpen: false },
    setNavigation: vi.fn(),
  }),
}))
vi.mock('@/states/skipActionStore', () => ({
  useSkipActionStore: () => ({ skipAction: { skipToNextChoice: vi.fn() } }),
}))
vi.mock('@/scene-manager/sceneStore', () => ({
  useSceneStore: () => vi.fn(),
}))
vi.mock('@/components/modules/Message/hooks/useKAGScenarioManager', () => ({
  useKAGScenarioManager: () => ({ executeButtonExp: vi.fn(), skipToNextChoice: vi.fn() }),
}))

describe('Navigation', () => {
  it('renders visible buttons as text labels, not background images', () => {
    useKAGScenarioStore.setState({
      uiState: {
        buttons: [
          { graphic: 'message_bt_auto', visible: true },
          { graphic: 'message_bt_skip', visible: true },
        ],
        historyEnabled: false,
        startAnchorEnabled: false,
      } as never,
    })
    const { container } = render(<Navigation />)
    const buttons = container.querySelectorAll('button')
    buttons.forEach(btn => {
      // CSS button: no backgroundImage sprite URL
      expect(btn.style.backgroundImage).not.toMatch(/url\(/)
    })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders AUTO button with Figma dimensions', () => {
    useKAGScenarioStore.setState({
      uiState: {
        buttons: [{ graphic: 'message_bt_auto', visible: true }],
        historyEnabled: false,
        startAnchorEnabled: false,
      } as never,
    })
    render(<Navigation />)
    const btn = screen.getByRole('button', { name: /AUTO/i })
    expect(btn.style.width).toBe('134px')
    expect(btn.style.height).toBe('47px')
  })

  it('always renders a MENU button', () => {
    useKAGScenarioStore.setState({
      uiState: { buttons: [], historyEnabled: false, startAnchorEnabled: false } as never,
    })
    render(<Navigation />)
    expect(screen.getByRole('button', { name: /MENU/i })).not.toBeNull()
  })

  it('shows MenuPanel when MENU button is clicked', () => {
    useKAGScenarioStore.setState({
      uiState: { buttons: [], historyEnabled: false, startAnchorEnabled: false } as never,
    })
    render(<Navigation />)
    fireEvent.click(screen.getByRole('button', { name: /MENU/i }))
    expect(screen.getByRole('button', { name: 'fullscreen' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'log' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'skip' })).not.toBeNull()
  })

  it('hides MenuPanel when document is clicked after MENU opens', () => {
    useKAGScenarioStore.setState({
      uiState: { buttons: [], historyEnabled: false, startAnchorEnabled: false } as never,
    })
    render(<Navigation />)
    fireEvent.click(screen.getByRole('button', { name: /MENU/i }))
    fireEvent.click(document.body)
    expect(screen.queryByRole('button', { name: 'fullscreen' })).toBeNull()
  })
})
