// combat/combat-system.js
// 回合制戰鬥系統

import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';
import { CONFIG } from '../js/config.js';
import { rollDice } from '../dice/dice-system.js';
import { getEffectiveStat, applyPermanentChange } from '../character/character-system.js';

/** 當前戰鬥狀態 */
let _combatState = null;

/**
 * 取得當前戰鬥狀態（null 表示不在戰鬥中）
 * @returns {object|null}
 */
export function getCombatState() {
  return _combatState;
}

/**
 * 開始戰鬥
 * @param {object} enemy - { name, hp, str, description }
 * @returns {object} 初始戰鬥狀態
 */
export function startCombat(enemy) {
  const character = gameState.get('character');
  if (!character) throw new Error('角色尚未載入');

  const playerHp = getEffectiveStat(character, 'HP');
  _combatState = {
    round: 0,
    isActive: true,
    player: {
      name: character.name,
      hp: playerHp,
      maxHp: playerHp,
      str: getEffectiveStat(character, 'STR'),
    },
    enemy: {
      name: enemy.name ?? '未知敵人',
      hp: enemy.hp ?? CONFIG.COMBAT.ENEMY_DEFAULT_HP,
      maxHp: enemy.hp ?? CONFIG.COMBAT.ENEMY_DEFAULT_HP,
      str: enemy.str ?? 30,
      description: enemy.description ?? '',
    },
    log: [],
    result: null,
  };

  eventBus.emit(GameEvent.COMBAT_TRIGGERED, { combatState: _combatState });
  return _combatState;
}

/**
 * 執行一個完整戰鬥回合（玩家攻擊 → 敵人攻擊）
 * @returns {{ log: string[], isOver: boolean, result: string|null }}
 */
export function executeCombatRound() {
  if (!_combatState?.isActive) throw new Error('目前不在戰鬥中');

  _combatState.round += 1;
  const roundLog = [];

  // --- 玩家攻擊 ---
  const playerRoll = rollDice(2, 6);
  const playerStr = _combatState.player.str;
  const playerDamage = Math.max(1, Math.floor(playerRoll.total + playerStr / 30));
  _combatState.enemy.hp = Math.max(0, _combatState.enemy.hp - playerDamage);

  roundLog.push(
    `⚔️ 你的攻擊：擲骰 ${playerRoll.rolls.join('+')} + STR/30 = 造成 ${playerDamage} 點傷害。` +
    `（${_combatState.enemy.name} HP: ${_combatState.enemy.hp}/${_combatState.enemy.maxHp}）`
  );

  // --- 判斷敵人是否陣亡 ---
  if (_combatState.enemy.hp <= 0) {
    _combatState.isActive = false;
    _combatState.result = 'victory';
    roundLog.push(`🏆 ${_combatState.enemy.name} 已被擊倒！你獲得了勝利！`);
    _combatState.log.push(...roundLog);

    eventBus.emit(GameEvent.COMBAT_ROUND, { round: _combatState.round, log: roundLog });
    eventBus.emit(GameEvent.COMBAT_ENDED, { result: 'victory', combatState: _combatState });
    return { log: roundLog, isOver: true, result: 'victory' };
  }

  // --- 敵人攻擊 ---
  const enemyRoll = rollDice(2, 6);
  const enemyStr = _combatState.enemy.str;
  const enemyDamage = Math.max(1, Math.floor(enemyRoll.total + enemyStr / 30));
  _combatState.player.hp = Math.max(0, _combatState.player.hp - enemyDamage);

  roundLog.push(
    `💥 ${_combatState.enemy.name} 的反擊：造成 ${enemyDamage} 點傷害。` +
    `（你的 HP: ${_combatState.player.hp}/${_combatState.player.maxHp}）`
  );

  // --- 判斷玩家是否陣亡 ---
  if (_combatState.player.hp <= 0) {
    _combatState.isActive = false;
    _combatState.result = 'defeat';
    roundLog.push(`💀 你已倒下... 戰鬥失敗。`);
    _combatState.log.push(...roundLog);

    // 套用戰鬥失敗懲罰
    _applyDefeatPenalty();

    eventBus.emit(GameEvent.COMBAT_ROUND, { round: _combatState.round, log: roundLog });
    eventBus.emit(GameEvent.COMBAT_ENDED, { result: 'defeat', combatState: _combatState });
    return { log: roundLog, isOver: true, result: 'defeat' };
  }

  _combatState.log.push(...roundLog);
  eventBus.emit(GameEvent.COMBAT_ROUND, { round: _combatState.round, log: roundLog });
  return { log: roundLog, isOver: false, result: null };
}

/**
 * 套用戰鬥失敗懲罰（COMBAT 規格：全屬性 -20%，HP -20, SAN -20, MOV -3）
 */
function _applyDefeatPenalty() {
  const penalty = CONFIG.COMBAT.DEFEAT_PENALTY;
  const character = gameState.get('character');
  if (!character) return;

  ['STR', 'DEX', 'INT', 'POW', 'MOV'].forEach(stat => {
    if (character.stats[stat] !== undefined) {
      const delta = -Math.floor(character.stats[stat] * (1 - penalty.statMultiplier));
      applyPermanentChange(stat, delta);
    }
  });

  applyPermanentChange('HP', penalty.hpPenalty);
  applyPermanentChange('SAN', penalty.sanPenalty);
  applyPermanentChange('MOV', penalty.movPenalty);

  // 同步 HP 到戰鬥狀態
  _combatState.player.hp = Math.max(0, getEffectiveStat(character, 'HP'));
}

/**
 * 強制結束戰鬥（逃跑或劇情需要）
 */
export function endCombat() {
  if (_combatState) {
    _combatState.isActive = false;
    _combatState.result = _combatState.result ?? 'fled';
  }
  _combatState = null;
}
