// js/game-engine.js
// 核心遊戲引擎：協調所有子系統，管理主遊戲循環

import { eventBus, GameEvent } from './event-bus.js';
import { gameState } from './game-state.js';
import { CONFIG } from './config.js';
import { loadCharacter, applySpeedrunBonus } from '../character/character-system.js';
import { prepareCheck, commitCheck } from '../dice/dice-system.js';
import { startCombat, executeCombatRound } from '../combat/combat-system.js';
import { loadScenario, checkAndTriggerEvents, checkEnding, executeEventEffects, loadEvent } from '../event/event-system.js';
import { loadMap, moveToNode, getCurrentNode, getAdjacentNodes } from '../map/map-system.js';
import { saveGame, autoSave, loadGame } from '../save/save-system.js';
import { generateInitialScene, generateNextScene, isLLMCancelledError } from '../narrative/narrative-engine.js';
import { setCurrentProvider, setApiKey, setTemperature, setModel, setEndpoint } from '../narrative/llm-provider.js';
import { systemChecker } from './system-check.js';

class GameEngine {
  constructor() {
    this._initialized = false;
  }

  /** 初始化引擎，綁定 EventBus 監聽器 */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // 玩家選擇行動
    eventBus.on(GameEvent.ACTION_SELECTED, (data) => this._handleActionSelected(data));
    // 手動存/讀檔
    eventBus.on(GameEvent.SAVE_REQUESTED, (data) => this._handleSave(data));
    eventBus.on(GameEvent.LOAD_REQUESTED, (data) => this._handleLoad(data));
    // 設定變更
    eventBus.on(GameEvent.SETTINGS_CHANGED, (data) => this._handleSettingsChanged(data));
    // 戰鬥結束
    eventBus.on(GameEvent.COMBAT_ENDED, (data) => this._handleCombatEnded(data));

    // 初始化健康檢查模組
    systemChecker.init();

    // 初始化時套用可能已儲存的 LLM 設定
    const settings = gameState.get('llmSettings');
    if (settings) {
      if (settings.provider) setCurrentProvider(settings.provider);
      if (settings.apiKey) setApiKey(settings.provider, settings.apiKey);
      if (settings.endpoint) setEndpoint(settings.provider, settings.endpoint);
      if (settings.model) setModel(settings.provider, settings.model);
      if (settings.temperature !== undefined) setTemperature(settings.temperature);
    }
  }

  /**
   * 開始新遊戲流程
   * @param {object} options - { characterId, mapId, scenarioId, playMode, theme }
   */
  async startNewGame(options) {
    const { characterId, mapId, scenarioId, playMode, theme } = options;

    // 重置狀態
    const prevSettings = gameState.get('llmSettings');
    gameState.reset();
    gameState.update({ llmSettings: prevSettings, currentTheme: theme, playMode });

    // 套用主題
    document.documentElement.setAttribute('data-theme', theme);

    // 載入角色
    const charResponse = await fetch(`${CONFIG.CARD_BASE_PATH}/characters/${characterId}.json`);
    const charCard = await charResponse.json();
    loadCharacter(charCard);

    // 速通模式：屬性加成
    if (playMode === 'speedrun') applySpeedrunBonus();

    let targetScenarioId = scenarioId;
    if (!targetScenarioId && mapId) {
      // 依據地圖自動適配劇本章節
      const res = await fetch('/api/cards?type=scenarios');
      const allScenarios = await res.json();
      const matched = allScenarios.find(s => s.available_map === mapId);
      if (matched) {
        targetScenarioId = matched.id;
      } else {
        targetScenarioId = 'scenario_001'; // Fallback
      }
    } else if (!targetScenarioId) {
      targetScenarioId = 'scenario_001';
    }

    // 載入初始劇情與地圖
    const scenario = await loadScenario(targetScenarioId);
    const map = await loadMap(mapId || scenario.available_map);

    // 進入起始節點，確保地圖探索狀態/旗標一致
    const moveResult = moveToNode(scenario.starting_node);
    if (!moveResult.success) {
      eventBus.emit(GameEvent.LLM_ERROR, { error: moveResult.reason });
      return;
    }

    // 開局先處理事件（節點事件優先）
    await this._triggerSceneEvents({});

    // 記錄首次遊玩
    if (gameState.get('isFirstPlay')) {
      gameState.update({ isFirstPlay: false });
      eventBus.emit(GameEvent.TUTORIAL_SHOWN, {});
    }

    eventBus.emit(GameEvent.NEW_GAME_STARTED, { character: charCard, scenario, map });
    // 不直接呼叫 LLM，改發出 GAME_READY 事件，由 UI 層顯示「開始」按鈕待使用者手動觸發
    eventBus.emit(GameEvent.GAME_READY, { character: charCard });
    autoSave();
  }

  /**
   * 使用者手動點擊「開始」後呼叫，觸發第一輪 LLM 開局
   */
  async beginFirstScene() {
    try {
      await generateInitialScene();
    } catch (error) {
      if (!isLLMCancelledError(error)) throw error;
      const character = gameState.get('character');
      if (character) {
        eventBus.emit(GameEvent.GAME_READY, { character });
      }
    }
  }

  /**
   * 從存檔繼續遊戲
   * @param {number|'auto'} slot
   */
  async continueGame(slot) {
    const result = loadGame(slot);
    if (!result.success) {
      eventBus.emit(GameEvent.LLM_ERROR, { error: result.message });
      return;
    }

    const state = gameState.getState();
    // 重新載入地圖與劇情卡（JSON 資料本身不存入 localStorage）
    if (state.currentScenarioId) {
      await loadScenario(state.currentScenarioId).catch(() => {});
    }
    if (state.currentMapId) {
      await loadMap(state.currentMapId).catch(() => {});
    }

    // 套用主題
    document.documentElement.setAttribute('data-theme', state.currentTheme ?? CONFIG.DEFAULT_THEME);

    // 直接還原最後的場景與角色狀態，不呼叫 LLM
    if (state.lastScene) {
      eventBus.emit(GameEvent.SCENE_DISPLAYED, { scene: state.lastScene });
    }
    if (state.character) {
      eventBus.emit(GameEvent.CHARACTER_UPDATED, { character: state.character });
    }

    // LOAD_DONE 統一在此發出（save-system.js 不再重複觸發）
    eventBus.emit(GameEvent.LOAD_DONE, { slot });

    // 讀檔完成後觸發健康檢查
    eventBus.emit(GameEvent.SYSTEM_CHECK);

    // 若存檔版本較舊未含 lastScene，改走「手動開始」流程而非直接觸發 LLM
    if (!state.lastScene && state.character) {
      eventBus.emit(GameEvent.GAME_READY, { character: state.character });
    }
  }

  /** 處理玩家選擇行動 */
  async _handleActionSelected({ action }) {
    const snapshot = this._createSnapshot();
    const state = gameState.getState();
    let actionForPrompt = action.label;

    // 判斷是否需要骰子判定
    let diceResult = null;
    if (action.needs_dice) {
      diceResult = prepareCheck(action.tags ?? [], action.label, action.dice_type ?? null);
    }

    // 判斷是否觸發戰鬥
    const hiddenFlags = state.lastScene?.hidden_flags;
    if (hiddenFlags?.combat_enemy) {
      const enemy = hiddenFlags.combat_enemy;
      startCombat(enemy);
      this._autoResolveCombat();
      return;
    }

    // 更新地圖節點（若行動指定 node）
    const targetNode = this._resolveActionTargetNode(action);
    if (targetNode) {
      const moveResult = moveToNode(targetNode);
      if (!moveResult.success) {
        actionForPrompt = `${action.label}（移動失敗：${moveResult.reason}）`;
        eventBus.emit(GameEvent.SPECIAL_EVENT, { message: `移動失敗：${moveResult.reason}` });
      }
    }

    // 依優先序觸發事件：節點事件 -> 全域劇情事件 -> LLM hidden flag 事件
    await this._triggerSceneEvents({ hiddenFlags });

    try {
      // 產生下一場景
      const scene = await generateNextScene(actionForPrompt, diceResult);
      if (scene?._llmFailed) return;
      if (diceResult) {
        commitCheck(diceResult);
      }
      eventBus.emit(GameEvent.ACTION_COMMITTED, { action, diceResult });
      
      // 玩家行動結算後觸發健康檢查
      eventBus.emit(GameEvent.SYSTEM_CHECK);
      
      autoSave();
      this._checkAndEmitEnding({ afterDice: Boolean(diceResult) });
    } catch (error) {
      if (!isLLMCancelledError(error)) throw error;
      this._restoreSnapshot(snapshot);
    }
  }

  /** 戰鬥結束後繼續敘事 */
  async _handleCombatEnded({ result }) {
    const snapshot = this._createSnapshot();
    try {
      const scene = await generateNextScene(`戰鬥結束（${result === 'victory' ? '勝利' : '敗北'}）`, null);
      if (scene?._llmFailed) return;
      autoSave();
      this._checkAndEmitEnding();
    } catch (error) {
      if (!isLLMCancelledError(error)) throw error;
      this._restoreSnapshot(snapshot);
    }
  }

  _autoResolveCombat() {
    for (let guard = 0; guard < 20; guard += 1) {
      const round = executeCombatRound();
      if (round?.isOver) return;
    }
    eventBus.emit(GameEvent.LLM_ERROR, { error: '戰鬥回合超過安全上限，已停止自動戰鬥。' });
  }

  _handleSave({ slot }) {
    const result = saveGame(slot);
    eventBus.emit(GameEvent.SAVE_DONE, { slot, success: result.success, message: result.message });
    gameState.addEventHistory({ eventId: 'EVT-10 (手動存檔)', result: result.success ? '成功' : '失敗' });
  }

  _checkAndEmitEnding({ afterDice = false } = {}) {
    const ending = checkEnding();
    if (ending.type) {
      eventBus.emit(GameEvent.GAME_ENDED, { ending, afterDice });
    }
  }

  async _handleLoad({ slot }) {
    await this.continueGame(slot);
  }

  _handleSettingsChanged({ provider, apiKey, endpoint, model, temperature, availableModels }) {
    if (provider) setCurrentProvider(provider);
    
    const state = gameState.get('llmSettings') || {};
    const prov  = provider ?? state.provider ?? CONFIG.LLM.DEFAULT_PROVIDER;
    
    if (apiKey !== undefined) {
      setApiKey(prov, apiKey);
    }
    
    if (endpoint !== undefined) {
      setEndpoint(prov, endpoint);
    }
    
    if (model !== undefined) {
      setModel(prov, model);
    }
    
    if (temperature !== undefined) {
      setTemperature(temperature);
    }

    const newSettings = {
      ...state,
      provider: prov,
      ...(apiKey !== undefined && { apiKey }),
      ...(endpoint !== undefined && { endpoint }),
      ...(model !== undefined && { model }),
      ...(availableModels !== undefined && { availableModels }),
      ...(temperature !== undefined && { temperature }),
    };

    gameState.update({ llmSettings: newSettings });

    try {
      localStorage.setItem('trpg_llm_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('無法儲存設定到 LocalStorage', e);
    }
  }

  /**
   * 事件觸發優先序：
   * 1) 目前節點事件
   * 2) 全域劇情事件（scenario.key_events）
   * 3) LLM hidden flag 指定事件（trigger_event）
   */
  async _triggerSceneEvents({ hiddenFlags = null } = {}) {
    const currentNode = getCurrentNode();
    if (currentNode?.events?.length) {
      await checkAndTriggerEvents(currentNode.events);
    }

    const currentScenario = gameState.get('currentScenarioCard');
    if (currentScenario?.key_events?.length) {
      await checkAndTriggerEvents(currentScenario.key_events);
    }

    if (hiddenFlags?.trigger_event) {
      try {
        const eventCard = await loadEvent(hiddenFlags.trigger_event);
        const msgs = executeEventEffects(eventCard);
        msgs.forEach(m => eventBus.emit(GameEvent.SPECIAL_EVENT, { message: m }));
      } catch {
        // 事件不存在時靜默忽略
      }
    }
  }

  _resolveActionTargetNode(action) {
    const explicitTarget = action.target_node ?? action.targetNode ?? null;
    if (explicitTarget) return explicitTarget;

    const adjacent = getAdjacentNodes().filter(node => node.accessible);
    if (!adjacent.length) return null;

    const text = `${action.label ?? ''} ${action.description ?? ''} ${(action.tags ?? []).join(' ')}`.toLowerCase();
    const namedMatch = adjacent.find(node =>
      text.includes(String(node.id).toLowerCase()) ||
      text.includes(String(node.name).toLowerCase())
    );
    if (namedMatch) return namedMatch.id;

    const movementIntent = /前往|進入|走向|往|移動|探索|離開|穿過|打開|走廊|房間|門|出口|通道/.test(text);
    if (!movementIntent) return null;

    const unexplored = adjacent.filter(node => !node.explored);
    if (unexplored.length === 1) return unexplored[0].id;
    if (adjacent.length === 1) return adjacent[0].id;

    return null;
  }

  _createSnapshot() {
    return JSON.parse(JSON.stringify(gameState.getState()));
  }

  _restoreSnapshot(snapshot) {
    gameState.restoreFromSave(JSON.parse(JSON.stringify(snapshot)));
    if (snapshot.character) {
      eventBus.emit(GameEvent.CHARACTER_UPDATED, { character: snapshot.character, type: 'rollback' });
    }
    if (snapshot.lastScene) {
      eventBus.emit(GameEvent.SCENE_DISPLAYED, { scene: snapshot.lastScene });
    } else if (snapshot.character) {
      eventBus.emit(GameEvent.GAME_READY, { character: snapshot.character });
    }
    eventBus.emit(GameEvent.MAP_NODE_CHANGED, {});
  }
}

// 全域單例
export const gameEngine = new GameEngine();
