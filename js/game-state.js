// js/game-state.js
// 集中式遊戲狀態管理，所有模組透過此存取與更新遊戲狀態

import { eventBus, GameEvent } from './event-bus.js';
import { CONFIG } from './config.js';

/**
 * 初始遊戲狀態結構（深度複製後使用）
 */
const INITIAL_STATE = {
  /** 角色資料（CharacterCard） */
  character: null,
  /** 當前劇情卡 ID */
  currentScenarioId: null,
  /** 當前地圖節點 ID */
  currentNodeId: null,
  /** 當前地圖卡 ID */
  currentMapId: null,
  /** 全域旗標（key-value 對） */
  flags: {},
  /** 地圖探索狀態 { mapId: { nodeId: { explored, locked } } } */
  mapState: {},
  /** LLM 對話歷史 */
  conversationHistory: [],
  /** 遊玩模式 */
  playMode: 'normal',
  /** 是否為首次遊玩 */
  isFirstPlay: true,
  /** 最後一次 LLM 回傳的場景資料 */
  lastScene: null,
  /** 已載入的劇情卡資料 */
  currentScenarioCard: null,
  /** 已載入的地圖卡資料 */
  currentMapCard: null,
  /** 最近 N 筆骰子判定紀錄（供 Debug 儀表板使用） */
  diceHistory: [],
  /** 最近 N 筆事件觸發紀錄 */
  eventHistory: [],
  /** 上一次準備送出的 LLM Prompt（供 Debug 儀表板使用） */
  lastPrompt: null,
  /** 色彩主題 */
  currentTheme: CONFIG.DEFAULT_THEME,
  /** LLM 設定 */
  llmSettings: {
    provider: CONFIG.LLM.DEFAULT_PROVIDER,
    apiKey: '',
    temperature: CONFIG.LLM.PROVIDERS[CONFIG.LLM.DEFAULT_PROVIDER].temperature,
  },
  /** 音訊設定 */
  audioSettings: {
    enabled: CONFIG.AUDIO.enabled,
    muted: CONFIG.AUDIO.muted,
    bgmVolume: CONFIG.AUDIO.bgmVolume,
    sfxVolume: CONFIG.AUDIO.sfxVolume,
    bgmMode: CONFIG.AUDIO.bgmMode,
    bgmStyle: CONFIG.AUDIO.bgmStyle,
  },
};

class GameState {
  constructor() {
    this._state = this._deepClone(INITIAL_STATE);
    try {
      const savedSettings = localStorage.getItem('trpg_llm_settings');
      if (savedSettings) {
        this._state.llmSettings = { ...this._state.llmSettings, ...JSON.parse(savedSettings) };
      }
      const savedAudioSettings = localStorage.getItem(CONFIG.AUDIO.STORAGE_KEY);
      if (savedAudioSettings) {
        this._state.audioSettings = { ...this._state.audioSettings, ...JSON.parse(savedAudioSettings) };
      }
    } catch (e) {
      console.warn('無法讀取 LocalStorage 中的設定', e);
    }
  }

  /**
   * 取得完整的遊戲狀態（唯讀快照）
   * @returns {object}
   */
  getState() {
    return this._state;
  }

  /**
   * 取得指定路徑的狀態值
   * @param {string} path - 以 '.' 分隔的路徑，例如 'character.stats.STR'
   * @returns {*}
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this._state);
  }

  /**
   * 更新部分狀態（淺層合併），並觸發 state:changed 事件
   * @param {object} patch - 要合併的狀態片段
   * @param {boolean} [silent=false] - 是否靜默更新（不 emit 事件）
   */
  update(patch, silent = false) {
    Object.assign(this._state, patch);
    if (!silent) {
      eventBus.emit(GameEvent.STATE_CHANGED, { patch, state: this._state });
    }
    this._syncDebugState();
  }

  /**
   * 設定旗標
   * @param {string} key
   * @param {*} value
   */
  setFlag(key, value) {
    this._state.flags[key] = value;
    eventBus.emit(GameEvent.STATE_CHANGED, { patch: { flags: this._state.flags }, state: this._state });
    this._syncDebugState();
  }

  /**
   * 取得旗標值
   * @param {string} key
   * @returns {*}
   */
  getFlag(key) {
    return this._state.flags[key];
  }

  /**
   * 更新地圖節點狀態
   * @param {string} mapId
   * @param {string} nodeId
   * @param {object} nodeUpdate - 例如 { explored: true }
   */
  updateMapNode(mapId, nodeId, nodeUpdate) {
    if (!this._state.mapState[mapId]) {
      this._state.mapState[mapId] = {};
    }
    if (!this._state.mapState[mapId][nodeId]) {
      this._state.mapState[mapId][nodeId] = {};
    }
    Object.assign(this._state.mapState[mapId][nodeId], nodeUpdate);
    this._syncDebugState();
  }

  /**
   * 取得地圖節點狀態
   * @param {string} mapId
   * @param {string} nodeId
   * @returns {object}
   */
  getMapNodeState(mapId, nodeId) {
    return this._state.mapState[mapId]?.[nodeId] ?? {};
  }

  /**
   * 新增對話歷史，並自動修剪超過上限的舊對話
   * @param {string} role - 'user' | 'assistant' | 'system'
   * @param {string} content
   */
  addConversationHistory(role, content) {
    this._state.conversationHistory.push({ role, content });
    const max = CONFIG.MAX_HISTORY * 2; // 每輪含 user + assistant
    if (this._state.conversationHistory.length > max) {
      // 保留第一條（system），移除最舊的一對
      const systemMessages = this._state.conversationHistory.filter(m => m.role === 'system');
      const others = this._state.conversationHistory.filter(m => m.role !== 'system');
      const trimmed = others.slice(-max);
      this._state.conversationHistory = [...systemMessages, ...trimmed];
    }
  }

  /**
   * 新增骰子判定紀錄
   * @param {object} diceResult - 判定結果物件
   */
  addDiceHistory(diceResult) {
    this._state.diceHistory.unshift({ ...diceResult, timestamp: new Date().toISOString() });
    if (this._state.diceHistory.length > 20) {
      this._state.diceHistory = this._state.diceHistory.slice(0, 20);
    }
    this._syncDebugState();
  }

  /**
   * 新增事件觸發紀錄
   * @param {object} eventRecord - { eventId, condition, result }
   */
  addEventHistory(eventRecord) {
    this._state.eventHistory.unshift({ ...eventRecord, timestamp: new Date().toISOString() });
    if (this._state.eventHistory.length > 30) {
      this._state.eventHistory = this._state.eventHistory.slice(0, 30);
    }
    this._syncDebugState();
  }

  /**
   * 重置遊戲狀態（開始新遊戲時使用）
   */
  reset() {
    const prevSettings = this._state.llmSettings;
    const prevTheme = this._state.currentTheme;
    const prevAudioSettings = this._state.audioSettings;
    this._state = this._deepClone(INITIAL_STATE);
    this._state.llmSettings = prevSettings ?? this._state.llmSettings;
    this._state.currentTheme = prevTheme ?? this._state.currentTheme;
    this._state.audioSettings = prevAudioSettings ?? this._state.audioSettings;
  }

  /**
   * 從存檔資料還原狀態
   * @param {object} savedGameState
   */
  restoreFromSave(savedGameState) {
    Object.assign(this._state, savedGameState);
    eventBus.emit(GameEvent.STATE_CHANGED, { state: this._state });
    this._syncDebugState();
  }

  /**
   * 將 DebugState 寫入 LocalStorage 供監控儀表板讀取
   */
  _syncDebugState() {
    try {
      const debugState = {
        timestamp: Date.now(),
        character: this._state.character,
        currentScenarioCard: this._state.currentScenarioCard,
        currentMapCard: this._state.currentMapCard,
        currentNodeId: this._state.currentNodeId,
        mapState: this._state.mapState,
        flags: this._state.flags,
        diceHistory: this._state.diceHistory,
        eventHistory: this._state.eventHistory,
        lastPrompt: this._state.lastPrompt,
        playMode: this._state.playMode,
      };
      localStorage.setItem(CONFIG.DEBUG_STATE_KEY, JSON.stringify(debugState));
    } catch {
      // LocalStorage 可能在隱私模式下不可用，靜默忽略
    }
  }

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

// 全域單例
export const gameState = new GameState();
