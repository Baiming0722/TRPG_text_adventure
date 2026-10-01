// ui/tutorial.js
export class Tutorial {
  constructor() {
    this._steps = [
      { title: '歡迎來到命運回廊', content: '這是一款由 AI 擔任 GM 的 TRPG 文字冒險遊戲。你的每一個選擇都會影響故事走向。', anchor: null },
      { title: '場景描述', content: 'AI 會根據你的行動即時生成故事場景，支援 Markdown 格式。', anchor: '#scene-display' },
      { title: '行動選項', content: '點擊下方的選項按鈕做出決策。🎲 圖示代表此行動需要骰子判定。', anchor: '#action-buttons' },
      { title: '角色面板', content: '右側顯示角色數值。注意 HP（生命值）和 SAN（理智值），歸零即觸發結局。', anchor: '#character-panel' },
      { title: '存檔管理', content: '隨時點擊右上角的存檔按鈕保存進度，支援 3 個手動存檔槽與自動存檔。', anchor: '#btn-save-drawer' },
      { title: '準備好了！', content: '冒險即將開始，祝你好運！', anchor: null },
    ];
    this._currentStep = 0;
    this._el = null;
  }

  start() {
    this._currentStep = 0;
    this._showStep();
  }

  _showStep() {
    const step = this._steps[this._currentStep];
    if (!this._el) {
      this._el = document.createElement('div');
      this._el.className = 'tutorial-tooltip';
      document.body.appendChild(this._el);
    }

    this._el.innerHTML = `
      <div class="tutorial-title">${step.title}</div>
      <div class="tutorial-content">${step.content}</div>
      <div class="tutorial-actions">
        <button class="tutorial-btn" id="tutorial-skip">跳過</button>
        <button class="tutorial-btn next" id="tutorial-next">
          ${this._currentStep < this._steps.length - 1 ? '下一步 →' : '開始！'}
        </button>
      </div>
      <div class="tutorial-step">${this._currentStep + 1} / ${this._steps.length}</div>`;

    // 定位到錨點附近
    this._position(step.anchor);

    this._el.querySelector('#tutorial-skip').addEventListener('click', () => this._finish());
    this._el.querySelector('#tutorial-next').addEventListener('click', () => {
      if (this._currentStep < this._steps.length - 1) {
        this._currentStep++;
        this._showStep();
      } else {
        this._finish();
      }
    });
  }

  _position(anchor) {
    if (!anchor || !this._el) return;
    const target = document.querySelector(anchor);
    if (!target) {
      this._el.style.top = '50%';
      this._el.style.left = '50%';
      this._el.style.transform = 'translate(-50%,-50%)';
      return;
    }
    const rect = target.getBoundingClientRect();
    this._el.style.top = `${rect.bottom + 12}px`;
    this._el.style.left = `${Math.max(8, rect.left)}px`;
    this._el.style.transform = 'none';
  }

  _finish() {
    this._el?.remove();
    this._el = null;
  }
}
