// js/config.js
// 全域設定物件：LLM API 端點、判定閾值表、存檔版本等全域常數

export const CONFIG = {
  /** 存檔格式版本號，用於版本兼容性檢查 */
  SAVE_VERSION: '1.0.0',

  /** LLM 最大對話歷史輪數 */
  MAX_HISTORY: 30,

  LLM: {
    PROVIDERS: {
      deepseek: {
        name: 'DeepSeek',
        endpoint: '/api/proxy/https://api.deepseek.com/chat/completions',
        modelsEndpoint: '/api/proxy/https://api.deepseek.com/models',
        model: 'deepseek-chat',
        maxTokens: 4096,
        temperature: 0.7,
      },
      nvidia: {
        name: 'NVIDIA NIM',
        endpoint: '/api/proxy/https://integrate.api.nvidia.com/v1/chat/completions',
        modelsEndpoint: '/api/proxy/https://integrate.api.nvidia.com/v1/models',
        model: 'deepseek-ai/deepseek-r1',
        maxTokens: 4096,
        temperature: 0.7,
      },
      ollama: {
        name: 'Ollama',
        endpoint: '/api/proxy/http://localhost:11434/v1/chat/completions',
        modelsEndpoint: '/api/proxy/http://localhost:11434/v1/models',
        model: 'llama3',
        maxTokens: 4096,
        temperature: 0.7,
      },
      openrouter: {
        name: 'OpenRouter',
        endpoint: '/api/proxy/https://openrouter.ai/api/v1/chat/completions',
        modelsEndpoint: '/api/proxy/https://openrouter.ai/api/v1/models',
        model: '', // 預設模型留空
        maxTokens: 4096,
        temperature: 0.7,
      },
    },
    DEFAULT_PROVIDER: 'deepseek',
  },

  DICE: {
    BASE_DICE: '2d6',
    /** 判定結果閾值表，依優先順序排列（高到低）*/
    RESULT_TABLE: [
      { min: 15, max: 99, label: '大成功', labelEn: 'Critical Success', outcome: 'critical_success', luckEffect: +2 },
      { min: 11, max: 14, label: '成功',   labelEn: 'Success',           outcome: 'success',          luckEffect:  0 },
      { min:  8, max: 10, label: '部分成功',labelEn: 'Partial Success',   outcome: 'partial_success',  luckEffect: -2 },
      { min:  5, max:  7, label: '失敗',   labelEn: 'Failure',            outcome: 'failure',          luckEffect:  0 },
      { min:  2, max:  4, label: '大失敗', labelEn: 'Critical Failure',   outcome: 'critical_failure', luckEffect: -3 },
    ],
    DICE_TYPES: {
      '2d4': {
        count: 2, sides: 4, label: '2d4',
        resultTable: [
          { min: 7, max: 99, label: '大成功', labelEn: 'Critical Success', outcome: 'critical_success', luckEffect: +2 },
          { min: 5, max: 6, label: '成功',   labelEn: 'Success',           outcome: 'success',          luckEffect:  0 },
          { min: 4, max: 4, label: '部分成功',labelEn: 'Partial Success',   outcome: 'partial_success',  luckEffect: -2 },
          { min: 3, max: 3, label: '失敗',   labelEn: 'Failure',            outcome: 'failure',          luckEffect:  0 },
          { min: 1, max: 2, label: '大失敗', labelEn: 'Critical Failure',   outcome: 'critical_failure', luckEffect: -3 },
        ]
      },
      '2d6': { count: 2, sides: 6, label: '2d6', resultTable: null }, // 沿用 DEFAULT_RESULT_TABLE
      '2d8': {
        count: 2, sides: 8, label: '2d8',
        resultTable: [
          { min: 19, max: 99, label: '大成功', labelEn: 'Critical Success', outcome: 'critical_success', luckEffect: +2 },
          { min: 14, max: 18, label: '成功',   labelEn: 'Success',           outcome: 'success',          luckEffect:  0 },
          { min: 10, max: 13, label: '部分成功',labelEn: 'Partial Success',   outcome: 'partial_success',  luckEffect: -2 },
          { min: 6, max: 9, label: '失敗',   labelEn: 'Failure',            outcome: 'failure',          luckEffect:  0 },
          { min: 1, max: 5, label: '大失敗', labelEn: 'Critical Failure',   outcome: 'critical_failure', luckEffect: -3 },
        ]
      },
      '2d10': {
        count: 2, sides: 10, label: '2d10',
        resultTable: [
          { min: 23, max: 99, label: '大成功', labelEn: 'Critical Success', outcome: 'critical_success', luckEffect: +2 },
          { min: 17, max: 22, label: '成功',   labelEn: 'Success',           outcome: 'success',          luckEffect:  0 },
          { min: 12, max: 16, label: '部分成功',labelEn: 'Partial Success',   outcome: 'partial_success',  luckEffect: -2 },
          { min: 7, max: 11, label: '失敗',   labelEn: 'Failure',            outcome: 'failure',          luckEffect:  0 },
          { min: 1, max: 6, label: '大失敗', labelEn: 'Critical Failure',   outcome: 'critical_failure', luckEffect: -3 },
        ]
      },
      '1d20': {
        count: 1, sides: 20, label: '1d20',
        resultTable: [
          { min: 22, max: 99, label: '大成功', labelEn: 'Critical Success', outcome: 'critical_success', luckEffect: +2 },
          { min: 17, max: 21, label: '成功',   labelEn: 'Success',           outcome: 'success',          luckEffect:  0 },
          { min: 12, max: 16, label: '部分成功',labelEn: 'Partial Success',   outcome: 'partial_success',  luckEffect: -2 },
          { min: 7, max: 11, label: '失敗',   labelEn: 'Failure',            outcome: 'failure',          luckEffect:  0 },
          { min: 1, max: 6, label: '大失敗', labelEn: 'Critical Failure',   outcome: 'critical_failure', luckEffect: -3 },
        ]
      },
      '1d100': {
        count: 1, sides: 100, label: '1d100',
        resultTable: [
          { min: 91, max: 999, label: '大成功', labelEn: 'Critical Success', outcome: 'critical_success', luckEffect: +2 },
          { min: 61, max: 90, label: '成功',   labelEn: 'Success',           outcome: 'success',          luckEffect:  0 },
          { min: 41, max: 60, label: '部分成功',labelEn: 'Partial Success',   outcome: 'partial_success',  luckEffect: -2 },
          { min: 11, max: 40, label: '失敗',   labelEn: 'Failure',            outcome: 'failure',          luckEffect:  0 },
          { min: 1, max: 10, label: '大失敗', labelEn: 'Critical Failure',   outcome: 'critical_failure', luckEffect: -3 },
        ]
      }
    },
    /** 各職業對不同行動標籤的加成值 */
    CLASS_BONUS_MAP: {
      '學生':  { explore: 2, talk: 1, combat: 0 },
      '教師':  { talk: 3, explore: 1, combat: 0 },
      '工人':  { combat: 3, explore: 1, talk: 0 },
      '工程師':{ explore: 3, talk: 1, combat: 0 },
      '普通人':{ explore: 1, talk: 1, combat: 1 },
      '軟體工程師': { explore: 3, talk: 1, combat: 0 },
      '護理師':    { talk: 2, explore: 2, combat: 0 },
      '警察':      { combat: 3, explore: 1, talk: 0 },
      '記者':      { talk: 3, explore: 1, combat: 0 },
      '外送員':    { explore: 3, talk: 0, combat: 1 },
    },
    LUCK_HIGH_THRESHOLD: 70,
    LUCK_LOW_THRESHOLD: 30,
    LUCK_HIGH_BONUS: 2,
    LUCK_LOW_PENALTY: -3,
    /** 狀態效果對判定的修正值 */
    STATUS_EFFECT_MODIFIERS: {
      '受傷': -3,
      '亢奮': +2,
      '疲勞': -1,
      '中毒': -2,
    },
  },

  COMBAT: {
    ENEMY_DEFAULT_HP: 100,
    /** 戰鬥失敗後的懲罰設定 */
    DEFEAT_PENALTY: {
      statMultiplier: 0.8,  // 全屬性 ×80%（即 -20%）
      hpPenalty: -20,
      sanPenalty: -20,
      movPenalty: -3,
    },
  },

  SAVE: {
    MAX_SLOTS: 3,
    AUTO_SLOT_KEY: 'trpg_autosave',
    SLOT_KEY_PREFIX: 'trpg_save_slot_',
    /** 存檔清單索引 key */
    INDEX_KEY: 'trpg_save_index',
  },

  AUDIO: {
    STORAGE_KEY: 'trpg_audio_settings',
    enabled: true,
    muted: false,
    bgmVolume: 0.35,
    sfxVolume: 0.65,
    bgmMode: 'follow-theme',
    bgmStyle: 'scifi-horror',
    fadeMs: 1200,
    preloadDelayMs: 1200,
    BGM_STYLES: {
      'scifi-horror': {
        name: '科幻',
        source: './audio/bgm/bgm_scifi_horror.mp3',
      },
      fantasy: {
        name: '冒險',
        source: './audio/bgm/bgm_fantasy.mp3',
      },
      steampunk: {
        name: '蒸氣',
        source: './audio/bgm/bgm_steampunk.flac',
      },
      cyberpunk: {
        name: '賽博',
        source: './audio/bgm/bgm_cyberpunk.ogg',
      },
      future: {
        name: '星際',
        source: './audio/bgm/bgm_future.ogg',
      },
      abyss: {
        name: '深淵',
        source: './audio/bgm/bgm_abyss.ogg',
      },
      hope: {
        name: '黎明',
        source: './audio/bgm/bgm_hope.mp3',
      },
      classical: {
        name: '古典',
        source: './audio/bgm/bgm_classical.mp3',
      },
      epic: {
        name: '史詩',
        source: './audio/bgm/bgm_epic.wav',
      },
      mythology: {
        name: '神話',
        source: './audio/bgm/bgm_mythology.mp3',
      },
    },
    SFX: {
      ui_click: './audio/sfx/ui_click.wav',
      event_select: './audio/sfx/event_select.wav',
      save_success: './audio/sfx/save_success.wav',
      load_success: './audio/sfx/load_success.wav',
      system_error: './audio/sfx/system_error.wav',
      dice_roll: './audio/sfx/dice_roll.ogg',
      dice_success: './audio/sfx/dice_success.wav',
      dice_failure: './audio/sfx/dice_failure.wav',
      llm_thinking: './audio/sfx/llm_thinking.wav',
      llm_output: './audio/sfx/llm_output.wav',
      game_ending: './audio/sfx/game_ending.wav',
    },
  },

  /** 測試模式密碼 */
  TEST_MODE_PASSWORD: 'root',

  /** 可選色彩主題清單 */
  THEMES: [
    { id: 'scifi-horror', name: '科幻', icon: '🧬', desc: '深藍艙室・冷光掃描' },
    { id: 'fantasy',      name: '冒險', icon: '⚔️',  desc: '青色羅盤・密林遺跡' },
    { id: 'steampunk',    name: '蒸氣', icon: '⚙️',  desc: '黃銅齒輪・煤煙金屬' },
    { id: 'cyberpunk',    name: '賽博', icon: '💻',  desc: '霓虹錯層・暗巷訊號' },
    { id: 'future',       name: '星際', icon: '🌌',  desc: '黑域星圖・白色航標' },
    { id: 'abyss',        name: '深淵', icon: '◌',  desc: '墨綠裂隙・紫色低語' },
    { id: 'hope',         name: '黎明', icon: '◇',  desc: '白色晨霧・天藍曙光' },
    { id: 'classical',    name: '古典', icon: '◆',  desc: '暗黃羊皮・雕花墨痕' },
    { id: 'epic',         name: '史詩', icon: '⬡',  desc: '金色聖徽・深鐵榮耀' },
    { id: 'mythology',    name: '神話', icon: '△',  desc: '赤紅符文・古祭火光' }
  ],
  DEFAULT_THEME: 'scifi-horror',

  /** Card 資料根目錄 */
  CARD_BASE_PATH: './cards',

  /** Debug 監控儀表板 LocalStorage key */
  DEBUG_STATE_KEY: 'trpg_debug_state',
};
