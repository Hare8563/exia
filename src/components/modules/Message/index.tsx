import React, { useState, useCallback, useEffect } from "react";
import { useKAGScenarioManager } from './hooks/useKAGScenarioManager'
import { useKAGScenarioStore } from '@/states/kagScenarioStore'
import { useNavigationStore } from '@/states/navigationStore'
import { useSkipActionStore } from '@/states/skipActionStore'
import { MessageTypewriter } from './MessageTypewriter'
import { Choice } from '../Choice'
import { DialogueLayout, NarrationLayout } from './layouts'
import type { ScenarioChoice } from '@/types'

export const Message: React.FC = () => {
  const { handleChoiceSelect, skipToNextChoice } = useKAGScenarioManager()
  const currentText = useKAGScenarioStore(s => s.currentText)
  const speakerName = useKAGScenarioStore(s => s.currentSpeakerName)
  const choices = useKAGScenarioStore(s => s.currentChoices)
  const { navigation } = useNavigationStore()

  const [isShowArrowIcon, setIsShowArrowIcon] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [typewriterInstance, setTypewriterInstance] = useState<any>(null)

  // Register skip callback for Navigation's skip button
  useEffect(() => {
    useSkipActionStore.getState().setSkipAction({ skipToNextChoice })
  }, [skipToNextChoice])

  // Typewriter skip: when reading and user clicks, snap to full text
  const handleTypewriterSkip = useCallback(() => {
    if (isReading && typewriterInstance) {
      typewriterInstance.stop().typeString(currentText).start()
      setIsReading(false)
      setIsShowArrowIcon(true)
      return true  // consumed the click
    }
    return false
  }, [isReading, typewriterInstance, currentText])

  if (!currentText && !choices) return null

  const Layout = DialogueLayout;

  // Map KAG choices { text, target } to ScenarioChoice { text, jumpTo }
  const mappedChoices: ScenarioChoice[] | undefined = choices?.map(c => ({
    text: c.text,
    jumpTo: c.target,
  }))

  return (
    <div
      className="absolute bottom-0 left-0 z-40 w-full h-full pointer-events-none"
      onClick={e => { if (handleTypewriterSkip()) e.stopPropagation() }}
    >
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
      {mappedChoices && (
        <div className="pointer-events-auto">
          <Choice
            choices={mappedChoices}
            onSelect={(choice: ScenarioChoice) => handleChoiceSelect(choice.jumpTo)}
          />
        </div>
      )}
    </div>
  )
}
