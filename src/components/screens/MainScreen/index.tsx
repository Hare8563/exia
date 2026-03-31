import React, { useEffect, useCallback } from 'react'
import { loadKAGScenario } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { ThreeCanvas } from '@/components/ThreeCanvas'
import { Message } from '@/components/modules/Message'
import { Navigation } from '@/components/modules/Navigation'
import { Log } from '@/components/modules/Log'
import { Voice } from '@/components/modules/Voice'
import { Bgm } from '@/components/modules/Bgm'
import { useKAGScenarioManager } from '@/components/modules/Message/hooks/useKAGScenarioManager'
import { useScreenStore } from '@/states/screenStore'
import { SCREEN } from '@/constants'

export const MainScreen: React.FC = () => {
  const { init, goToNextLine, isScenarioEnd } = useKAGScenarioManager()
  const flags = useKAGScenarioStore(s => s.flags)
  const choices = useKAGScenarioStore(s => s.currentChoices)
  const { setScreen } = useScreenStore()

  useEffect(() => {
    loadKAGScenario('scenarios/main', flags)
      .then(interp => init(interp))
      .catch(console.error)
  }, [])

  const handleScreenClick = useCallback(async () => {
    if (choices) return  // choice UI handles its own clicks
    if (isScenarioEnd) {
      setScreen({ screen: SCREEN.ENDING_SCREEN })
      return
    }
    await goToNextLine()
  }, [choices, isScenarioEnd, goToNextLine, setScreen])

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={handleScreenClick}>
      <Voice />
      <Bgm />
      <ThreeCanvas />
      <Message />
      <Navigation />
      <Log />
    </div>
  )
}
