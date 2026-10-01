// ui/explore-panel.js
import { gameState } from '../js/game-state.js';
import { getMapSummary } from '../map/map-system.js';

export class ExplorePanel {
  constructor(el) {
    this._el = el;
    this._open = false;
    this._el?.querySelector('.drawer-close-btn')?.addEventListener('click', () => this.close());
  }

  toggle() { this._open ? this.close() : this.open(); }

  open() {
    this._open = true;
    this._el?.classList.add('open');
    this.refresh();
  }

  close() {
    this._open = false;
    this._el?.classList.remove('open');
  }

  refresh() {
    const body = this._el?.querySelector('.explore-body');
    if (!body) return;

    const state = gameState.getState();
    const nodes = getMapSummary();
    const eventHistory = state.eventHistory ?? [];
    const flags = state.flags ?? {};

    body.innerHTML = `
      <div class="explore-section">
        <div class="panel-section-title">已探索地點（${nodes.filter(n => n.explored).length}/${nodes.length}）</div>
        ${nodes.map(n => `
          <div class="explore-item">
            <span class="explore-item-icon">${n.isCurrent ? '📍' : n.explored ? '✅' : n.locked ? '🔒' : '❓'}</span>
            <span class="explore-item-name ${n.explored ? 'visited' : ''}">${n.name}</span>
          </div>`).join('')}
      </div>
      <div class="explore-section">
        <div class="panel-section-title">已觸發事件（${eventHistory.length}）</div>
        ${eventHistory.length ? eventHistory.map(e => `
          <div class="explore-item">
            <span class="explore-item-icon">📌</span>
            <span class="explore-item-name visited">${e.eventTitle ?? e.eventId}</span>
          </div>`).join('') : '<div class="text-muted text-sm">（尚無紀錄）</div>'}
      </div>
      <div class="explore-section">
        <div class="panel-section-title">遊戲旗標</div>
        <div style="font-family:monospace;font-size:.72rem;color:var(--color-text-secondary)">
          ${Object.entries(flags).filter(([,v]) => v === true).map(([k]) =>
            `<div>✓ ${k}</div>`
          ).join('') || '<div class="text-muted">（無）</div>'}
        </div>
      </div>`;
  }
}
