// ui/game-log.js
export class GameLog {
  constructor(el) {
    this._el = el;
    this._entries = [];
  }

  add(text, type = 'system') {
    if (!this._el) return;
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.textContent = `[${time}] ${text}`;
    this._el.appendChild(entry);
    this._el.scrollTop = this._el.scrollHeight;
    this._entries.push({ time, text, type });
  }

  clear() {
    if (this._el) this._el.innerHTML = '';
    this._entries = [];
  }
}
