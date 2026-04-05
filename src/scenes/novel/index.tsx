import React, { useEffect, useCallback, useRef } from 'react'
import { loadKAGScenario } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { useThreeContentStore } from '@/states/threeContentStore'
import { NovelLayers } from '@/components/modules/Background/NovelLayers'
import { Message } from '@/components/modules/Message'
import { Navigation } from '@/components/modules/Navigation'
import { Log } from '@/components/modules/Log'
import { Voice } from '@/components/modules/Voice'
import { Bgm } from '@/components/modules/Bgm'
import { Se } from '@/components/modules/Se'
import { ClickableMap } from '@/components/modules/ClickableMap'
import { useKAGScenarioManager } from '@/components/modules/Message/hooks/useKAGScenarioManager'
import { useNavigationStore } from '@/states/navigationStore'
import { useSceneStore } from '@/scene-manager/sceneStore'
import { useTransitionStore } from '@/states/transitionStore'

export default function NovelScene() {
  const [isTransitioning, setIsTransitioning] = React.useState(true)
  const { init, goToNextLine, isScenarioEnd, executeButtonExp } = useKAGScenarioManager()
  const flags = useKAGScenarioStore(s => s.flags)
  const resetScenario = useKAGScenarioStore(s => s.reset)
  const choices = useKAGScenarioStore(s => s.currentChoices)
  const uiState = useKAGScenarioStore(s => s.uiState)
  const currentQuake = useKAGScenarioStore(s => s.currentQuake)
  const navigation = useNavigationStore(s => s.navigation)
  const setNavigation = useNavigationStore(s => s.setNavigation)
  const navigate = useSceneStore(s => s.navigate)
  const setSceneThreeComponent = useThreeContentStore(s => s.setSceneThreeComponent)
  const screenRef = useRef<HTMLDivElement>(null)

  // Register 3D content into the persistent canvas for the duration of this scene
  useEffect(() => {
    setSceneThreeComponent(NovelLayers)
    return () => setSceneThreeComponent(null)
  }, [setSceneThreeComponent])

  useEffect(() => {
    let disposed = false
    resetScenario()

    loadKAGScenario('scenarios/main', flags)
      .then(interp => {
        if (disposed) return
        console.info('[NovelScene] scenario loaded: scenarios/main')
        init(interp)
        // Global and local fade out sequence
        setTimeout(() => {
          setIsTransitioning(false)
          useTransitionStore.getState().setOpacity(0)
        }, 500)

        setTimeout(() => {
            useTransitionStore.getState().setInProgress(false)
            useTransitionStore.getState().setType('none')
        }, 1000)
      })
      .catch(err => console.error('[NovelScene] scenario load failed:', err))

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
    if (choices) return
    if (isScenarioEnd) {
      navigate('ending')
      return
    }
    await goToNextLine()
  }, [choices, isScenarioEnd, goToNextLine, navigate])

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!uiState.rclickEnabled) return
    event.preventDefault()
    const closeButton = uiState.buttons.find(button => button.visible && button.graphic === 'message_bt_close')
    if (closeButton?.exp) {
      void executeButtonExp(closeButton.exp)
      return
    }
    if (uiState.historyEnabled) {
      setNavigation({ ...navigation, isLogOpen: true })
    }
  }, [executeButtonExp, navigation, setNavigation, uiState.buttons, uiState.historyEnabled, uiState.rclickEnabled])

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={handleScreenClick} onContextMenu={handleContextMenu}>
      <div ref={screenRef} className="relative w-full h-full will-change-transform">
        <Voice />
        <Bgm />
        <Se />
        <ClickableMap />
        <Message />
        <Navigation />
        <Log />
      </div>
      {/* Screen White-in Overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-white z-[100] pointer-events-none animate-fade-out" />
      )}
    </div>
  )
}
