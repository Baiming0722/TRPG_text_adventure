// js/system-check.js
// 統一健康檢查模組 (EVT-22)

import { eventBus, GameEvent } from './event-bus.js';
import { gameState } from './game-state.js';

class SystemChecker {
  constructor() {
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;
    eventBus.on(GameEvent.SYSTEM_CHECK, () => this.runDiagnostics());
  }

  runDiagnostics() {
    let corrected = false;
    const messages = [];

    // 1. Character Stats Validation
    const character = gameState.get('character');
    if (character) {
      // Check HP
      if (typeof character.derived_stats?.HP !== 'number' || isNaN(character.derived_stats.HP)) {
        character.derived_stats.HP = 1;
        messages.push('已修正異常的角色 HP (重置為 1)');
        corrected = true;
      } else if (character.derived_stats.HP < 0) {
        character.derived_stats.HP = 0;
        messages.push('已修正低於 0 的角色 HP');
        corrected = true;
      }

      // Check SAN
      if (typeof character.derived_stats?.SAN !== 'number' || isNaN(character.derived_stats.SAN)) {
        character.derived_stats.SAN = 0;
        messages.push('已修正異常的 SAN 數值 (重置為 0)');
        corrected = true;
      }
      
      // Check Base Stats
      const baseStats = ['STR', 'DEX', 'INT', 'POW', 'MOV', 'LUCK'];
      for (const stat of baseStats) {
        if (typeof character.stats?.[stat] !== 'number' || isNaN(character.stats[stat])) {
          character.stats[stat] = 50; // Fallback to 50
          messages.push(`已修正異常的基礎屬性 ${stat} (重置為 50)`);
          corrected = true;
        }
      }
    }

    // 2. Map Node Validation
    const mapCard = gameState.get('currentMapCard');
    const nodeId = gameState.get('currentNodeId');
    if (mapCard && Array.isArray(mapCard.nodes) && nodeId) {
      const nodeExists = mapCard.nodes.some(n => n.id === nodeId);
      if (!nodeExists) {
        const fallbackNode = mapCard.nodes[0];
        if (fallbackNode) {
          gameState.update({ currentNodeId: fallbackNode.id });
          messages.push(`已從無效的地圖節點 (${nodeId}) 傳送回安全區`);
          corrected = true;
          // 通知引擎重新載入節點相關場景
          eventBus.emit(GameEvent.MAP_NODE_CHANGED, fallbackNode.id);
        }
      }
    }

    // 發布修復通知與更新
    if (corrected) {
      messages.forEach(msg => {
        eventBus.emit(GameEvent.LOG_ADDED, { text: `系統修復介入：${msg}`, type: 'warning' });
        console.warn(`[SystemChecker] ${msg}`);
      });
      // 確保 UI 反映修正後的數值
      if (character) {
        eventBus.emit(GameEvent.CHARACTER_UPDATED, character);
      }
    }
  }
}

export const systemChecker = new SystemChecker();
