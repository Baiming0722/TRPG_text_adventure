// character/character-system.js
// 角色系統：管理角色屬性、職業加成、技能、狀態效果與數值變動

import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';
import { CONFIG } from '../js/config.js';

/**
 * 計算角色某屬性的實際值（基礎值 + 臨時修正 + 狀態效果）
 * @param {object} character - 角色資料
 * @param {string} stat - 屬性名稱 (STR, DEX, INT, POW, MOV, HP, SAN, LUCK)
 * @returns {number} 實際屬性值
 */
export function getEffectiveStat(character, stat) {
  const base = character.stats[stat] ?? character.derived_stats?.[stat] ?? 0;
  
  // 累計臨時修正
  const tempBonus = (character.temp_modifiers ?? [])
    .filter(m => m.stat === stat)
    .reduce((sum, m) => sum + m.value, 0);

  return Math.max(0, base + tempBonus);
}

/**
 * 套用臨時屬性修正（buff/debuff）
 * @param {string} stat - 屬性名稱
 * @param {number} value - 修正值（可為負）
 * @param {number} [duration=null] - 持續回合數（null 表示直到手動移除）
 * @param {string} [source=''] - 修正來源說明
 */
export function applyBuff(stat, value, duration = null, source = '') {
  const character = gameState.get('character');
  if (!character) return;

  character.temp_modifiers = character.temp_modifiers ?? [];
  character.temp_modifiers.push({
    id: `buff_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    stat,
    value,
    duration,
    source,
  });

  gameState.update({ character });
  eventBus.emit(GameEvent.CHARACTER_UPDATED, { character, type: 'buff', stat, value });
}

/**
 * 移除指定的臨時修正
 * @param {string} buffId - buff 的 id
 */
export function removeBuff(buffId) {
  const character = gameState.get('character');
  if (!character) return;

  character.temp_modifiers = (character.temp_modifiers ?? []).filter(m => m.id !== buffId);
  gameState.update({ character });
  eventBus.emit(GameEvent.CHARACTER_UPDATED, { character, type: 'buff_removed', buffId });
}

/**
 * 永久變更屬性值（劇情結果）
 * @param {string} stat - 屬性名稱
 * @param {number} delta - 變更量（可為負）
 */
export function applyPermanentChange(stat, delta) {
  const character = gameState.get('character');
  if (!character) return;

  if (character.stats[stat] !== undefined) {
    character.stats[stat] = Math.max(0, character.stats[stat] + delta);
  } else if (character.derived_stats?.[stat] !== undefined) {
    character.derived_stats[stat] = Math.max(0, character.derived_stats[stat] + delta);
  }

  gameState.update({ character });
  eventBus.emit(GameEvent.CHARACTER_UPDATED, { character, type: 'permanent', stat, delta });
}

/**
 * 新增狀態效果（中毒、受傷、疲勞等）
 * @param {object} effect - { id, name, description }
 */
export function addStatusEffect(effect) {
  const character = gameState.get('character');
  if (!character) return;

  character.status_effects = character.status_effects ?? [];
  // 避免重複
  if (!character.status_effects.find(e => e.id === effect.id)) {
    character.status_effects.push(effect);
    gameState.update({ character });
    eventBus.emit(GameEvent.CHARACTER_UPDATED, { character, type: 'status_added', effect });
  }
}

/**
 * 移除狀態效果
 * @param {string} effectId - 效果 id
 */
export function removeStatusEffect(effectId) {
  const character = gameState.get('character');
  if (!character) return;

  character.status_effects = (character.status_effects ?? []).filter(e => e.id !== effectId);
  gameState.update({ character });
  eventBus.emit(GameEvent.CHARACTER_UPDATED, { character, type: 'status_removed', effectId });
}

/**
 * 取得角色職業對應指定行動標籤的加成值
 * @param {string} characterClass - 職業名稱
 * @param {string[]} actionTags - 行動標籤陣列 ['combat', 'explore', 'talk']
 * @returns {number} 職業加成值（0~3）
 */
export function getClassBonus(characterClass, actionTags) {
  const bonusMap = CONFIG.DICE.CLASS_BONUS_MAP[characterClass] ?? {};
  let maxBonus = 0;
  for (const tag of (actionTags ?? [])) {
    const bonus = bonusMap[tag] ?? 0;
    if (bonus > maxBonus) maxBonus = bonus;
  }
  return maxBonus;
}

/**
 * 取得角色技能對應行動標籤的加成值
 * @param {object} character
 * @param {string[]} actionTags
 * @returns {number} 技能加成值（0~3）
 */
export function getSkillBonus(character, actionTags) {
  const skills = character.skills ?? [];
  let total = 0;
  for (const skill of skills) {
    if (actionTags.includes(skill.type?.toLowerCase()) ||
        actionTags.includes(skill.name)) {
      total += skill.bonus ?? 0;
    }
  }
  return Math.min(3, total);
}

/**
 * 取得角色狀態效果對判定的修正值
 * @param {object} character
 * @returns {number} 狀態修正值
 */
export function getStatusModifier(character) {
  const effects = character.status_effects ?? [];
  let total = 0;
  for (const effect of effects) {
    total += CONFIG.DICE.STATUS_EFFECT_MODIFIERS[effect.name] ?? 0;
  }
  return total;
}

/**
 * 完成結局後，將當前數值匯出為新的角色卡 JSON（CHAR-08）
 * @param {string} newName - 新角色卡名稱（可與原角色相同）
 * @returns {object} 新角色卡
 */
export function exportAsNewCard(newName) {
  const character = gameState.get('character');
  if (!character) return null;

  const newCard = JSON.parse(JSON.stringify(character));
  newCard.id = `char_custom_${Date.now()}`;
  newCard.name = newName || character.name;
  // 清除臨時修正與狀態效果，保留永久數值
  newCard.temp_modifiers = [];
  newCard.status_effects = [];
  return newCard;
}

/**
 * 從 JSON Card 載入角色資料
 * @param {object} cardData - 角色卡 JSON 物件
 */
export function loadCharacter(cardData) {
  const character = {
    ...cardData,
    temp_modifiers: cardData.temp_modifiers ?? [],
    status_effects: cardData.status_effects ?? [],
    inventory: cardData.inventory ?? [],
  };
  gameState.update({ character });
  eventBus.emit(GameEvent.CHARACTER_UPDATED, { character, type: 'loaded' });
}

/**
 * 應用速通模式加成（所有屬性 +20%）
 */
export function applySpeedrunBonus() {
  const character = gameState.get('character');
  if (!character) return;

  const stats = ['STR', 'DEX', 'INT', 'POW', 'MOV'];
  stats.forEach(stat => {
    if (character.stats[stat] !== undefined) {
      character.stats[stat] = Math.min(99, Math.round(character.stats[stat] * 1.2));
    }
  });
  const derivedStats = ['HP', 'SAN', 'LUCK'];
  derivedStats.forEach(stat => {
    if (character.derived_stats?.[stat] !== undefined) {
      character.derived_stats[stat] = Math.min(200, Math.round(character.derived_stats[stat] * 1.2));
    }
  });

  gameState.update({ character });
  eventBus.emit(GameEvent.CHARACTER_UPDATED, { character, type: 'speedrun_bonus' });
}
