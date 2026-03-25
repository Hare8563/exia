import React, { useEffect } from 'react'
import { useScenarioStore } from '@/states/scenarioStore'
import { getCurrentCharacterIndex } from '@/utils'
import { loadScenario } from '@/utils/scenarioLoader'
import { DisplayLine } from '@/types'
import { Message } from '@/components/modules/Message'
import { Navigation } from '@/components/modules/Navigation'
import { Loading } from '@/components/modules/Loading'
import { Voice } from '@/components/modules/Voice'
import { Log } from '@/components/modules/Log'
import { ThreeCanvas } from '@/components/ThreeCanvas'

export const MainScreen: React.FC = () => {
  const { scenario, setScenario } = useScenarioStore()

  useEffect(() => {
    const loadEntry = async () => {
      if (scenario.isFetched) return

      try {
        const loaded = await loadScenario('scenarios/main')
        const entryIndex = loaded.lines.findIndex((l) => l.id === 'entry')

        if (entryIndex === -1) {
          throw new Error(
            "[Exia] Failed to load entry point: scenarios/main.json must exist and contain a line with id: 'entry'."
          )
        }

        // Do NOT spread scenario here — Zustand's setScenario merges with existing state.
        // Spreading a stale scenario snapshot would overwrite fields changed elsewhere.
        setScenario({
          id: loaded.id,
          backgroundFile: loaded.backgroundFile,
          bgmFile: loaded.bgmFile,
          lines: loaded.lines,
          characters: loaded.characters,
          currentFilePath: 'scenarios/main',
          currentCharacterIndex: getCurrentCharacterIndex(loaded.lines, entryIndex),
          currentLineIndex: entryIndex,
          currentLine: loaded.lines[entryIndex] as DisplayLine,
          isFetched: true,
        })
      } catch (error) {
        console.error(error)
      }
    }

    loadEntry()
  }, [scenario.isFetched, setScenario])

  return (
    <>
      <Voice />
      <ThreeCanvas />
      <Message />
      <Navigation />
      <Log />
      <Loading />
    </>
  )
}
