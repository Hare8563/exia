import React, { useEffect } from 'react'
import { loadKAGScenario } from '@/utils/kagLoader'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { ThreeCanvas } from '@/components/ThreeCanvas'
import { Message } from '@/components/modules/Message'
import { Navigation } from '@/components/modules/Navigation'
import { Log } from '@/components/modules/Log'
import { Voice } from '@/components/modules/Voice'
import { Bgm } from '@/components/modules/Bgm'
import { useKAGScenarioManager } from '@/components/modules/Message/hooks/useKAGScenarioManager'

export const MainScreen: React.FC = () => {
  const { init } = useKAGScenarioManager()
  const flags = useKAGScenarioStore(s => s.flags)

  useEffect(() => {
    loadKAGScenario('scenarios/main', flags)
      .then(interp => init(interp))
      .catch(console.error)
  }, [])

  return (
    <div className="relative w-full h-full">
      <Voice />
      <Bgm />
      <ThreeCanvas />
      <Message />
      <Navigation />
      <Log />
    </div>
  )
}
