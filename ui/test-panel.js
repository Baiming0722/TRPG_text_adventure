// ui/test-panel.js
import { eventBus, GameEvent } from '../js/event-bus.js';
import { setForcedDiceValue, setForcedDiceType } from '../dice/dice-system.js';
import { applyPermanentChange } from '../character/character-system.js';
import { gameState } from '../js/game-state.js';

export class TestPanel {
  constructor(el) {
    this._el = el;
    this._visible = false;
  }

  show() {
    if (!this._el) return;
    this._visible = true;
    this._el.classList.add('open');
    this._render();
  }

  hide() {
    this._el?.classList.remove('open');
    this._visible = false;
  }

  toggle() { this._visible ? this.hide() : this.show(); }

  _render() {
    if (!this._el) return;
    this._el.innerHTML = `
      <div class="test-title">🔧 測試模式面板</div>
      <div class="test-grid">
        <div class="test-row">
          <div class="test-label">強制骰子值（2~12，0=隨機）</div>
          <input class="test-input" type="number" id="test-dice-val" min="0" max="100" value="0">
          <button class="test-apply-btn" id="test-apply-dice">套用</button>
        </div>
        <div class="test-row">
          <div class="test-label">骰子類型</div>
          <select class="test-input" id="test-dice-type">
            <option value="">預設（自動）</option>
            <option value="2d4">2d4</option>
            <option value="2d6">2d6</option>
            <option value="2d8">2d8</option>
            <option value="2d10">2d10</option>
            <option value="1d20">1d20</option>
            <option value="1d100">1d100</option>
          </select>
        </div>
        <div class="test-row">
          <div class="test-label">HP 增減</div>
          <input class="test-input" type="number" id="test-hp-delta" value="0">
          <button class="test-apply-btn" id="test-apply-hp">套用</button>
        </div>
        <div class="test-row">
          <div class="test-label">SAN 增減</div>
          <input class="test-input" type="number" id="test-san-delta" value="0">
          <button class="test-apply-btn" id="test-apply-san">套用</button>
        </div>
        <div class="test-row">
          <div class="test-label">旗標名稱</div>
          <input class="test-input" type="text" id="test-flag-key" placeholder="flag_name">
          <button class="test-apply-btn" id="test-set-flag">設為 true</button>
        </div>
      </div>
      <button class="test-apply-btn" id="test-close" style="margin-top:12px;width:100%">關閉</button>`;

    this._el.querySelector('#test-apply-dice').addEventListener('click', () => {
      const val = parseInt(this._el.querySelector('#test-dice-val').value);
      setForcedDiceValue(val === 0 ? null : val);
      
      const type = this._el.querySelector('#test-dice-type').value;
      setForcedDiceType(type || null);
      
      eventBus.emit(GameEvent.DICE_RULES_CHANGED, { forcedValue: val, forcedType: type });
    });
    this._el.querySelector('#test-apply-hp').addEventListener('click', () => {
      const delta = parseInt(this._el.querySelector('#test-hp-delta').value);
      if (!isNaN(delta)) applyPermanentChange('HP', delta);
    });
    this._el.querySelector('#test-apply-san').addEventListener('click', () => {
      const delta = parseInt(this._el.querySelector('#test-san-delta').value);
      if (!isNaN(delta)) applyPermanentChange('SAN', delta);
    });
    this._el.querySelector('#test-set-flag').addEventListener('click', () => {
      const key = this._el.querySelector('#test-flag-key').value.trim();
      if (key) gameState.setFlag(key, true);
    });
    this._el.querySelector('#test-close').addEventListener('click', () => this.hide());
  }
}
