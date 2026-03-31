// src/types/kag.ts

// Matches KagToken enum from Rust (serde tag = "type")
export type KagToken =
  | { type: 'Label'; name: string; page_name?: string }
  | { type: 'Tag'; name: string; attrs: Record<string, string> }
  | { type: 'Text'; content: string }
  | { type: 'Newline' }

export type FlagArray = FlagValue[]
export type FlagObject = { [key: string]: FlagValue }
export type FlagValue = boolean | number | string | FlagArray | FlagObject

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

export type KAGTransitionEntry = {
  layer: 'base' | number
  method: string
  time: number
}

export type KAGMoveEntry = {
  layer: 'base' | number
  time: number
  startX: number
  startY: number
  startOpacity: number
  targetX: number
  targetY: number
  targetOpacity: number
}

export type KAGQuakeEffect = {
  playId: number
  time: number
  hmax: number
  vmax: number
  startedAt: number
}

// State returned after each advance() call (one "click unit")
export type KAGDisplayFrame = {
  text: string
  speakerName?: string
  layers: KAGLayer[]
  bgmFile?: string
  seFile?: string
  seFiles?: Record<number, KAGSEChannel>
  voiceFile?: string
  voicePlayback?: KAGVoicePlayback
  voiceSpeakerId?: number           // VOICEVOX speaker id
  choices?: { text: string; target: string }[]
  transition?: {
    method: string                  // representative method for backward compatibility
    time: number                    // ms (max of all running transitions)
    layers: ('base' | number)[]     // layers being transitioned
    entries: KAGTransitionEntry[]   // per-layer transition definitions
    foreLayers: KAGLayer[]          // fore buffer snapshot at transition start
    backLayers: KAGLayer[]          // back buffer snapshot at transition start (target)
  }
  moves?: KAGMoveEntry[]
  quake?: KAGQuakeEffect
  isWaitingTransition: boolean
  isWaitingTimer: boolean
  waitTime?: number
  waitCanSkip: boolean
  uiState: KAGUIState
  isEnd: boolean
}

// Log entry for backlog
export type KAGLogEntry = {
  text: string
  speakerName?: string
}

export type KAGScenarioState = {
  layers: KAGLayer[]
  currentText: string
  currentSpeakerName?: string
  currentBgmFile?: string
  currentSeFile?: string
  currentSeFiles?: Record<number, KAGSEChannel>
  currentVoiceFile?: string
  currentVoicePlayback?: KAGVoicePlayback
  currentVoiceSpeakerId?: number
  currentChoices?: { text: string; target: string }[]
  isWaitingTransition: boolean
  currentTransition?: KAGDisplayFrame['transition']
  currentMoves?: KAGMoveEntry[]
  currentQuake?: KAGQuakeEffect
  isEnd: boolean
  uiState: KAGUIState
  flags: Record<string, FlagValue>
  logs: KAGLogEntry[]
  transitionCompleteCallback: (() => void) | null
  audioWaitCompleteCallback: ((kind: 'se' | 'voice', buf: number) => void) | null
}

export type KAGUIButton = {
  layer: string
  graphic: string
  visible: boolean
  exp?: string
}

export type KAGSEChannel = {
  file: string
  playId: number
  loop?: boolean
}

export type KAGVoicePlayback = {
  file: string
  playId: number
  buf: number
}

export type KAGClickableMapState = {
  enabled: boolean
  image?: string
  action?: string
  layer?: 'base' | number
  page?: 'fore' | 'back'
}

export type KAGUIState = {
  historyOutput: boolean
  historyEnabled: boolean
  rclickEnabled: boolean
  startAnchorEnabled: boolean
  buttons: KAGUIButton[]
  clickableMap: KAGClickableMapState
}
