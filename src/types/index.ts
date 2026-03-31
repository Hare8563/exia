import { SCREEN } from "@/constants";
import { TypewriterClass } from "typewriter-effect";

export type Scenario = {
  id: string;
  bgmFile?: string;
  backgroundFile?: string;
  currentLineIndex: number;
  characters?: ScenarioCharacter[];
  lines: ScenarioLine[];
  currentLine?: ScenarioLine;
  currentCharacterIndex?: number;
  logs: ScenarioLogEntry[];
};

export type ScenarioCharacter = {
  index: number;
  name: string;
  imageFile: string;
  animation?: string;
  speakerId?: number;
  isShow: boolean;
};

export type ScenarioCutIn = {
  imageFile: string;
  isFullScreen?: boolean;
};

export type FlagValue =
  | boolean
  | number
  | string
  | FlagValue[]
  | { [key: string]: FlagValue };

export type ScenarioCondition = {
  flag: string;
  equals?: FlagValue;
  gt?: number;
  lt?: number;
  then: string;
  else?: string;
};

export type ScenarioChoice = {
  text: string;
  jumpTo: string;
};

type ScenarioLineCharacter = {
  index: number;
  name?: string;
  imageFile?: string;
  animation?: string;
  isShow?: boolean;
  speakerId?: number;
};

export type NarrationLine = {
  id?: string;
  type: 0;
  text: string;
  character?: ScenarioLineCharacter;
  cutIn?: ScenarioCutIn;
  backgroundFile?: string;
  jumpTo?: string;
  if?: ScenarioCondition;
  voice?: string;
  bgmFile?: string;
};

export type DialogueLine = {
  id?: string;
  type: 1;
  text: string;
  character?: ScenarioLineCharacter;
  cutIn?: ScenarioCutIn;
  backgroundFile?: string;
  jumpTo?: string;
  if?: ScenarioCondition;
  voice?: string;
  bgmFile?: string;
};

export type ChoiceLine = {
  id?: string;
  type: 2;
  text: string;
  choices: ScenarioChoice[];
};

export type FlagLine = {
  id?: string;
  type: 'flag';
  set: Record<string, FlagValue>;
};

export type JumpLine = {
  id?: string;
  type: 'jump';
  to: string;
  keepState?: boolean;
};

export type DisplayLine = NarrationLine | DialogueLine | ChoiceLine;
export type ScenarioLine = DisplayLine | FlagLine | JumpLine;

export type Navigation = {
  isAutoPlay: boolean;
  isLogOpen: boolean;
  isSkipModalOpen: boolean; // スキップモーダル表示状態を追加
  isConfigOpen?: boolean;
};

export type Config = {};

export type ScreenType = (typeof SCREEN)[keyof typeof SCREEN];
export type Screen = {
  screen: ScreenType;
  isLoaded: boolean;
};

// レイアウトコンポーネントのProps型定義
export type MessageLayoutProps = {
  characterName?: string;
  children: React.ReactNode;
  showArrowIcon: boolean;
  isAutoPlay: boolean;
};

// Typewriterコンポーネントのprops型定義
export type TypewriterProps = {
  navigation: Navigation;
  text: string;
  setIsShowArrowIcon: (isShow: boolean) => void;
  setIsReading: (isReading: boolean) => void;
  setTypewriterInstance: (instance: TypewriterClass | null) => void;
};

// キャラクター情報の型
export type CharacterInfo = {
  index: number;
  name: string;
  imageFile: string;
};

// ScenarioLogのための型
export type ScenarioLogEntry = DisplayLine & {
  character?: CharacterInfo;
};
