// ui/action-panel.js
import { eventBus, GameEvent } from '../js/event-bus.js';
import { getEffectiveStat } from '../character/character-system.js';

export class ActionPanel {
  constructor(el) {
    this._el = el;
    this._disabled = false;
  }

  render(actions, character) {
    if (!this._el) return;
    this._el.innerHTML = '';
    if (!actions?.length) return;

    actions.forEach(action => {
      const meetsReq = this._checkRequires(action.requires, character);
      const btn = document.createElement('button');
      btn.className = `action-btn${action.needs_dice ? ' needs-dice' : ''}`;
      btn.disabled = this._disabled || !meetsReq;

      const labelEl = document.createElement('div');
      labelEl.className = 'btn-label';
      labelEl.textContent = action.label;
      btn.appendChild(labelEl);

      if (action.description) {
        const desc = document.createElement('div');
        desc.className = 'btn-desc';
        desc.textContent = action.description;
        btn.appendChild(desc);
      }

      if (action.tags?.length) {
        const tag = document.createElement('div');
        tag.className = 'btn-tag';
        tag.textContent = action.tags.join(' · ');
        btn.appendChild(tag);
      }

      if (!meetsReq && action.requires) {
        btn.title = `需要 ${action.requires.stat} ≥ ${action.requires.min_value}`;
      }

      btn.addEventListener('click', () => {
        if (this._disabled) return;
        eventBus.emit(GameEvent.ACTION_SELECTED, { action });
      });

      this._el.appendChild(btn);
    });
  }

  _checkRequires(requires, character) {
    if (!requires || !character) return true;
    const val = getEffectiveStat(character, requires.stat);
    return val >= (requires.min_value ?? 0);
  }

  setDisabled(disabled) {
    this._disabled = disabled;
    this._el?.querySelectorAll('.action-btn').forEach(btn => {
      btn.disabled = disabled;
    });
  }
}
