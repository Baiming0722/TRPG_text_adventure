// event/event-system.js
// 劇情/事件系統：管理劇情節點切換、條件分支、結局觸發與特殊事件

import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';
import { CONFIG } from '../js/config.js';
import { getEffectiveStat, applyPermanentChange, addStatusEffect } from '../character/character-system.js';

/** 已載入的事件卡快取 */
const _eventCache = new Map();

/**
 * 載入劇情卡
 * @param {string} scenarioId
 * @returns {Promise<object>} 劇情卡資料
 */
export async function loadScenario(scenarioId) {
  const response = await fetch(`${CONFIG.CARD_BASE_PATH}/scenarios/${scenarioId}.json`);
  if (!response.ok) throw new Error(`無法載入劇情卡：${scenarioId}`);
  const card = await response.json();
  gameState.update({ currentScenarioId: scenarioId, currentScenarioCard: card });
  return card;
}

/**
 * 載入事件卡（帶快取）
 * @param {string} eventId
 * @returns {Promise<object>} 事件卡資料
 */
export async function loadEvent(eventId) {
  if (_eventCache.has(eventId)) return _eventCache.get(eventId);
  const response = await fetch(`${CONFIG.CARD_BASE_PATH}/events/${eventId}.json`);
  if (!response.ok) throw new Error(`無法載入事件卡：${eventId}`);
  const card = await response.json();
  _eventCache.set(eventId, card);
  return card;
}

/**
 * 檢查事件觸發條件是否滿足
 * @param {object} condition - 條件物件
 * @param {object} state - 當前 GameState
 * @returns {boolean}
 */
export function checkCondition(condition, state) {
  if (!condition) return true;

  const character = state.character;
  const flags = state.flags ?? {};

  // 旗標條件
  if (condition.flag !== undefined) {
    if (condition.flag_value !== undefined) {
      if (flags[condition.flag] !== condition.flag_value) return false;
    } else {
      if (!flags[condition.flag]) return false;
    }
  }

  // 屬性閾值條件
  if (condition.stat && condition.min !== undefined) {
    const value = getEffectiveStat(character, condition.stat);
    if (value < condition.min) return false;
  }
  if (condition.stat && condition.max !== undefined) {
    const value = getEffectiveStat(character, condition.stat);
    if (value > condition.max) return false;
  }

  // HP 條件
  if (condition.hp_lte !== undefined) {
    const hp = getEffectiveStat(character, 'HP');
    if (hp > condition.hp_lte) return false;
  }
  if (condition.hp_gt !== undefined) {
    const hp = getEffectiveStat(character, 'HP');
    if (hp <= condition.hp_gt) return false;
  }

  // SAN 條件
  if (condition.san_lte !== undefined) {
    const san = getEffectiveStat(character, 'SAN');
    if (san > condition.san_lte) return false;
  }

  // 已觸發事件條件
  if (condition.event_triggered) {
    if (!flags[`${condition.event_triggered}_triggered`]) return false;
  }

  // 目前節點條件
  if (condition.current_node !== undefined) {
    if (state.currentNodeId !== condition.current_node) return false;
  }

  // 目前地圖條件
  if (condition.current_map !== undefined) {
    if (state.currentMapId !== condition.current_map) return false;
  }

  return true;
}

/**
 * 執行事件效果（更新角色數值、旗標、地圖狀態）
 * @param {object} eventCard - 事件卡資料
 * @returns {string[]} 效果描述字串陣列（用於 Log 顯示）
 */
export function executeEventEffects(eventCard) {
  const effects = eventCard.effects ?? [];
  const logMessages = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'set_flag':
        gameState.setFlag(effect.key, effect.value ?? true);
        if (effect.description) logMessages.push(`📌 ${effect.description}`);
        break;

      case 'stat_change':
        applyPermanentChange(effect.stat, effect.delta);
        logMessages.push(`📊 ${effect.stat} ${effect.delta > 0 ? '+' : ''}${effect.delta}`);
        break;

      case 'add_status':
        addStatusEffect({ id: effect.id, name: effect.name, description: effect.description ?? '' });
        logMessages.push(`⚠️ 獲得狀態效果：${effect.name}`);
        break;

      case 'unlock_node':
        gameState.updateMapNode(
          gameState.get('currentMapId'),
          effect.node_id,
          { locked: false }
        );
        gameState.setFlag(`node_${effect.node_id}_unlocked`, true);
        eventBus.emit(GameEvent.MAP_NODE_CHANGED, { nodeId: effect.node_id, unlocked: true });
        logMessages.push(`🗝️ 解鎖新區域：${effect.node_name ?? effect.node_id}`);
        break;

      case 'add_item':
        {
          const character = gameState.get('character');
          character.inventory = character.inventory ?? [];
          character.inventory.push({ id: effect.item_id, name: effect.item_name, description: effect.description ?? '' });
          gameState.update({ character });
          logMessages.push(`🎒 獲得道具：${effect.item_name}`);
        }
        break;

      default:
        console.warn(`[EventSystem] 未知效果類型：${effect.type}`);
    }
  }

  // 標記事件為已觸發
  gameState.setFlag(`${eventCard.id}_triggered`, true);

  // 記錄事件歷史（供探索紀錄與 Debug 儀表板使用）
  gameState.addEventHistory({
    eventId: eventCard.id,
    eventTitle: eventCard.title,
    condition: eventCard.trigger_condition,
    effects: effects.map(e => e.type),
  });

  eventBus.emit(GameEvent.SPECIAL_EVENT, { eventCard, logMessages });
  return logMessages;
}

/**
 * 掃描並自動觸發符合條件的事件
 * @param {string[]} eventIds - 要檢查的事件 ID 清單
 */
export async function checkAndTriggerEvents(eventIds) {
  const triggered = [];

  for (const eventId of eventIds) {
    const state = gameState.getState();
    // 跳過已觸發事件
    if (state.flags[`${eventId}_triggered`]) continue;

    try {
      const eventCard = await loadEvent(eventId);
      if (checkCondition(eventCard.trigger_condition, state)) {
        const logMessages = executeEventEffects(eventCard);
        triggered.push({ eventCard, logMessages });
        eventBus.emit(GameEvent.STORY_BRANCHED, { eventId, eventCard });
      }
    } catch (error) {
      console.error(`[EventSystem] 檢查事件 ${eventId} 失敗：`, error);
    }
  }

  return triggered;
}

/**
 * 判定結局類型
 * @returns {{ type: 'success'|'failure'|'normal'|'open'|null, message: string }}
 */
export function checkEnding() {
  const state = gameState.getState();
  const scenario = state.currentScenarioCard;
  const character = state.character;
  if (!scenario || !character) return { type: null, message: '' };

  const hp = getEffectiveStat(character, 'HP');
  const san = getEffectiveStat(character, 'SAN');
  const exitConditions = scenario.exit_conditions ?? {};

  // 失敗結局：HP ≤ 0
  if (exitConditions.failure && checkCondition(exitConditions.failure, state)) {
    return { type: 'failure', message: '你倒下了... 但這不是終點。' };
  }

  // 成功結局
  if (exitConditions.success && checkCondition(exitConditions.success, state)) {
    return { type: 'success', message: '你成功完成了任務！' };
  }

  // 開放式結局
  if (exitConditions.open && checkCondition(exitConditions.open, state)) {
    return { type: 'open', message: '你的故事還沒結束，未來等著你去書寫。' };
  }

  // 普通結局：SAN ≤ 0 且未完成目標
  if (exitConditions.normal && checkCondition(exitConditions.normal, state)) {
    return { type: 'normal', message: '你離開了這裡，但心中留下了未解的謎。' };
  }

  return { type: null, message: '' };
}
