import React, { useState, useCallback } from "react";
import { useKAGScenarioManager } from './hooks/useKAGScenarioManager'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { useNavigationStore } from '@/states/navigationStore'
import { useSkipActionStore } from '@/states/skipActionStore'
import { useScreenStore } from '@/states/screenStore'
import { MessageTypewriter } from './MessageTypewriter'
import { Choice } from '../Choice'
import { DialogueLayout, NarrationLayout } from './layouts'
import { SCREEN } from '@/constants'
import type { ScenarioChoice } from '@/types'

export const Message: React.FC = () => {
  const { goToNextLine, handleChoiceSelect, skipToNextChoice, isScenarioEnd } =
    useKAGScenarioManager()
  const currentText = useKAGScenarioStore(s => s.currentText)
  const speakerName = useKAGScenarioStore(s => s.currentSpeakerName)
  const choices = useKAGScenarioStore(s => s.currentChoices)
  const { navigation } = useNavigationStore()
  const { setScreen } = useScreenStore()

  const [isShowArrowIcon, setIsShowArrowIcon] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [typewriterInstance, setTypewriterInstance] = useState<any>(null)

  // Register skip callback for Navigation's skip button
  useSkipActionStore.getState().setSkipAction({ skipToNextChoice })

  const handleNext = useCallback(async () => {
    if (isScenarioEnd) {
      setScreen({ screen: SCREEN.ENDING_SCREEN })
      return
    }
    if (choices) return  // blocked until choice selected
    if (isReading) {
      if (typewriterInstance) {
        typewriterInstance.stop().typeString(currentText).start()
        setIsReading(false)
        setIsShowArrowIcon(true)
      }
      return
    }
    await goToNextLine()
  }, [isScenarioEnd, choices, isReading, typewriterInstance, currentText, goToNextLine, setScreen])

  if (!currentText && !choices) return null

  const Layout = speakerName ? DialogueLayout : NarrationLayout

  // Map KAG choices { text, target } to ScenarioChoice { text, jumpTo }
  const mappedChoices: ScenarioChoice[] | undefined = choices?.map(c => ({
    text: c.text,
    jumpTo: c.target,
  }))

  return (
    <div className="absolute bottom-0 left-0 z-40 w-full h-full pointer-events-none">
      <div className="pointer-events-auto cursor-pointer" onClick={handleNext}>
        <Layout
          characterName={speakerName}
          showArrowIcon={isShowArrowIcon}
          isAutoPlay={navigation.isAutoPlay}
        >
          <MessageTypewriter
            key={currentText}
            navigation={navigation}
            text={currentText}
            setIsShowArrowIcon={setIsShowArrowIcon}
            setIsReading={setIsReading}
            setTypewriterInstance={setTypewriterInstance}
          />
        </Layout>
      </div>
      {mappedChoices && (
        <Choice
          choices={mappedChoices}
          onSelect={(choice: ScenarioChoice) => handleChoiceSelect(choice.jumpTo)}
        />
      )}
    </div>
  )
}
