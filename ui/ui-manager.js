// ui/ui-manager.js
// UI 管理器：初始化所有 UI 元件，監聽 EventBus 更新畫面

import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';
import { gameEngine } from '../js/game-engine.js';
import { CONFIG } from '../js/config.js';

import { formatCheckResult } from '../dice/dice-system.js';

// --- UI 子模組 ---
import { SceneRenderer } from './scene-renderer.js';
import { ActionPanel } from './action-panel.js';
import { CharacterPanel } from './character-panel.js';
import { GameLog } from './game-log.js';
import { SaveDrawer } from './save-drawer.js';
import { DiceAnimation } from './dice-animation.js';
import { MapView } from './map-view.js';
import { ExplorePanel } from './explore-panel.js';
import { TestPanel } from './test-panel.js';
import { ModeSelect } from './mode-select.js';
import { Tutorial } from './tutorial.js';

/**
 * 根據不同 Provider 的 API 回應格式，組合出盡可能詳細的模型顯示名稱。
 * 設計原則：m.id 是唯一識別符，永遠完整顯示；name 等欄位作為補充說明。
 * @param {string} provider - Provider key
 * @param {object} m - 模型物件（API 原始回應）
 * @returns {{ id: string, label: string }}
 */
function _buildModelLabel(provider, m) {
  const id = m.id ?? '';

  if (provider === 'openrouter') {
    // OpenRouter 提供 name, context_length, pricing 等豐富欄位
    const name = m.name && m.name !== id ? m.name : '';
    const ctx  = m.context_length ? `${(m.context_length / 1000).toFixed(0)}K ctx` : '';
    const promptPrice = m.pricing?.prompt
      ? `$${(parseFloat(m.pricing.prompt) * 1_000_000).toFixed(2)}/1M prompt`
      : '';
    const extras = [ctx, promptPrice].filter(Boolean).join(' · ');
    const suffix = [name, extras].filter(Boolean).join(' · ');
    return { id, label: suffix ? `${id}  —  ${suffix}` : id };
  }

  if (provider === 'nvidia') {
    // NVIDIA：以 id 為主，附加 owned_by 與 name
    const owner = m.owned_by ? `[${m.owned_by}]` : '[NVIDIA]';
    const name  = m.name && m.name !== id ? m.name : '';
    const suffix = [owner, name].filter(Boolean).join(' · ');
    return { id, label: suffix ? `${id}  —  ${suffix}` : id };
  }

  if (provider === 'deepseek') {
    // DeepSeek：以 id 為主，附加 owned_by 與 name
    const owner = m.owned_by ? `[${m.owned_by}]` : '[DeepSeek]';
    const name  = m.name && m.name !== id ? m.name : 'DeepSeek Chat Model';
    const suffix = [owner, name].filter(Boolean).join(' · ');
    return { id, label: suffix ? `${id}  —  ${suffix}` : id };
  }

  if (provider === 'ollama') {
    // Ollama：以 id 為主，附加 name、參數量與量化資訊
    const name = m.name && m.name !== id ? m.name : '';
    const size = m.details?.parameter_size ? `${m.details.parameter_size}` : '';
    const quant = m.details?.quantization_level ? `${m.details.quantization_level}` : '';
    const suffix = [name, size, quant].filter(Boolean).join(' · ');
    return { id, label: suffix ? `${id}  —  ${suffix}` : id };
  }

  // 通用（Ollama 或其他）：以 id 為主，有 name 且與 id 不同時附上
  const name = m.name ?? '';
  const owner = m.owned_by ? `[${m.owned_by}]` : '';
  const suffix = [owner, name].filter(Boolean).join(' · ');
  return { id, label: suffix ? `${id}  —  ${suffix}` : id };
}

export class UIManager {
  constructor() {
    this.sceneRenderer = new SceneRenderer(document.getElementById('scene-display'));
    this.actionPanel   = new ActionPanel(document.getElementById('action-buttons'));
    this.characterPanel = new CharacterPanel(document.getElementById('character-panel'));
    this.gameLog       = new GameLog(document.getElementById('game-log-area'));
    this.saveDrawer    = new SaveDrawer(document.getElementById('save-drawer'));
    this.diceAnimation = new DiceAnimation(document.getElementById('dice-overlay'));
    this.mapView       = new MapView(document.getElementById('map-canvas'));
    this.explorePanel  = new ExplorePanel(document.getElementById('explore-panel'));
    this.testPanel     = new TestPanel(document.getElementById('test-panel'));
    this.modeSelect    = new ModeSelect();
    this.tutorial      = new Tutorial();
    this._loadingTimer = null;
    this._loadingRequestId = null;
    this._lastDiceRevealAt = 0;

    this._bindEvents();
    this._bindHeaderButtons();
    this._syncAudioControls();
  }

  _bindEvents() {
    // LLM 場景更新
    eventBus.on(GameEvent.SCENE_DISPLAYED, ({ scene, isFallback }) => {
      this.sceneRenderer.render(scene.scene_description, isFallback);
      this.actionPanel.render(scene.actions ?? [], gameState.get('character'));
      if (isFallback) this.showToast('AI 回應異常，已使用備援描述。', 'error');
    });

    // 角色狀態更新
    eventBus.on(GameEvent.CHARACTER_UPDATED, ({ character }) => {
      this.characterPanel.render(character);
    });

    // 骰子判定
    eventBus.on(GameEvent.DICE_PENDING, (data) => {
      const result = data.result ?? data;
      this.diceAnimation.showPending(result);
    });

    eventBus.on(GameEvent.DICE_REVEALED, (data) => {
      const result = data.result ?? data;
      this._lastDiceRevealAt = performance.now();
      this.diceAnimation.reveal(result);
      this.gameLog.add(`判定：${formatCheckResult(result)}`, 'dice');
    });

    // 載入中狀態
    eventBus.on(GameEvent.UI_LOADING, ({ message, requestId, startedAt, canCancel }) => {
      this.showLoading(message, { requestId, startedAt, canCancel });
      this.actionPanel.setDisabled(true);
    });
    eventBus.on(GameEvent.UI_LOADED, () => {
      this.hideLoading();
      this.actionPanel.setDisabled(false);
    });

    // 地圖節點變更
    eventBus.on(GameEvent.MAP_NODE_CHANGED, () => {
      this.mapView.render();
    });

    // 特殊事件
    eventBus.on(GameEvent.SPECIAL_EVENT, ({ eventCard, logMessages, message }) => {
      if (logMessages) logMessages.forEach(m => this.gameLog.add(m, 'event'));
      if (message) this.gameLog.add(message, 'event');
    });

    // 新遊戲開始
    eventBus.on(GameEvent.NEW_GAME_STARTED, ({ character }) => {
      this.characterPanel.render(character);
      this.mapView.render();
      this.gameLog.clear();
      this.gameLog.add('🎮 冒險開始！', 'system');
      this.hideModal('start-modal');
      // 同步主題下拉選單的值
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) {
        themeSelect.value = gameState.get('currentTheme') ?? CONFIG.DEFAULT_THEME;
      }
    });

    // 存/讀檔完成
    eventBus.on(GameEvent.SAVE_DONE, ({ success, message, slot }) => {
      this.showToast(message ?? (success ? '存檔成功' : '存檔失敗'), success ? 'success' : 'error');
      if (success) this.saveDrawer.refresh();
    });
    eventBus.on(GameEvent.LOAD_DONE, () => {
      this.saveDrawer.close();
      this.showToast('讀檔成功', 'success');
      // 同步主題下拉選單的值與主畫面的 data-theme 屬性
      const currentTheme = gameState.get('currentTheme') ?? CONFIG.DEFAULT_THEME;
      document.documentElement.setAttribute('data-theme', currentTheme);
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) {
        themeSelect.value = currentTheme;
      }
    });
    eventBus.on(GameEvent.AUTO_SAVED, () => {
      this.showToast('自動存檔已更新', 'info');
    });

    // LLM 錯誤
    eventBus.on(GameEvent.LLM_ERROR, ({ error, type }) => {
      this.diceAnimation.hide();
      this.gameLog.add(`⚠️ ${type ? `[${type}] ` : ''}${error}`, 'error');
      this.showToast(error, 'error');
    });

    eventBus.on(GameEvent.LLM_CANCELLED, () => {
      this.diceAnimation.hide();
      this.gameLog.add('已取消本次選擇。', 'system');
      this.showToast('已取消本次選擇', 'info');
    });

    // 遊戲結局
    eventBus.on(GameEvent.GAME_ENDED, ({ ending, afterDice }) => {
      const elapsedSinceDice = performance.now() - this._lastDiceRevealAt;
      const delay = afterDice && elapsedSinceDice < 3600 ? 3600 - elapsedSinceDice : 0;
      this.actionPanel.setDisabled(true);
      window.setTimeout(() => this._showEnding(ending), delay);
    });

    // 新手引導
    eventBus.on(GameEvent.TUTORIAL_SHOWN, () => {
      setTimeout(() => this.tutorial.start(), 1000);
    });

    // 戰鬥回合
    eventBus.on(GameEvent.COMBAT_ROUND, ({ log }) => {
      log.forEach(m => this.gameLog.add(m, 'event'));
    });

    // 行動選擇 -> 加入 Log
    eventBus.on(GameEvent.ACTION_COMMITTED, ({ action }) => {
      this.gameLog.add(`▶ 你選擇了：${action.label}`, 'action');
    });

    // 測試模式
    eventBus.on(GameEvent.TEST_MODE_ENTERED, () => {
      this.testPanel.show();
    });

    // 角色/劇情載入完畢，展示「開始第一場景」按鈕
    eventBus.on(GameEvent.GAME_READY, ({ character }) => {
      this._showStartScenePrompt(character);
    });

    eventBus.on(GameEvent.AUDIO_SETTINGS_CHANGED, () => {
      window.setTimeout(() => this._syncAudioControls(), 0);
    });
  }

  _bindHeaderButtons() {
    document.getElementById('btn-audio-toggle')?.addEventListener('click', () => {
      const settings = gameState.get('audioSettings') ?? CONFIG.AUDIO;
      eventBus.emit(GameEvent.AUDIO_SETTINGS_CHANGED, { muted: !settings.muted });
    });

    // 存檔按鈕
    document.getElementById('btn-save-drawer')?.addEventListener('click', () => {
      this.saveDrawer.toggle();
    });

    // 設定按鈕
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.showSettingsModal();
    });

    // 探索記錄按鈕
    document.getElementById('btn-explore')?.addEventListener('click', () => {
      this.explorePanel.toggle();
      eventBus.emit(GameEvent.EXPLORE_VIEWED, {});
    });

    // 主題切換按鈕
    document.getElementById('theme-select')?.addEventListener('change', (e) => {
      const theme = e.target.value;
      document.documentElement.setAttribute('data-theme', theme);
      gameState.update({ currentTheme: theme });
      eventBus.emit(GameEvent.THEME_CHANGED, { theme });
    });

    // 初始化主題選擇器的預設值
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = gameState.get('currentTheme') ?? CONFIG.DEFAULT_THEME;
    }

    // 字體切換按鈕
    document.getElementById('font-select')?.addEventListener('change', async (e) => {
      const fontType = e.target.value;
      if (fontType === 'load-local') {
        try {
          if (!window.queryLocalFonts) {
            this.showToast('此瀏覽器不支援讀取系統字體。', 'error');
            e.target.value = 'default';
            return;
          }
          
          this.showToast('正在請求存取系統字體...', 'info');
          const localFonts = await window.queryLocalFonts();
          
          const fontSelect = document.getElementById('font-select');
          
          // 確保只有一個系統字體群組
          let localGroup = fontSelect.querySelector('optgroup[label="系統字體"]');
          if (!localGroup) {
            localGroup = document.createElement('optgroup');
            localGroup.label = "系統字體";
            fontSelect.appendChild(localGroup);
          } else {
            localGroup.innerHTML = ''; // 清空重新載入
          }

          // 使用 Set 去除重複的字體家族 (family)
          const fontFamilies = new Set();
          for (const fontData of localFonts) {
            fontFamilies.add(fontData.family);
          }

          // 排序並加入選單，排除一些明顯不適合或系統底層字體
          const sortedFamilies = Array.from(fontFamilies).sort();
          sortedFamilies.forEach(family => {
            const opt = document.createElement('option');
            opt.value = `local:${family}`;
            opt.textContent = family;
            opt.style.fontFamily = `"${family}"`; // 在選單中預覽字體
            localGroup.appendChild(opt);
          });
          
          this.showToast(`成功載入 ${fontFamilies.size} 種系統字體`, 'success');
          e.target.value = 'default'; // 重置選擇，讓使用者手動挑選
        } catch (err) {
          console.error(err);
          this.showToast('無法讀取系統字體，可能使用者拒絕授權', 'error');
          e.target.value = 'default';
        }
      } else if (fontType.startsWith('local:')) {
        const family = fontType.replace('local:', '');
        document.documentElement.style.setProperty('--font-ui', `"${family}", sans-serif`);
        document.documentElement.style.setProperty('--font-narrative', `"${family}", serif`);
      } else if (fontType === 'serif') {
        document.documentElement.style.setProperty('--font-ui', "'Noto Serif TC', serif");
        document.documentElement.style.setProperty('--font-narrative', "'Noto Serif TC', serif");
      } else if (fontType === 'mono') {
        document.documentElement.style.setProperty('--font-ui', "'Courier New', monospace");
        document.documentElement.style.setProperty('--font-narrative', "'Courier New', monospace");
      } else {
        document.documentElement.style.setProperty('--font-ui', "'Inter', 'Noto Sans TC', sans-serif");
        document.documentElement.style.setProperty('--font-narrative', "'Noto Serif TC', 'Noto Sans TC', serif");
      }
    });
  }

  /** 顯示遊戲開始 Modal（模式選擇 → 主題選擇 → 角色選擇） */
  async showStartModal() {
    return this.modeSelect.show((options) => {
      document.documentElement.setAttribute('data-theme', options.theme);
      gameState.update({ currentTheme: options.theme });
      gameEngine.startNewGame(options);
    });
  }

  showSettingsModal() {
    const state = gameState.get('llmSettings');
    const audioState = gameState.get('audioSettings') ?? CONFIG.AUDIO;
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    const providerSelect  = document.getElementById('settings-provider');
    const apiKeyInput     = document.getElementById('settings-api-key');
    const urlInput        = document.getElementById('settings-url');
    const modelInput      = document.getElementById('settings-model');
    const searchInput     = document.getElementById('settings-model-search');
    const tempInput       = document.getElementById('settings-temperature');
    const fetchBtn        = document.getElementById('btn-fetch-models');
    const audioMutedInput = document.getElementById('settings-audio-muted');
    const bgmVolumeInput  = document.getElementById('settings-bgm-volume');
    const sfxVolumeInput  = document.getElementById('settings-sfx-volume');
    const bgmModeSelect   = document.getElementById('settings-bgm-mode');
    const bgmStyleSelect  = document.getElementById('settings-bgm-style');
    const bgmVolumeDisplay = document.getElementById('bgm-volume-display');
    const sfxVolumeDisplay = document.getElementById('sfx-volume-display');

    // 填入目前儲存的設定值
    providerSelect.value = state?.provider ?? CONFIG.LLM.DEFAULT_PROVIDER;
    apiKeyInput.value    = state?.apiKey ?? '';
    tempInput.value      = state?.temperature ?? 0.7;
    if (searchInput) searchInput.value = ''; // 每次開啟設定面板時，清空搜尋框

    const formatVolume = (value) => `${Math.round(Number(value) * 100)}%`;
    const updateAudioDisplays = () => {
      if (bgmVolumeDisplay && bgmVolumeInput) bgmVolumeDisplay.textContent = formatVolume(bgmVolumeInput.value);
      if (sfxVolumeDisplay && sfxVolumeInput) sfxVolumeDisplay.textContent = formatVolume(sfxVolumeInput.value);
      if (bgmStyleSelect && bgmModeSelect) bgmStyleSelect.disabled = bgmModeSelect.value === 'follow-theme';
    };

    if (audioMutedInput) audioMutedInput.checked = Boolean(audioState.muted);
    if (bgmVolumeInput) bgmVolumeInput.value = audioState.bgmVolume ?? CONFIG.AUDIO.bgmVolume;
    if (sfxVolumeInput) sfxVolumeInput.value = audioState.sfxVolume ?? CONFIG.AUDIO.sfxVolume;
    if (bgmModeSelect) bgmModeSelect.value = audioState.bgmMode ?? CONFIG.AUDIO.bgmMode;
    if (bgmStyleSelect) {
      bgmStyleSelect.innerHTML = Object.entries(CONFIG.AUDIO.BGM_STYLES).map(([id, item]) =>
        `<option value="${id}">${item.name}</option>`
      ).join('');
      bgmStyleSelect.value = audioState.bgmStyle ?? CONFIG.AUDIO.bgmStyle;
    }
    if (bgmVolumeInput) bgmVolumeInput.oninput = updateAudioDisplays;
    if (sfxVolumeInput) sfxVolumeInput.oninput = updateAudioDisplays;
    if (bgmModeSelect) bgmModeSelect.onchange = updateAudioDisplays;
    updateAudioDisplays();

    const updateUrlState = () => {
      const provider = providerSelect.value;
      if (provider === 'ollama') {
        urlInput.disabled = false;
        urlInput.value = state?.endpoint ?? CONFIG.LLM.PROVIDERS.ollama.endpoint.replace('/api/proxy/', '').replace('/v1/chat/completions', '');
      } else {
        urlInput.disabled = true;
        urlInput.value = (CONFIG.LLM.PROVIDERS[provider]?.endpoint ?? '').replace('/api/proxy/', '');
      }
    };
    updateUrlState();

    // 初始化並還原目前記憶的模型清單（同時做排序），並選中值
    this._currentLoadedModels = state?.availableModels ?? [];
    this._currentLoadedModels.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));
    this._populateModelSelect(modelInput, this._currentLoadedModels, state?.model ?? '');

    modal.classList.remove('hidden');

    // 動態即時篩選邏輯
    const filterModels = () => {
      const searchVal = (searchInput?.value ?? '').trim().toLowerCase();
      const filtered = this._currentLoadedModels.filter(m => 
        m.id.toLowerCase().includes(searchVal) || 
        m.label.toLowerCase().includes(searchVal)
      );
      // 保留當前選取值以防被過濾時重置
      this._populateModelSelect(modelInput, filtered, modelInput.value);
    };

    if (searchInput) {
      searchInput.oninput = filterModels;
    }

    // 當下拉選單手動變更時，立即更新下方的詳細資訊卡片
    modelInput.onchange = () => {
      this._updateModelDetailsCard(modelInput.value, this._currentLoadedModels || []);
    };

    // 切換提供商時清空 API Key、篩選框、模型選單並更新 URL 欄位
    const onProviderChange = () => {
      apiKeyInput.value = '';          // 清空 API Key，防止不同供應商的 Key 混用
      if (searchInput) searchInput.value = ''; // 清空篩選框
      this._currentLoadedModels = [];
      this._populateModelSelect(modelInput, [], '');
      updateUrlState();
    };
    providerSelect.onchange = onProviderChange;

    // 取得模型按鈕
    const onFetchModels = async () => {
      const provider = providerSelect.value;
      const apiKey   = apiKeyInput.value.trim();
      // Ollama 即使沒 API Key 也可以取得模型
      if (!apiKey && provider !== 'ollama') {
        this.showToast('請先輸入 API Key', 'error');
        return;
      }

      fetchBtn.disabled    = true;
      fetchBtn.textContent = '⏳ 取得中...';

      try {
        const models = await this._fetchAvailableModels(provider, apiKey);
        this._currentLoadedModels = models;
        if (searchInput) searchInput.value = ''; // 獲取新模型後清空篩選框
        this._populateModelSelect(modelInput, models, state?.model ?? '');
        this.showToast(`已取得 ${models.length} 個可用模型`, 'success');
      } catch (err) {
        this.showToast(`取得模型失敗：${err.message}`, 'error');
      } finally {
        fetchBtn.disabled    = false;
        fetchBtn.textContent = '🔍 取得模型';
      }
    };
    fetchBtn.onclick = onFetchModels;

    // 儲存設定
    document.getElementById('btn-save-settings').onclick = () => {
      const provider = providerSelect.value;
      const apiKey   = apiKeyInput.value.trim();
      const endpoint = urlInput.value.trim();
      const model    = modelInput.value.trim();
      const temp     = parseFloat(tempInput.value);
      const audioPatch = {
        muted: Boolean(audioMutedInput?.checked),
        bgmVolume: parseFloat(bgmVolumeInput?.value ?? CONFIG.AUDIO.bgmVolume),
        sfxVolume: parseFloat(sfxVolumeInput?.value ?? CONFIG.AUDIO.sfxVolume),
        bgmMode: bgmModeSelect?.value ?? CONFIG.AUDIO.bgmMode,
        bgmStyle: bgmStyleSelect?.value ?? CONFIG.AUDIO.bgmStyle,
      };

      // 直接使用目前載入的模型資料陣列，不依賴 DOM 讀取以防防錯
      const availableModels = this._currentLoadedModels || [];

      eventBus.emit(GameEvent.SETTINGS_CHANGED, { provider, apiKey, endpoint, model, temperature: temp, availableModels });
      eventBus.emit(GameEvent.AUDIO_SETTINGS_CHANGED, audioPatch);
      modal.classList.add('hidden');
      this.showToast('設定已儲存', 'success');
    };
  }

  /**
   * 透過本機後端代理取得 Provider 的可用模型清單
   * 不依賴 config.js 的 URL，也不會有 CORS 問題
   * @param {string} provider - provider key（deepseek / nvidia）
   * @param {string} apiKey
   * @returns {Promise<Array<{id: string, label: string}>>}
   */
  async _fetchAvailableModels(provider, apiKey) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 15000);

    let endpoint = `/api/llm-models?provider=${encodeURIComponent(provider)}`;
    
    // 如果是 Ollama，直接透過 proxy 請求使用者的自訂 URL
    if (provider === 'ollama') {
      const urlInputValue = document.getElementById('settings-url').value.trim();
      let baseUrl = urlInputValue || CONFIG.LLM.PROVIDERS.ollama.endpoint.replace('/v1/chat/completions', '');
      if (!baseUrl.startsWith('/api/proxy/')) {
        baseUrl = `/api/proxy/${baseUrl}`;
      }
      endpoint = baseUrl.endsWith('/v1/models') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/v1/models`;
    }

    console.log(`[LLM] Fetching models via: ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}${text ? `：${text.slice(0, 200)}` : ''}`);
      }

      const json = await response.json();
      console.log(`[LLM] ${provider} models response:`, json);

      // 各 Provider 回傳的 model 物件欄位不同，組合盡可能詳細的 label
      const rawModels = Array.isArray(json.data) ? json.data :
                        Array.isArray(json.models) ? json.models : [];

      if (rawModels.length === 0) {
        console.warn(`[LLM] No models found in ${provider} response.`, json);
      }

      const mapped = rawModels.map(m => _buildModelLabel(provider, m));
      mapped.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));
      return mapped;
    } catch (err) {
      console.error(`[LLM] Error fetching models:`, err);
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 將模型清單填入 select 下拉選單中，並嘗試選中 currentModelId
   * @param {HTMLSelectElement} selectEl
   * @param {Array<{id: string, label: string}>} models
   * @param {string} currentModelId
   */
  _populateModelSelect(selectEl, models, currentModelId) {
    if (!selectEl) return;
    selectEl.innerHTML = '';

    if (models.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '請先輸入 API Key 並點擊「取得模型」';
      selectEl.appendChild(opt);
      this._updateModelDetailsCard('', []);
      return;
    }

    models.forEach(({ id, label }) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = label;
      selectEl.appendChild(opt);
    });

    selectEl.value = currentModelId || models[0].id;
    this._updateModelDetailsCard(selectEl.value, models);
  }

  /**
   * 更新模型詳細資料展示卡片，呈現不被切斷的完整細節資訊。
   * @param {string} selectedModelId
   * @param {Array<{id: string, label: string}>} models
   */
  _updateModelDetailsCard(selectedModelId, models) {
    const card = document.getElementById('model-details-card');
    if (!card) return;

    if (!selectedModelId) {
      card.classList.add('hidden');
      return;
    }

    const model = models.find(m => m.id === selectedModelId);
    if (!model) {
      card.classList.remove('hidden');
      card.innerHTML = `
        <div style="font-weight: 700; color: var(--color-text-accent); margin-bottom: 4px; font-size: 0.85rem;">🎯 當前選定模型</div>
        <div style="font-family: var(--font-mono); color: var(--color-text-primary); font-size: 0.78rem; word-break: break-all;">${selectedModelId}</div>
      `;
      return;
    }

    card.classList.remove('hidden');

    const parts = model.label.split('  —  ');
    const idDisplay = model.id;
    let detailHtml = '';

    if (parts.length > 1) {
      const suffixParts = parts[1].split(' · ');
      // 提取 owner (例如 "[NVIDIA]")
      const owner = suffixParts.find(p => p.startsWith('[') && p.endsWith(']')) || '';
      // 提取 name (排除 owner, ctx, price, size, quant)
      const name = suffixParts.find(p => 
        p !== owner && 
        !p.includes('ctx') && 
        !p.includes('/1M') && 
        !p.includes('.0B') && 
        !p.includes('.1B') && 
        !p.includes('B') && 
        !p.startsWith('Q') && 
        !p.includes('_K_M')
      ) || '可用模型';
      
      const ctx = suffixParts.find(p => p.includes('ctx')) || '';
      const price = suffixParts.find(p => p.includes('/1M')) || '';
      
      // Ollama 規格資訊
      const size = suffixParts.find(p => p.includes('.0B') || p.includes('.1B') || p.includes('B')) || '';
      const quant = suffixParts.find(p => p.startsWith('Q') || p.includes('_K_M')) || '';

      const extras = [ctx, price, size, quant].filter(Boolean).join(' · ');

      detailHtml = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid var(--color-border); padding-bottom: 6px; align-items: center;">
          <span style="font-weight: 700; color: var(--color-text-accent); font-size: 0.85rem;">${name} ${owner ? `<span style="color: var(--color-text-muted); font-size: 0.72rem; font-weight: normal;">${owner}</span>` : ''}</span>
          ${price ? `<span style="font-size: 0.72rem; background: rgba(61,214,140,0.12); border: 1px solid rgba(61,214,140,0.25); padding: 1px 6px; border-radius: 4px; color: var(--color-success); font-weight: 600;">${price}</span>` : ''}
        </div>
        <div style="margin-bottom: 4px; font-size: 0.78rem;"><span style="color: var(--color-text-muted);">模型 ID:</span> <span style="font-family: var(--font-mono); color: var(--color-text-primary); word-break: break-all;">${idDisplay}</span></div>
        ${ctx && price ? `<div style="font-size: 0.78rem;"><span style="color: var(--color-text-muted);">上下文窗口:</span> <span style="color: var(--color-text-primary); font-weight: 600;">${ctx}</span></div>` : ''}
        ${extras && !price ? `<div style="font-size: 0.78rem;"><span style="color: var(--color-text-muted);">規格細節:</span> <span style="color: var(--color-text-primary); font-weight: 600;">${extras}</span></div>` : ''}
      `;
    } else {
      detailHtml = `
        <div style="font-weight: 700; color: var(--color-text-accent); margin-bottom: 6px; border-bottom: 1px solid var(--color-border); padding-bottom: 6px; font-size: 0.85rem;">當前選定模型</div>
        <div style="font-size: 0.78rem;"><span style="color: var(--color-text-muted);">模型 ID:</span> <span style="font-family: var(--font-mono); color: var(--color-text-primary); word-break: break-all;">${idDisplay}</span></div>
      `;
    }

    card.innerHTML = detailHtml;
  }

  hideModal(id) {
    document.getElementById(id)?.classList.add('hidden');
  }

  _syncAudioControls() {
    const settings = gameState.get('audioSettings') ?? CONFIG.AUDIO;
    const btn = document.getElementById('btn-audio-toggle');
    if (!btn) return;
    btn.classList.toggle('muted', Boolean(settings.muted));
    btn.setAttribute('aria-pressed', String(!settings.muted));
    btn.title = settings.muted ? '音訊已靜音' : '音訊已開啟';
    btn.setAttribute('aria-label', btn.title);
    const label = btn.querySelector('.audio-label');
    if (label) label.textContent = settings.muted ? '靜音' : '音訊';
  }

  showLoading(message = 'AI 正在思考中...', { requestId = null, startedAt = performance.now(), canCancel = false } = {}) {
    const el = document.getElementById('loading-indicator');
    if (el) {
      this._clearLoadingTimer();
      this._loadingRequestId = requestId;
      const textEl = el.querySelector('.loading-text');
      const updateText = () => {
        const elapsedSeconds = Math.floor((performance.now() - startedAt) / 1000);
        const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
        const ss = String(elapsedSeconds % 60).padStart(2, '0');
        if (textEl) textEl.textContent = `${message} ${mm}:${ss}`;
      };
      updateText();
      this._loadingTimer = setInterval(updateText, 1000);

      let cancelBtn = el.querySelector('#btn-cancel-llm');
      if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'btn-cancel-llm';
        cancelBtn.type = 'button';
        cancelBtn.className = 'header-btn';
        cancelBtn.textContent = '取消';
        el.appendChild(cancelBtn);
      }
      cancelBtn.classList.toggle('hidden', !canCancel);
      cancelBtn.onclick = () => {
        cancelBtn.disabled = true;
        cancelBtn.textContent = '取消中...';
        eventBus.emit(GameEvent.LLM_CANCEL_REQUESTED, { requestId: this._loadingRequestId });
      };
      cancelBtn.disabled = false;
      cancelBtn.textContent = '取消';

      el.classList.remove('hidden');
    }
  }

  hideLoading() {
    this._clearLoadingTimer();
    this._loadingRequestId = null;
    document.getElementById('loading-indicator')?.classList.add('hidden');
  }

  _clearLoadingTimer() {
    if (this._loadingTimer) {
      clearInterval(this._loadingTimer);
      this._loadingTimer = null;
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, 3000);
  }

  /**
   * 在 scene-display 顯示歡迎畫面，等待使用者手動點擊開始第一場景。
   * 確保使用者完成選擇並回到遊戲畫面後，由自己決定何時觸發 LLM。
   * @param {object} character - 已載入的角色資料
   */
  _showStartScenePrompt(character) {
    const sceneDisplay = document.getElementById('scene-display');
    if (!sceneDisplay) return;

    const name  = character?.name  ?? '冒險者';
    const cls   = character?.class ?? '';

    sceneDisplay.innerHTML = `
      <div style="
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        height:100%;gap:var(--space-6);text-align:center;padding:var(--space-8);
      ">
        <div style="font-size:3rem;filter:drop-shadow(0 0 16px var(--color-accent-alpha))">🎭</div>
        <div>
          <div style="font-size:1.4rem;font-weight:700;color:var(--color-text-accent);margin-bottom:8px">
            ${name}${cls ? `（${cls}）` : ''}
          </div>
          <div style="font-size:.9rem;color:var(--color-text-secondary);line-height:1.7;max-width:420px">
            角色與劇情已就緒。<br>
            點擊下方按鈕，讓 AI 開始敘述你的冒險故事。
          </div>
        </div>
        <button
          id="btn-begin-first-scene"
          class="header-btn primary"
          style="padding:14px 36px;font-size:1rem;letter-spacing:.06em;cursor:pointer"
        >
          ▶ 開始冒險
        </button>
      </div>`;

    // 開始冒險按鈕：點擊後移除畫面並呼叫 LLM
    document.getElementById('btn-begin-first-scene').addEventListener('click', () => {
      sceneDisplay.innerHTML = '';
      gameEngine.beginFirstScene();
    }, { once: true });

    // 行動區尚無選項，確保禁用
    this.actionPanel.setDisabled(true);
  }

  _showEnding(ending) {
    const screen = document.getElementById('ending-screen');
    if (!screen) return;

    const icons = { success: '🏆', failure: '💀', normal: '📖', open: '🌟' };
    const labels = { success: '成功結局', failure: '失敗結局', normal: '普通結局', open: '開放結局' };

    screen.querySelector('.ending-icon').textContent = icons[ending.type] ?? '🎭';
    screen.querySelector('.ending-type').textContent = labels[ending.type] ?? '結局';
    screen.querySelector('.ending-message').textContent = ending.message ?? '';
    screen.classList.remove('hidden');
  }
}
