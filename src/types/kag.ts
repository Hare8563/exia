// src/types/kag.ts

// Matches KagToken enum from Rust (serde tag = "type")
export type KagToken =
  | { type: 'Label'; name: string; page_name?: string }
  | { type: 'Tag'; name: string; attrs: Record<string, string> }
  | { type: 'Text'; content: string }
  | { type: 'Newline' }

// A single layer in the visual stack.
// id='base' is the background; 0-9 are foreground layers (characters, overlays).
export type KAGLayer = {
  id: 'base' | number
  file?: string        // storage= parameter
  visible: boolean
  x: number            // left= in pixels
  y: number            // top= in pixels
  opacity: number      // 0-255
  scale: number
}

// State returned after each advance() call (one "click unit")
export type KAGDisplayFrame = {
  text: string
  speakerName?: string
  layers: KAGLayer[]
  bgmFile?: string
  seFile?: string
  voiceFile?: string
  voiceSpeakerId?: number           // VOICEVOX speaker id
  choices?: { text: string; target: string }[]
  transition?: {
    method: string                  // 'crossfade' | 'scroll' | 'dissolve'
    time: number                    // ms (max of all running transitions)
    layers: ('base' | number)[]     // layers being transitioned
    foreLayers: KAGLayer[]          // fore buffer snapshot at transition start
    backLayers: KAGLayer[]          // back buffer snapshot at transition start (target)
  }
  isWaitingTransition: boolean
  isWaitingTimer: boolean
  waitTime?: number
  waitCanSkip: boolean
  isEnd: boolean
}

// Log entry for backlog
export type KAGLogEntry = {
  text: string
  speakerName?: string
}

// Zustand store shape
export type FlagValue = boolean | number | string

export type KAGScenarioState = {
  layers: KAGLayer[]
  currentText: string
  currentSpeakerName?: string
  currentBgmFile?: string
  currentSeFile?: string
  currentVoiceFile?: string
  currentVoiceSpeakerId?: number
  currentChoices?: { text: string; target: string }[]
  isWaitingTransition: boolean
  currentTransition?: KAGDisplayFrame['transition']
  isEnd: boolean
  flags: Record<string, FlagValue>
  logs: KAGLogEntry[]
  transitionCompleteCallback: (() => void) | null
}
