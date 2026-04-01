export const CONFIG = {
  TITLE: "Exia - Novel game engine",
  LANGUAGE: "ja",
  VOICEVOX: false,
  DEBUG: false,
};

export const SCENE = {
  SIGN_IN: 'sign-in',
  ASSET_UPDATE: 'asset-update',
  TITLE: 'title',
  NOVEL: 'novel',
  ENDING: 'ending',
} as const

export type SceneId = (typeof SCENE)[keyof typeof SCENE]

// メッセージ表示に関する定数
export const MESSAGE_CONFIG = {
  LOADING_DELAY: 1000, // ローディング後のセリフ表示間隔(ms)
  AUTO_PLAY_DELAY: 2000, // オート再生時のセリフ送りの間隔(ms)
  DISPLAY_LINE_DELAY: 50, // セリフの表示間隔(ms)
} as const;

// メッセージの種類
export const MESSAGE_TYPE = {
  NARRATION: 0,
  DIALOGUE: 1,
  CHOICE: 2,
} as const;
