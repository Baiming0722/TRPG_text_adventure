// narrative/narrative-engine.js
// 敘事引擎：組裝 Prompt、呼叫 LLM、解析結果，並提供 fallback 機制

import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';
import { CONFIG } from '../js/config.js';
import { getCurrentProvider } from './llm-provider.js';

let _activeLLMRequest = null;

export function isLLMCancelledError(error) {
  return error?.name === 'LLMCancelledError';
}

/** LLM 輸出的 JSON Schema 說明（注入至 prompt 末尾） */
const OUTPUT_SCHEMA = `
請嚴格按照以下 JSON 格式輸出，**不附加任何其他文字或 markdown 代碼塊**：
{
  "scene_description": "（100~300字的場景描述，使用繁體中文）",
  "current_character_status": {
    "STR": 數字, "DEX": 數字, "INT": 數字, "POW": 數字, "MOV": 數字,
    "HP": 數字, "SAN": 數字, "LUCK": 數字,
    "status_effects": ["狀態效果名稱"]
  },
  "actions": [
    {
      "id": "action_1",
      "label": "（選項文字，15字以內）",
      "description": "（選項詳細說明，可為空字串）",
      "requires": { "stat": "STR", "min_value": 40 },
      "target_node": "node_id 或 null（若此行動會移動位置，只能填相鄰且可進入的節點 ID）",
      "tags": ["combat"],
      "needs_dice": true,
      "dice_type": "2d6"
    },
    {
      "id": "action_2",
      "label": "（選項文字，15字以內）",
      "description": "",
      "requires": null,
      "target_node": null,
      "tags": ["explore"],
      "needs_dice": false
    },
    {
      "id": "action_3",
      "label": "（選項文字，15字以內）",
      "description": "",
      "requires": null,
      "target_node": null,
      "tags": ["talk"],
      "needs_dice": false
    }
  ],
  "hidden_flags": {
    "trigger_event": null,
    "auto_dice_check": false,
    "combat_enemy": null
  }
}`.trim();

/**
 * 建構初始 System Prompt（遊戲開始時）
 * @param {object} state - 完整 GameState
 * @returns {string}
 */
export function buildSystemPrompt(state) {
  const { character, currentScenarioCard, currentMapCard, playMode } = state;

  const playModeText = {
    normal: '一般模式（標準遊戲節奏）',
    speedrun: '速通模式（快節奏推進，跳過重複描述）',
    collect: '蒐集探索模式（詳細描述所有細節與可互動物件）',
    test: '測試模式（可觸發任意事件，數值透明）',
  }[playMode] ?? '一般模式';

  const worldDesc = currentScenarioCard?.description ?? '你身處一個神秘的地方。';
  const mapDesc = currentMapCard ? `地圖：${currentMapCard.name}` : '';
  const charDesc = character ? `
角色：${character.name}（${character.class}）
${character.age ? `年齡：${character.age}\n` : ''}${character.gender ? `性別：${character.gender}\n` : ''}${character.personality ? `性格：${character.personality}\n` : ''}${character.wealth ? `資產：${character.wealth}\n` : ''}屬性：STR ${character.stats.STR} / DEX ${character.stats.DEX} / INT ${character.stats.INT} / POW ${character.stats.POW} / MOV ${character.stats.MOV}
HP ${character.derived_stats.HP} / SAN ${character.derived_stats.SAN} / LUCK ${character.derived_stats.LUCK}
技能：${(character.skills ?? []).map(s => s.name).join('、') || '無'}
背景：${character.background}` : '';

  const scenarioDesc = currentScenarioCard ? `
劇情：${currentScenarioCard.title}（第 ${currentScenarioCard.chapter} 章）
${currentScenarioCard.description}
主要事件：${(currentScenarioCard.key_events ?? []).join('、')}` : '';

  return `你是一個 TRPG 遊戲的 GM（遊戲主持人）。請使用繁體中文進行所有敘述。

[遊玩模式]
${playModeText}

[世界觀與劇情]
${worldDesc}
${scenarioDesc}

[地圖資訊]
${mapDesc}
${currentMapCard ? JSON.stringify(currentMapCard, null, 2) : ''}
${buildNavigationContext(state)}

[角色資料]
${charDesc}

[GM 行為準則]
1. 依照玩家行動與判定結果推進劇情，保持故事的連貫性
2. 生成的場景描述要有臨場感，控制在 100~300 字
3. 提供 3 個有意義的行動選項，涵蓋不同標籤（combat/explore/talk）
4. 需要判定時，在 actions 的 needs_dice 設為 true
5. 若行動會移動位置，必須在該 action.target_node 填入「可前往節點」中的節點 ID；不移動則填 null
6. 若觸發戰鬥，在 hidden_flags.combat_enemy 填入敵人資訊
7. 旗標（flags）用於追蹤劇情進度，請在適當時機設定
8. 可依行動難度指定不同骰子類型 dice_type（"2d4"/"2d6"/"2d8"/"2d10"/"1d20"/"1d100"），預設為 "2d6"

[輸出格式]
${OUTPUT_SCHEMA}`;
}

/**
 * 建構後續回合的 User Message
 * @param {object} state - 當前 GameState
 * @param {string} lastAction - 玩家上一個行動的描述
 * @param {object|null} diceResult - 骰子判定結果（如有）
 * @returns {string}
 */
export function buildUserMessage(state, lastAction, diceResult = null) {
  const { character, currentNodeId, currentMapCard, flags } = state;
  const currentNode = currentMapCard?.nodes?.find(n => n.id === currentNodeId);

  let msg = `[當前位置]\n${currentNode ? `${currentNode.name}：${currentNode.description}` : '未知位置'}`;
  msg += buildNavigationContext(state);

  if (lastAction) {
    msg += `\n\n[玩家行動]\n${lastAction}`;
  }

  if (diceResult) {
    msg += `\n\n[判定結果]\n骰子（${diceResult.diceType ?? '2d6'}）：${diceResult.rolls.join('+')} = ${diceResult.diceTotal}`;
    msg += `\n行動值：${diceResult.actionValue} → ${diceResult.label}`;
    if (diceResult.luckEffect !== 0) {
      msg += `\nLUCK ${diceResult.luckEffect > 0 ? '+' : ''}${diceResult.luckEffect}`;
    }
  }

  if (character) {
    const stats = character.stats;
    const derived = character.derived_stats;
    msg += `\n\n[角色當前狀態]\nHP: ${derived.HP}  SAN: ${derived.SAN}  LUCK: ${derived.LUCK}`;
    msg += `\nSTR: ${stats.STR}  DEX: ${stats.DEX}  INT: ${stats.INT}  POW: ${stats.POW}  MOV: ${stats.MOV}`;
    if (character.status_effects?.length) {
      msg += `\n狀態效果：${character.status_effects.map(e => e.name).join('、')}`;
    }
  }

  const importantFlags = Object.entries(flags ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  if (importantFlags.length > 0) {
    msg += `\n\n[已達成旗標]\n${importantFlags.join(', ')}`;
  }

  msg += `\n\n[輸出格式]\n${OUTPUT_SCHEMA}`;
  return msg;
}

function buildNavigationContext(state) {
  const { currentMapCard, currentNodeId, mapState } = state;
  const currentNode = currentMapCard?.nodes?.find(n => n.id === currentNodeId);
  if (!currentMapCard || !currentNode) return '';

  const mapNodeState = mapState?.[currentMapCard.id] ?? {};
  const adjacent = (currentNode.connections ?? [])
    .map(id => currentMapCard.nodes.find(n => n.id === id))
    .filter(Boolean)
    .map(node => {
      const live = mapNodeState[node.id] ?? {};
      const locked = live.locked ?? node.locked ?? false;
      const condition = node.entry_condition?.flag ? `，條件旗標：${node.entry_condition.flag}` : '';
      return `- ${node.id}：${node.name}（${locked ? '鎖定' : '可進入'}${condition}）`;
    })
    .join('\n') || '- 無';

  return `\n\n[地圖移動]\n目前節點：${currentNode.id} ${currentNode.name}\n可前往節點：\n${adjacent}\n若行動是移動、探索新區域、進入房間、走向門或離開目前位置，請在 action.target_node 填入對應節點 ID。`;
}

/**
 * 解析 LLM 回傳的 JSON 字串
 * @param {string} content
 * @returns {object} 解析後的場景資料
 */
function parseResponse(content) {
  // 嘗試直接解析
  try {
    return JSON.parse(content.trim());
  } catch { /* 繼續嘗試其他方式 */ }

  // 嘗試從 markdown 代碼塊中提取
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch { /* 繼續 */ }
  }

  // 嘗試提取第一個 { ... } 塊
  const braceMatch = content.match(/\{[\s\S]+\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* 繼續 */ }
  }

  throw new Error('無法解析 LLM 回應為合法 JSON');
}

function createCancelledError(requestId, elapsedMs) {
  const error = new Error('已取消本次 AI 回應');
  error.name = 'LLMCancelledError';
  error.llmDetails = { requestId, elapsedMs };
  return error;
}

function classifyLLMError(error) {
  if (isLLMCancelledError(error)) return 'cancelled';
  if (error?.name === 'LLMHttpError') return 'http';
  if (error?.name === 'SyntaxError') return 'parse';
  if (/API Key|Authorization|401|403/i.test(error?.message ?? '')) return 'auth';
  if (/429|rate/i.test(error?.message ?? '')) return 'rateLimit';
  if (/JSON|解析/i.test(error?.message ?? '')) return 'parse';
  if (/Failed to fetch|NetworkError|代理請求失敗/i.test(error?.message ?? '')) return 'network';
  return 'unknown';
}

function buildErrorSummary(error, type) {
  const labels = {
    http: 'AI 服務回應錯誤',
    auth: 'AI 驗證失敗',
    rateLimit: 'AI 服務流量限制',
    parse: 'AI 回應格式錯誤',
    network: 'AI 網路連線錯誤',
    unknown: 'AI 呼叫失敗',
  };
  const detail = String(error?.message ?? '').slice(0, 180);
  return `${labels[type] ?? labels.unknown}${detail ? `：${detail}` : ''}`;
}

function logLLMError({ error, type, provider, prompt, elapsedMs, rawContent }) {
  const lastMessage = prompt?.messages?.[prompt.messages.length - 1]?.content ?? '';
  console.error('[NarrativeEngine] LLM 呼叫失敗', {
    type,
    message: error?.message,
    name: error?.name,
    stack: error?.stack,
    provider: provider?.getProviderName?.(),
    model: provider?.getModel?.(),
    endpoint: provider?.getEndpoint?.(),
    elapsedMs,
    prompt: {
      messageCount: prompt?.messages?.length ?? 0,
      systemChars: prompt?.system?.length ?? 0,
      lastUserMessagePreview: String(lastMessage).slice(0, 500),
    },
    responsePreview: rawContent ? String(rawContent).slice(0, 1000) : undefined,
    details: error?.llmDetails,
  });
}

/**
 * Fallback 場景資料（LLM 失敗時使用）
 */
function buildFallbackScene() {
  return {
    scene_description: '系統正在恢復中... 你感覺周圍的空間似乎有些模糊，但你依然站在原地，等待下一步的行動。',
    current_character_status: null,
    actions: [
      { id: 'action_1', label: '等待', description: '靜待局勢變化。', requires: null, tags: ['explore'], needs_dice: false },
      { id: 'action_2', label: '四處觀察', description: '環顧四周，尋找線索。', requires: null, tags: ['explore'], needs_dice: false },
      { id: 'action_3', label: '往前走', description: '繼續前進。', requires: null, tags: ['explore'], needs_dice: false },
    ],
    hidden_flags: { trigger_event: null, auto_dice_check: false, combat_enemy: null },
    _isFallback: true,
  };
}

/**
 * 生成初始場景（遊戲開始時呼叫）
 * @returns {Promise<object>} 場景資料
 */
export async function generateInitialScene() {
  const state = gameState.getState();
  const systemPrompt = buildSystemPrompt(state);

  const prompt = {
    system: systemPrompt,
    messages: [
      { role: 'user', content: `請描述玩家剛進入遊戲的初始場景。\n\n[輸出格式]\n${OUTPUT_SCHEMA}` },
    ],
  };

  gameState.update({ lastPrompt: prompt }, true);
  try {
    return await _callLLM(prompt, state);
  } catch (error) {
    if (isLLMCancelledError(error)) throw error;
    const fallback = buildFallbackScene();
    gameState.update({ lastScene: fallback });
    eventBus.emit(GameEvent.SCENE_DISPLAYED, { scene: fallback, isFallback: true });
    return fallback;
  }
}

/**
 * 根據玩家行動生成下一個場景
 * @param {string} actionLabel - 玩家選擇的行動描述
 * @param {object|null} diceResult - 骰子結果（如有）
 * @returns {Promise<object>} 場景資料
 */
export async function generateNextScene(actionLabel, diceResult = null) {
  const state = gameState.getState();
  const userMessage = buildUserMessage(state, actionLabel, diceResult);

  // 修剪歷史（保留最近 MAX_HISTORY 輪）
  const history = state.conversationHistory.slice(-CONFIG.MAX_HISTORY * 2);
  const systemPrompt = buildSystemPrompt(state);

  const prompt = {
    system: systemPrompt,
    messages: [...history, { role: 'user', content: userMessage }],
  };

  gameState.update({ lastPrompt: prompt }, true);
  try {
    const scene = await _callLLM(prompt, state);

    // 將本輪對話加入歷史
    gameState.addConversationHistory('user', userMessage);
    if (!scene._isFallback) {
      gameState.addConversationHistory('assistant', JSON.stringify(scene));
    }

    return scene;
  } catch (err) {
    if (isLLMCancelledError(err)) throw err;
    // 失敗時保持原狀態，不寫入歷史
    const lastScene = state.lastScene;
    if (lastScene) {
      eventBus.emit(GameEvent.SCENE_DISPLAYED, { scene: lastScene, isFallback: true });
      return { _llmFailed: true, scene: lastScene };
    } else {
      const fallback = buildFallbackScene();
      gameState.update({ lastScene: fallback });
      eventBus.emit(GameEvent.SCENE_DISPLAYED, { scene: fallback, isFallback: true });
      return { _llmFailed: true, scene: fallback };
    }
  }
}

/** 實際執行 LLM 呼叫，含錯誤處理與 fallback */
async function _callLLM(prompt, state) {
  const requestId = `llm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const startedAt = performance.now();
  const controller = new AbortController();
  let cancelled = false;
  let rawContent = '';

  const offCancel = eventBus.on(GameEvent.LLM_CANCEL_REQUESTED, (data = {}) => {
    if (data.requestId && data.requestId !== requestId) return;
    cancelled = true;
    controller.abort();
  });

  _activeLLMRequest = { requestId, controller };
  eventBus.emit(GameEvent.UI_LOADING, { message: 'AI 正在思考中...', requestId, startedAt, canCancel: true });

  try {
    const provider = getCurrentProvider();
    const { content } = await provider.generateNarration(prompt, { signal: controller.signal });
    if (cancelled || controller.signal.aborted) {
      throw createCancelledError(requestId, Math.round(performance.now() - startedAt));
    }
    rawContent = content;
    let scene;
    try {
      scene = parseResponse(content);
    } catch (parseError) {
      parseError.llmDetails = { ...(parseError.llmDetails ?? {}), responsePreview: String(content).slice(0, 2000) };
      throw parseError;
    }
    if (cancelled || controller.signal.aborted) {
      throw createCancelledError(requestId, Math.round(performance.now() - startedAt));
    }

    gameState.update({ lastScene: scene });
    eventBus.emit(GameEvent.LLM_RESPONSE, { scene });
    eventBus.emit(GameEvent.SCENE_DISPLAYED, { scene });
    return scene;
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const finalError = (cancelled || error?.name === 'AbortError')
      ? createCancelledError(requestId, elapsedMs)
      : error;

    if (isLLMCancelledError(finalError)) {
      eventBus.emit(GameEvent.LLM_CANCELLED, { requestId, elapsedMs });
      throw finalError;
    }

    const provider = getCurrentProvider();
    const type = classifyLLMError(finalError);
    logLLMError({ error: finalError, type, provider, prompt, elapsedMs, rawContent });
    eventBus.emit(GameEvent.LLM_ERROR, {
      error: buildErrorSummary(finalError, type),
      type,
      details: finalError.llmDetails,
    });
    throw finalError;
  } finally {
    offCancel();
    if (_activeLLMRequest?.requestId === requestId) {
      _activeLLMRequest = null;
    }
    eventBus.emit(GameEvent.UI_LOADED, {});
  }
}
