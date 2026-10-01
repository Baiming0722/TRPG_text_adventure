// dice/dice-system.js
// 判定系統：擲骰、行動值計算、結果閾值判定

import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';
import { CONFIG } from '../js/config.js';
import {
  getEffectiveStat,
  getClassBonus,
  getSkillBonus,
  getStatusModifier,
  applyPermanentChange,
} from '../character/character-system.js';

/** 測試模式強制骰值，null 表示使用隨機擲骰 */
let _forcedDiceValue = null;
let _forcedDiceType = null;

/**
 * 設定強制骰子結果（測試模式用）
 * @param {number|null} value - 強制值（2~12），null 取消
 */
export function setForcedDiceValue(value) {
  _forcedDiceValue = value;
}

export function getForcedDiceValue() {
  return _forcedDiceValue;
}

/**
 * 設定強制骰子類型（測試模式用）
 * @param {string|null} type - 強制類型（"2d4", "1d20" 等），null 取消
 */
export function setForcedDiceType(type) {
  _forcedDiceType = type;
}

export function getForcedDiceType() {
  return _forcedDiceType;
}

/**
 * 擲骰（預設 2d6）
 * @param {number} [count=2] - 骰子數量
 * @param {number} [sides=6] - 骰子面數
 * @returns {{ rolls: number[], total: number }}
 */
export function rollDice(count = 2, sides = 6) {
  if (_forcedDiceValue !== null) {
    const rolls = [];
    let remaining = _forcedDiceValue;
    for (let i = 0; i < count; i++) {
      const val = i === count - 1 ? remaining : Math.min(sides, remaining - (count - i - 1));
      rolls.push(Math.max(1, Math.min(sides, val)));
      remaining -= rolls[rolls.length - 1];
    }
    return { rolls, total: _forcedDiceValue };
  }

  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return { rolls, total: rolls.reduce((sum, r) => sum + r, 0) };
}

/**
 * 依行動值查找判定結果
 * @param {number} actionValue
 * @param {string|null} diceType - 骰子類型
 * @returns {object} 對應的結果條目
 */
export function lookupResult(actionValue, diceType = null) {
  const typeConfig = diceType ? CONFIG.DICE.DICE_TYPES[diceType] : null;
  const table = (typeConfig?.resultTable) ?? CONFIG.DICE.RESULT_TABLE;
  for (const entry of table) {
    if (actionValue >= entry.min && actionValue <= entry.max) {
      return entry;
    }
  }
  // 安全 fallback
  return table[table.length - 1];
}

/**
 * 準備行動判定，回傳詳細結果但不觸發可見結果與副作用。
 * LLM 成功回應後才呼叫 commitCheck() 正式揭露與套用結果。
 *
 * 公式：行動值 = Roll(2d6) + 職業加成 + 技能加成 + 狀態增減 + 幸運修正
 *
 * @param {string[]} actionTags - 行動標籤 ['combat', 'explore', 'talk']
 * @param {string} actionLabel - 行動描述（用於 Log 顯示）
 * @param {string|null} diceType - 骰子類型（'2d4', '2d6', '1d20' 等）
 * @returns {object} 尚未提交的判定結果物件
 */
export function prepareCheck(actionTags, actionLabel = '', diceType = null) {
  const character = gameState.get('character');
  if (!character) throw new Error('角色尚未載入，無法執行判定');

  // 決定最終使用的骰子類型與設定
  const finalType = _forcedDiceType || diceType || CONFIG.DICE.DEFAULT_DICE_TYPE || '2d6';
  const typeConfig = CONFIG.DICE.DICE_TYPES[finalType] ?? { count: 2, sides: 6, resultTable: null };

  // 1. 擲骰
  const diceResult = rollDice(typeConfig.count, typeConfig.sides);

  // 2. 職業加成
  const classBonus = getClassBonus(character.class, actionTags);

  // 3. 技能加成
  const skillBonus = getSkillBonus(character, actionTags);

  // 4. 狀態效果修正
  const statusModifier = getStatusModifier(character);

  // 5. 幸運修正
  const luck = getEffectiveStat(character, 'LUCK');
  let luckModifier = 0;
  if (luck > CONFIG.DICE.LUCK_HIGH_THRESHOLD) {
    luckModifier = CONFIG.DICE.LUCK_HIGH_BONUS;
  } else if (luck < CONFIG.DICE.LUCK_LOW_THRESHOLD) {
    luckModifier = CONFIG.DICE.LUCK_LOW_PENALTY;
  }

  // 6. 計算行動值
  const actionValue = diceResult.total + classBonus + skillBonus + statusModifier + luckModifier;

  // 7. 查閾值表
  const resultEntry = lookupResult(actionValue, finalType);

  const checkResult = {
    actionLabel,
    actionTags,
    diceType: finalType,
    rolls: diceResult.rolls,
    diceTotal: diceResult.total,
    classBonus,
    skillBonus,
    statusModifier,
    luckModifier,
    actionValue,
    outcome: resultEntry.outcome,
    label: resultEntry.label,
    luckEffect: resultEntry.luckEffect,
    isForcedRoll: _forcedDiceValue !== null,
    committed: false,
  };

  eventBus.emit(GameEvent.DICE_PENDING, checkResult);
  return checkResult;
}

/**
 * 正式提交判定結果：套用副作用、寫入 debug history，並通知 UI 揭露結果。
 * @param {object|null} checkResult
 * @returns {object|null}
 */
export function commitCheck(checkResult) {
  if (!checkResult || checkResult.committed) return checkResult ?? null;

  // 套用幸運副作用（大成功/大失敗改變 LUCK）
  if (checkResult.luckEffect !== 0) {
    applyPermanentChange('LUCK', checkResult.luckEffect);
  }

  checkResult.committed = true;

  // 記錄至 DebugState
  gameState.addDiceHistory(checkResult);

  // 發布揭露事件
  eventBus.emit(GameEvent.DICE_REVEALED, checkResult);

  return checkResult;
}

/**
 * 執行完整行動判定。保留給測試面板或舊呼叫點使用。
 * @param {string[]} actionTags
 * @param {string} actionLabel
 * @param {string|null} diceType
 * @returns {object}
 */
export function performCheck(actionTags, actionLabel = '', diceType = null) {
  return commitCheck(prepareCheck(actionTags, actionLabel, diceType));
}

/**
 * 將判定結果格式化為 Log 訊息字串（繁體中文）
 * @param {object} result - performCheck 的回傳值
 * @returns {string}
 */
export function formatCheckResult(result) {
  const typeStr = result.diceType ?? '2d6';
  const parts = [
    `骰子（${typeStr}）：${result.rolls.join('+')} = ${result.diceTotal}`,
  ];
  if (result.classBonus !== 0) parts.push(`職業加成：+${result.classBonus}`);
  if (result.skillBonus !== 0) parts.push(`技能加成：+${result.skillBonus}`);
  if (result.statusModifier !== 0) parts.push(`狀態修正：${result.statusModifier}`);
  if (result.luckModifier !== 0) parts.push(`幸運修正：${result.luckModifier}`);
  parts.push(`行動值 = ${result.actionValue} → ${result.label}`);
  if (result.luckEffect !== 0) {
    parts.push(`LUCK ${result.luckEffect > 0 ? '+' : ''}${result.luckEffect}`);
  }
  if (result.isForcedRoll) parts.push('（測試模式：強制骰值）');
  return parts.join('  |  ');
}
