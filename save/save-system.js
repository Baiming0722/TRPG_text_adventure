// save/save-system.js
// 存檔/讀檔系統：LocalStorage 實作，支援 3 槽手動存檔 + 自動存檔

import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';
import { CONFIG } from '../js/config.js';

/** 建構存檔資料物件 */
function buildSaveData(slot) {
  const state = gameState.getState();
  return {
    save_version: CONFIG.SAVE_VERSION,
    timestamp: new Date().toISOString(),
    slot,
    game_state: {
      character: state.character,
      currentScenarioId: state.currentScenarioId,
      currentNodeId: state.currentNodeId,
      currentMapId: state.currentMapId,
      flags: state.flags,
      mapState: state.mapState,
      conversationHistory: state.conversationHistory,
      playMode: state.playMode,
      currentTheme: state.currentTheme,
      lastScene: state.lastScene,  // 保存最後一場景，以便讀檔時直接還原
    },
  };
}

/**
 * 手動存檔至指定槽
 * @param {number} slot - 1~3
 * @returns {{ success: boolean, message: string }}
 */
export function saveGame(slot) {
  try {
    const data = buildSaveData(slot);
    const key = `${CONFIG.SAVE.SLOT_KEY_PREFIX}${slot}`;
    localStorage.setItem(key, JSON.stringify(data));
    _updateIndex(slot, data.timestamp, data.game_state.character?.name ?? '未知角色');
    return { success: true, message: '存檔成功' };
  } catch (error) {
    console.error('[SaveSystem] 存檔失敗：', error);
    return { success: false, message: `存檔失敗：${error.message}` };
  }
}

/**
 * 自動存檔
 * @returns {{ success: boolean }}
 */
export function autoSave() {
  try {
    const data = buildSaveData('auto');
    localStorage.setItem(CONFIG.SAVE.AUTO_SLOT_KEY, JSON.stringify(data));
    eventBus.emit(GameEvent.AUTO_SAVED, { timestamp: data.timestamp });
    gameState.addEventHistory({ eventId: 'EVT-12 (自動存檔)', result: '成功' });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * 從指定槽讀取存檔
 * @param {number|'auto'} slot
 * @returns {{ success: boolean, data: object|null, message: string }}
 */
export function loadGame(slot) {
  try {
    const key = slot === 'auto' ? CONFIG.SAVE.AUTO_SLOT_KEY : `${CONFIG.SAVE.SLOT_KEY_PREFIX}${slot}`;
    const raw = localStorage.getItem(key);
    if (!raw) return { success: false, data: null, message: '找不到存檔' };

    const saveData = JSON.parse(raw);

    // 版本兼容性檢查
    if (saveData.save_version !== CONFIG.SAVE_VERSION) {
      return { success: false, data: null, message: `存檔版本不相容（${saveData.save_version} ≠ ${CONFIG.SAVE_VERSION}）` };
    }

    gameState.restoreFromSave(saveData.game_state);
    // 注意：LOAD_DONE 事件由 game-engine.js 的 continueGame() 建複載後統一發予，避免重複觸發
    return { success: true, data: saveData, message: '讀檔成功' };
  } catch (error) {
    console.error('[SaveSystem] 讀檔失敗：', error);
    return { success: false, data: null, message: `讀檔失敗：${error.message}` };
  }
}

/**
 * 列出所有存檔槽資訊
 * @returns {object[]} 存檔槽摘要陣列
 */
export function listSlots() {
  const slots = [];

  // 手動存檔槽
  for (let i = 1; i <= CONFIG.SAVE.MAX_SLOTS; i++) {
    const key = `${CONFIG.SAVE.SLOT_KEY_PREFIX}${i}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        slots.push({
          slot: i,
          type: 'manual',
          timestamp: data.timestamp,
          characterName: data.game_state?.character?.name ?? '未知',
          characterClass: data.game_state?.character?.class ?? '',
          scenarioId: data.game_state?.currentScenarioId ?? '',
          nodeId: data.game_state?.currentNodeId ?? '',
          version: data.save_version,
          compatible: data.save_version === CONFIG.SAVE_VERSION,
        });
      } catch {
        slots.push({ slot: i, type: 'manual', corrupted: true });
      }
    } else {
      slots.push({ slot: i, type: 'manual', empty: true });
    }
  }

  // 自動存檔槽
  const autoRaw = localStorage.getItem(CONFIG.SAVE.AUTO_SLOT_KEY);
  if (autoRaw) {
    try {
      const data = JSON.parse(autoRaw);
      slots.push({
        slot: 'auto',
        type: 'auto',
        timestamp: data.timestamp,
        characterName: data.game_state?.character?.name ?? '未知',
        characterClass: data.game_state?.character?.class ?? '',
        version: data.save_version,
        compatible: data.save_version === CONFIG.SAVE_VERSION,
      });
    } catch {
      slots.push({ slot: 'auto', type: 'auto', corrupted: true });
    }
  }

  return slots;
}

/**
 * 刪除存檔槽
 * @param {number|'auto'} slot
 */
export function deleteSlot(slot) {
  const key = slot === 'auto' ? CONFIG.SAVE.AUTO_SLOT_KEY : `${CONFIG.SAVE.SLOT_KEY_PREFIX}${slot}`;
  localStorage.removeItem(key);
  _updateIndex(slot, null, null);
}

/**
 * 匯出存檔為 JSON 字串（下載用）
 * @param {number|'auto'} slot
 * @returns {string|null}
 */
export function exportSave(slot) {
  const key = slot === 'auto' ? CONFIG.SAVE.AUTO_SLOT_KEY : `${CONFIG.SAVE.SLOT_KEY_PREFIX}${slot}`;
  return localStorage.getItem(key);
}

/**
 * 從 JSON 字串匯入存檔至指定槽
 * @param {number} slot
 * @param {string} jsonString
 * @returns {{ success: boolean, message: string }}
 */
export function importSave(slot, jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.save_version || !data.game_state) {
      return { success: false, message: '無效的存檔格式' };
    }
    const key = `${CONFIG.SAVE.SLOT_KEY_PREFIX}${slot}`;
    data.slot = slot;
    localStorage.setItem(key, JSON.stringify(data));
    _updateIndex(slot, data.timestamp, data.game_state?.character?.name ?? '匯入存檔');
    return { success: true, message: '匯入成功' };
  } catch (error) {
    return { success: false, message: `匯入失敗：${error.message}` };
  }
}

/** 更新存檔索引（儲存槽的摘要資訊） */
function _updateIndex(slot, timestamp, characterName) {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE.INDEX_KEY);
    const index = raw ? JSON.parse(raw) : {};
    if (timestamp) {
      index[slot] = { timestamp, characterName };
    } else {
      delete index[slot];
    }
    localStorage.setItem(CONFIG.SAVE.INDEX_KEY, JSON.stringify(index));
  } catch { /* 靜默忽略 */ }
}
