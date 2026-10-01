// ui/save-drawer.js
import { eventBus, GameEvent } from '../js/event-bus.js';
import { listSlots, deleteSlot, exportSave, importSave } from '../save/save-system.js';

export class SaveDrawer {
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
    const body = this._el?.querySelector('.drawer-body');
    if (!body) return;
    body.innerHTML = '';

    const slots = listSlots();
    slots.forEach(slot => {
      body.appendChild(this._buildSlotEl(slot));
    });

    // 匯入按鈕
    const importRow = document.createElement('div');
    importRow.style.marginTop = '8px';
    importRow.innerHTML = `
      <label class="save-btn" style="display:block;text-align:center;cursor:pointer">
        📥 匯入存檔（JSON）
        <input type="file" accept=".json" style="display:none" id="import-file-input">
      </label>`;
    importRow.querySelector('#import-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = importSave(1, ev.target.result);
        eventBus.emit(GameEvent.SAVE_DONE, { success: result.success, message: result.message });
        this.refresh();
      };
      reader.readAsText(file);
    });
    body.appendChild(importRow);
  }

  _buildSlotEl(slot) {
    const el = document.createElement('div');
    el.className = `save-slot${slot.type === 'auto' ? ' auto' : ''}`;

    const label = slot.type === 'auto' ? '自動存檔' : `存檔槽 ${slot.slot}`;

    if (slot.empty) {
      el.innerHTML = `
        <div class="save-slot-header">
          <span class="save-slot-label">${label}</span>
        </div>
        <div class="save-slot-detail text-muted">（空）</div>
        <div class="save-slot-actions">
          <button class="save-btn" id="do-save-${slot.slot}">💾 儲存到此槽</button>
        </div>`;
      el.querySelector(`#do-save-${slot.slot}`).addEventListener('click', () => {
        eventBus.emit(GameEvent.SAVE_REQUESTED, { slot: slot.slot });
      });
    } else if (slot.corrupted) {
      el.innerHTML = `<div class="save-slot-detail" style="color:var(--color-failure)">⚠️ 存檔損壞</div>`;
    } else {
      const time = new Date(slot.timestamp).toLocaleString('zh-TW');
      el.innerHTML = `
        <div class="save-slot-header">
          <span class="save-slot-label">${label}</span>
          <span class="save-slot-time">${time}</span>
        </div>
        <div class="save-slot-char">${slot.characterName} (${slot.characterClass})</div>
        <div class="save-slot-detail">${slot.compatible ? '' : '⚠️ 版本不相容'}</div>
        <div class="save-slot-actions">
          ${slot.type !== 'auto' ? `<button class="save-btn" id="do-save2-${slot.slot}">💾 覆蓋</button>` : ''}
          <button class="save-btn load" id="do-load-${slot.slot}">📂 讀取</button>
          <button class="save-btn" id="do-export-${slot.slot}">📤 匯出</button>
          ${slot.type !== 'auto' ? `<button class="save-btn delete" id="do-del-${slot.slot}">🗑</button>` : ''}
        </div>`;

      el.querySelector(`#do-save2-${slot.slot}`)?.addEventListener('click', () => {
        eventBus.emit(GameEvent.SAVE_REQUESTED, { slot: slot.slot });
      });
      el.querySelector(`#do-load-${slot.slot}`)?.addEventListener('click', () => {
        if (confirm('確定要讀取此存檔？目前進度將遺失。')) {
          eventBus.emit(GameEvent.LOAD_REQUESTED, { slot: slot.slot });
        }
      });
      el.querySelector(`#do-export-${slot.slot}`)?.addEventListener('click', () => {
        const json = exportSave(slot.slot);
        if (json) {
          const a = document.createElement('a');
          a.href = 'data:application/json,' + encodeURIComponent(json);
          a.download = `trpg_save_slot${slot.slot}.json`;
          a.click();
        }
      });
      el.querySelector(`#do-del-${slot.slot}`)?.addEventListener('click', () => {
        if (confirm('確定刪除此存檔？')) {
          deleteSlot(slot.slot);
          this.refresh();
        }
      });
    }
    return el;
  }
}
