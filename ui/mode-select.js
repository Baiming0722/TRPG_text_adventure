// ui/mode-select.js
import { CONFIG } from '../js/config.js';
import { eventBus, GameEvent } from '../js/event-bus.js';

export class ModeSelect {
  constructor() {
    this._onComplete = null;
    this._selectedMode = 'normal';
    this._selectedTheme = CONFIG.DEFAULT_THEME;
    this._selectedCharId = null;
    this._selectedMapId = null;
    this._selectedScenarioId = null;
    this._step = 'mode'; // 'resume' | 'mode' | 'theme' | 'map' | 'char' | 'scenario'
    this._chars = [];
    this._maps = [];
    this._scenarios = [];
  }

  /**
   * 顯示開始流程對話框。
   * 若 localStorage 中存有 autoSave，會先顯示「繼續 / 新遊戲」畫面。
   * @param {Function} onComplete - 新遊戲完成時呼叫：(options) => void
   */
  show(onComplete) {
    this._onComplete = onComplete;
    
    // 顯示 loading 提示
    let el = document.getElementById('start-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'start-modal';
      el.className = 'overlay-backdrop';
      document.body.appendChild(el);
    }
    el.classList.remove('hidden');
    el.innerHTML = `<div class="modal" style="text-align:center">
      <div class="modal-title">🎭 命運回廊</div>
      <div style="color:var(--color-text-secondary);font-size:.9rem;margin-bottom:8px">正在下載命運卡片與劇本...</div>
      <div style="font-size:0.8rem;color:var(--color-text-muted)">請稍候...</div>
    </div>`;

    // 併發載入所有卡片資料
    Promise.all([
      fetch('/api/cards?type=characters').then(r => r.json()),
      fetch('/api/cards?type=maps').then(r => r.json()),
      fetch('/api/cards?type=scenarios').then(r => r.json())
    ]).then(([chars, maps, scenarios]) => {
      this._chars = chars;
      this._maps = maps;
      this._scenarios = scenarios;
      
      this._selectedCharId = chars[0]?.id;
      this._selectedMapId = maps[0]?.id;
      this._selectedScenarioId = scenarios[0]?.id;

      // 偵測是否有自動存檔
      const hasAutoSave = !!localStorage.getItem(CONFIG.SAVE.AUTO_SLOT_KEY);
      this._step = hasAutoSave ? 'resume' : 'mode';
      this._renderStep();
    }).catch(err => {
      console.error('加載資料卡失敗：', err);
      el.innerHTML = `<div class="modal" style="text-align:center">
        <div class="modal-title" style="color:var(--color-failure)">❌ 加載失敗</div>
        <div style="color:var(--color-text-secondary);font-size:.9rem;margin-bottom:16px">無法從伺服器加載資料卡，請確認伺服器已啟動。</div>
        <button class="header-btn" onclick="location.reload()" style="justify-content:center;width:100%">重新整理</button>
      </div>`;
    });
  }

  _renderStep() {
    let el = document.getElementById('start-modal');
    if (!el) return;
    el.innerHTML = this._buildHtml();
    this._bindStep(el);
  }

  _buildHtml() {
    if (this._step === 'resume') return this._buildResumeHtml();
    if (this._step === 'mode')   return this._buildModeHtml();
    if (this._step === 'theme')  return this._buildThemeHtml();
    if (this._step === 'map')    return this._buildMapHtml();
    if (this._step === 'char')   return this._buildCharHtml();
    if (this._step === 'scenario') return this._buildScenarioHtml();
    return '';
  }

  /** 繼續 / 新遊戲 選擇畫面 */
  _buildResumeHtml() {
    let saveInfo = '';
    try {
      const raw = localStorage.getItem(CONFIG.SAVE.AUTO_SLOT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const charName  = data.game_state?.character?.name ?? '未知角色';
        const charClass = data.game_state?.character?.class ?? '';
        const time = new Date(data.timestamp).toLocaleString('zh-TW');
        saveInfo = `<div style="margin:16px 0;padding:12px 16px;border-radius:8px;background:var(--color-bg-elevated);border:1px solid var(--color-border-strong)">
          <div style="font-size:.85rem;color:var(--color-text-accent);font-weight:700">${charName}（${charClass}）</div>
          <div style="font-size:.75rem;color:var(--color-text-muted);margin-top:4px">上次遊玩：${time}</div>
        </div>`;
      }
    } catch { /* 存檔格式異常時跳過 */ }

    return `<div class="modal" style="text-align:center">
      <div class="modal-title">🎭 命運回廊</div>
      <div style="color:var(--color-text-secondary);font-size:.9rem;margin-bottom:8px">偵測到上次的遊戲進度</div>
      ${saveInfo}
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
        <button class="header-btn primary" id="btn-resume-continue"
          style="justify-content:center;padding:14px;font-size:1rem">
          ▶ 繼續上次遊戲
        </button>
        <button class="header-btn" id="btn-resume-new"
          style="justify-content:center;padding:12px;font-size:.9rem">
          ＋ 開始全新冒險
        </button>
      </div>
    </div>`;
  }

  _buildModeHtml() {
    const modes = [
      { id: 'normal',   icon: '⚔️',  name: '一般模式',   desc: '標準遊戲體驗，均衡難度。' },
      { id: 'speedrun', icon: '⚡',  name: '速通模式',   desc: '快節奏，屬性加成，跳過細節。' },
      { id: 'collect',  icon: '🔍',  name: '蒐集探索',   desc: '顯示探索紀錄與事件提示。' },
      { id: 'test',     icon: '🔧',  name: '測試模式',   desc: '需要密碼。可直接設定數值。' },
    ];
    return `<div class="modal">
      <div class="modal-title">🎭 命運回廊</div>
      <div class="modal-title" style="font-size:1rem;margin-bottom:16px;color:var(--color-text-secondary)">選擇遊玩模式</div>
      <div class="mode-cards">
        ${modes.map(m => `
          <div class="mode-card${this._selectedMode === m.id ? ' selected' : ''}" data-mode="${m.id}">
            <div class="mode-card-icon">${m.icon}</div>
            <div class="mode-card-name">${m.name}</div>
            <div class="mode-card-desc">${m.desc}</div>
          </div>`).join('')}
      </div>
      <div id="test-pw-row" style="margin-top:16px;display:${this._selectedMode === 'test' ? '' : 'none'}">
        <input type="password" id="test-pw-input" placeholder="請輸入測試密碼" style="width:100%">
        <div id="test-pw-err" style="color:var(--color-failure);font-size:.78rem;margin-top:4px;display:none">密碼錯誤</div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:24px">
        <button class="header-btn primary" id="mode-next-btn">下一步 →</button>
      </div>
    </div>`;
  }

  _buildThemeHtml() {
    return `<div class="modal">
      <div class="modal-title">🎨 選擇色彩主題</div>
      <div class="theme-cards">
        ${CONFIG.THEMES.map(t => `
          <div class="theme-card${this._selectedTheme === t.id ? ' selected' : ''}" data-theme="${t.id}">
            <div class="theme-card-preview" aria-hidden="true">
              <span class="theme-swatch swatch-a"></span>
              <span class="theme-swatch swatch-b"></span>
              <span class="theme-swatch swatch-c"></span>
              <span class="theme-card-emblem">${t.icon}</span>
            </div>
            <div class="theme-card-name">${t.name}</div>
            <div style="font-size:.7rem;color:var(--color-text-muted)">${t.desc}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:24px">
        <button class="header-btn" id="theme-back-btn">← 返回</button>
        <button class="header-btn primary" id="theme-next-btn">下一步 →</button>
      </div>
    </div>`;
  }

  _buildMapHtml() {
    return `<div class="modal">
      <div class="modal-title">🗺️ 選擇探索地圖</div>
      <div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:16px">系統將為您自動適配對應事件與章節</div>
      <div class="char-cards">
        ${this._maps.map(m => `
          <div class="char-card${this._selectedMapId === m.id ? ' selected' : ''}" data-map="${m.id}">
            <div class="char-card-icon">📍</div>
            <div class="char-card-info">
              <div class="char-card-name">${m.name}</div>
              <div class="char-card-bg">${m.description?.slice(0, 50)}...</div>
            </div>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:24px">
        <button class="header-btn" id="map-back-btn">← 返回</button>
        <button class="header-btn primary" id="map-next-btn">下一步 →</button>
      </div>
    </div>`;
  }

  _buildCharHtml() {
    return `<div class="modal" style="max-height:80vh;overflow-y:auto;">
      <div class="modal-title">👤 選擇角色</div>
      <div class="char-cards">
        ${this._chars.map(c => `
          <div class="char-card${this._selectedCharId === c.id ? ' selected' : ''}" data-char="${c.id}">
            <div class="char-card-icon">🧑</div>
            <div class="char-card-info">
              <div class="char-card-name">${c.name}</div>
              <div class="char-card-class">${c.class}</div>
              <div class="char-card-bg">${c.background?.slice(0, 30)}...</div>
            </div>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:24px">
        <button class="header-btn" id="char-back-btn">← 返回</button>
        <button class="header-btn primary" id="char-next-btn">${this._selectedMode === 'test' ? '下一步 →' : '🎮 開始冒險'}</button>
      </div>
    </div>`;
  }

  _buildScenarioHtml() {
    return `<div class="modal">
      <div class="modal-title">📖 選擇劇本章節 (測試模式)</div>
      <div class="char-cards">
        ${this._scenarios.map(s => `
          <div class="char-card${this._selectedScenarioId === s.id ? ' selected' : ''}" data-scenario="${s.id}">
            <div class="char-card-icon">📜</div>
            <div class="char-card-info">
              <div class="char-card-name">${s.title}</div>
              <div class="char-card-bg">${s.description?.slice(0, 40)}...</div>
            </div>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:24px">
        <button class="header-btn" id="scenario-back-btn">← 返回</button>
        <button class="header-btn primary" id="scenario-start-btn">🎮 啟動測試</button>
      </div>
    </div>`;
  }

  _bindStep(el) {
    if (this._step === 'resume') {
      // 繼續上次遊戲
      el.querySelector('#btn-resume-continue').addEventListener('click', () => {
        el.classList.add('hidden');
        eventBus.emit(GameEvent.LOAD_REQUESTED, { slot: 'auto' });
      });
      // 開始新遊戲
      el.querySelector('#btn-resume-new').addEventListener('click', () => {
        this._step = 'mode';
        this._renderStep();
      });
    } else if (this._step === 'mode') {
      el.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
          el.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this._selectedMode = card.dataset.mode;
          el.querySelector('#test-pw-row').style.display = this._selectedMode === 'test' ? '' : 'none';
        });
      });
      el.querySelector('#mode-next-btn').addEventListener('click', () => {
        if (this._selectedMode === 'test') {
          const pw = el.querySelector('#test-pw-input').value;
          if (pw !== CONFIG.TEST_MODE_PASSWORD) {
            el.querySelector('#test-pw-err').style.display = '';
            return;
          }
        }
        this._step = 'theme';
        this._renderStep();
      });
    } else if (this._step === 'theme') {
      el.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
          el.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this._selectedTheme = card.dataset.theme;
          document.documentElement.setAttribute('data-theme', this._selectedTheme);
        });
      });
      el.querySelector('#theme-back-btn').addEventListener('click', () => { this._step = 'mode'; this._renderStep(); });
      el.querySelector('#theme-next-btn').addEventListener('click', () => { this._step = 'map'; this._renderStep(); });
    } else if (this._step === 'map') {
      el.querySelectorAll('.char-card').forEach(card => {
        card.addEventListener('click', () => {
          el.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this._selectedMapId = card.dataset.map;
        });
      });
      el.querySelector('#map-back-btn').addEventListener('click', () => { this._step = 'theme'; this._renderStep(); });
      el.querySelector('#map-next-btn').addEventListener('click', () => { this._step = 'char'; this._renderStep(); });
    } else if (this._step === 'char') {
      el.querySelectorAll('.char-card').forEach(card => {
        card.addEventListener('click', () => {
          el.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this._selectedCharId = card.dataset.char;
        });
      });
      el.querySelector('#char-back-btn').addEventListener('click', () => { this._step = 'map'; this._renderStep(); });
      el.querySelector('#char-next-btn').addEventListener('click', () => {
        if (this._selectedMode === 'test') {
          this._step = 'scenario';
          this._renderStep();
        } else {
          this._finish(el);
        }
      });
    } else if (this._step === 'scenario') {
      el.querySelectorAll('.char-card').forEach(card => {
        card.addEventListener('click', () => {
          el.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this._selectedScenarioId = card.dataset.scenario;
        });
      });
      el.querySelector('#scenario-back-btn').addEventListener('click', () => { this._step = 'char'; this._renderStep(); });
      el.querySelector('#scenario-start-btn').addEventListener('click', () => { this._finish(el); });
    }
  }

  _finish(el) {
    el.classList.add('hidden');
    this._onComplete?.({
      characterId: this._selectedCharId,
      mapId: this._selectedMapId,
      scenarioId: this._selectedMode === 'test' ? this._selectedScenarioId : null,
      playMode: this._selectedMode,
      theme: this._selectedTheme,
    });
  }
}
