import React, { useEffect, useCallback, useRef } from 'react'
import { loadKAGScenario } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { ThreeCanvas } from '@/components/ThreeCanvas'
import { Message } from '@/components/modules/Message'
import { Navigation } from '@/components/modules/Navigation'
import { Log } from '@/components/modules/Log'
import { Voice } from '@/components/modules/Voice'
import { Bgm } from '@/components/modules/Bgm'
import { Se } from '@/components/modules/Se'
import { ClickableMap } from '@/components/modules/ClickableMap'
import { useKAGScenarioManager } from '@/components/modules/Message/hooks/useKAGScenarioManager'
import { useScreenStore } from '@/states/screenStore'
import { useNavigationStore } from '@/states/navigationStore'
import { SCREEN } from '@/constants'

export const MainScreen: React.FC = () => {
  const { init, goToNextLine, isScenarioEnd, executeButtonExp } = useKAGScenarioManager()
  const flags = useKAGScenarioStore(s => s.flags)
  const resetScenario = useKAGScenarioStore(s => s.reset)
  const choices = useKAGScenarioStore(s => s.currentChoices)
  const uiState = useKAGScenarioStore(s => s.uiState)
  const currentQuake = useKAGScenarioStore(s => s.currentQuake)
  const navigation = useNavigationStore(s => s.navigation)
  const setNavigation = useNavigationStore(s => s.setNavigation)
  const { setScreen } = useScreenStore()
  const screenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    resetScenario()

    loadKAGScenario('scenarios/main', flags)
      .then(interp => {
        if (disposed) return
        console.info('[MainScreen] scenario loaded: scenarios/main')
        init(interp)
      })
      .catch(err => console.error('[MainScreen] scenario load failed:', err))

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    const element = screenRef.current
    if (!element) return
    if (!currentQuake) {
      element.style.transform = ''
      return
    }

    let frameId = 0
    const animate = () => {
      const elapsed = Date.now() - currentQuake.startedAt
      const progress = Math.min(1, elapsed / currentQuake.time)
      const decay = 1 - progress
      const angle = elapsed / 16
      const offsetX = Math.sin(angle * 1.7) * currentQuake.hmax * decay
      const offsetY = Math.cos(angle * 2.1) * currentQuake.vmax * decay
      element.style.transform = `translate(${offsetX}px, ${offsetY}px)`
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate)
      } else {
        element.style.transform = ''
      }
    }

    frameId = window.requestAnimationFrame(animate)
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      element.style.transform = ''
    }
  }, [currentQuake])

  const handleScreenClick = useCallback(async () => {
    console.info('[MainScreen] screen click', {
      hasChoices: !!choices,
      isScenarioEnd,
    })
    if (choices) return  // choice UI handles its own clicks
    if (isScenarioEnd) {
      console.warn('[MainScreen] transitioning to ENDING_SCREEN')
      setScreen({ screen: SCREEN.ENDING_SCREEN })
      return
    }
    await goToNextLine()
  }, [choices, isScenarioEnd, goToNextLine, setScreen])

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!uiState.rclickEnabled) return
    event.preventDefault()
    const closeButton = uiState.buttons.find(button => button.visible && button.graphic === 'message_bt_close')
    if (closeButton?.exp) {
      void executeButtonExp(closeButton.exp)
      return
    }
    if (uiState.historyEnabled) {
      setNavigation({
        ...navigation,
        isLogOpen: true,
      })
    }
  }, [executeButtonExp, navigation, setNavigation, uiState.buttons, uiState.historyEnabled, uiState.rclickEnabled])

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={handleScreenClick} onContextMenu={handleContextMenu}>
      <div ref={screenRef} className="relative w-full h-full will-change-transform">
        <Voice />
        <Bgm />
        <Se />
        <ThreeCanvas />
        <ClickableMap />
        <Message />
        <Navigation />
        <Log />
      </div>
    </div>
  )
}
