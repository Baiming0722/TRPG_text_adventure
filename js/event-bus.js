// js/event-bus.js
// 全域發布/訂閱事件匯流排，用於解耦各模組之間的通訊

/**
 * 遊戲事件常數，對應規格書中的 EVT-01 ~ EVT-22
 * 使用常數避免拼錯事件名稱
 */
export const GameEvent = Object.freeze({
  // 外部事件
  GAME_ENTERED:       'game:entered',        // EVT-01
  NEW_GAME_STARTED:   'game:new-started',    // EVT-02
  TUTORIAL_SHOWN:     'tutorial:shown',      // EVT-03
  SCENE_DISPLAYED:    'scene:displayed',     // EVT-04
  ACTION_SELECTED:    'action:selected',     // EVT-05
  ACTION_COMMITTED:   'action:committed',
  DICE_ROLLED:        'dice:rolled',         // EVT-06
  DICE_PENDING:       'dice:pending',
  DICE_REVEALED:      'dice:revealed',
  COMBAT_TRIGGERED:   'combat:triggered',    // EVT-07
  CHARACTER_UPDATED:  'character:updated',   // EVT-08
  CHARACTER_VIEWED:   'character:viewed',    // EVT-09
  SAVE_REQUESTED:     'save:requested',      // EVT-10
  LOAD_REQUESTED:     'load:requested',      // EVT-11
  AUTO_SAVED:         'save:auto',           // EVT-12
  SPECIAL_EVENT:      'event:special',       // EVT-13
  STORY_BRANCHED:     'story:branched',      // EVT-14
  GAME_ENDED:         'game:ended',          // EVT-15
  EXPLORE_VIEWED:     'explore:viewed',      // EVT-16
  SPEEDRUN_TOGGLED:   'mode:speedrun',       // EVT-17
  TEST_MODE_ENTERED:  'mode:test',           // EVT-18
  STORY_MAINTAINED:   'story:maintained',    // EVT-19
  CHAR_MAINTAINED:    'char:maintained',     // EVT-20
  DICE_RULES_CHANGED: 'dice:rules-changed',  // EVT-21
  SYSTEM_CHECK:       'system:check',        // EVT-22

  // 補充事件（非規格書定義，內部協調用）
  UI_LOADING:         'ui:loading',
  UI_LOADED:          'ui:loaded',
  MAP_NODE_CHANGED:   'map:node-changed',
  COMBAT_ENDED:       'combat:ended',
  LLM_RESPONSE:       'llm:response',
  LLM_ERROR:          'llm:error',
  LLM_CANCEL_REQUESTED: 'llm:cancel-requested',
  LLM_CANCELLED:      'llm:cancelled',
  SAVE_DONE:          'save:done',
  LOAD_DONE:          'load:done',
  THEME_CHANGED:      'theme:changed',
  SETTINGS_CHANGED:   'settings:changed',
  STATE_CHANGED:      'state:changed',
  COMBAT_ROUND:       'combat:round',
  GAME_READY:         'game:ready',       // 角色/劇情載入完畢，等待使用者手動開始第一場景

  AUDIO_PLAY_SFX:          'audio:play-sfx',
  AUDIO_PLAY_BGM:          'audio:play-bgm',
  AUDIO_STOP_BGM:          'audio:stop-bgm',
  AUDIO_SETTINGS_CHANGED:  'audio:settings-changed',
});

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * 訂閱事件
   * @param {string} event - 事件名稱
   * @param {Function} handler - 處理函式
   * @returns {Function} 用於取消訂閱的函式
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    // 回傳 unsubscribe 函式，方便組件清理
    return () => this.off(event, handler);
  }

  /**
   * 訂閱事件（僅觸發一次後自動取消）
   * @param {string} event - 事件名稱
   * @param {Function} handler - 處理函式
   */
  once(event, handler) {
    const wrapper = (data) => {
      handler(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * 取消訂閱事件
   * @param {string} event - 事件名稱
   * @param {Function} handler - 要移除的處理函式
   */
  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 發布事件
   * @param {string} event - 事件名稱
   * @param {*} data - 事件資料
   */
  emit(event, data) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    // 複製 Set 避免在迭代中修改
    for (const handler of [...handlers]) {
      try {
        handler(data);
      } catch (error) {
        console.error(`[EventBus] 事件處理器錯誤（事件：${event}）：`, error);
      }
    }
  }

  /**
   * 清除所有監聽器（通常用於遊戲重置）
   */
  clear() {
    this._listeners.clear();
  }

  /** 除錯用：列出所有已註冊事件 */
  listEvents() {
    return [...this._listeners.keys()];
  }
}

// 全域單例
export const eventBus = new EventBus();
