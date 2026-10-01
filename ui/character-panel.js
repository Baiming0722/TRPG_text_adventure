// ui/character-panel.js
import { getEffectiveStat } from '../character/character-system.js';

export class CharacterPanel {
  constructor(el) {
    this._el = el;
  }

  render(character) {
    if (!character || !this._el) return;
    const s = character.stats;
    const d = character.derived_stats;

    const hp   = getEffectiveStat(character, 'HP');
    const san  = getEffectiveStat(character, 'SAN');
    const luck = getEffectiveStat(character, 'LUCK');
    const maxHp   = d.HP;
    const maxSan  = d.SAN;

    // 整合新角色屬性 (age, gender, personality, wealth)
    const ageStr = character.age ? `${character.age} 歲` : '';
    const genderStr = character.gender ? `${character.gender}` : '';
    const personalStr = character.personality ? `性格：${character.personality}` : '';
    const wealthStr = character.wealth ? `資產：${character.wealth}` : '';
    const extraMeta = [ageStr, genderStr, personalStr, wealthStr].filter(Boolean).join(' | ');

    this._el.innerHTML = `
      <div class="panel-section-title">角色資訊</div>
      <div class="char-header">
        <div class="char-name">${character.name}</div>
        <div class="char-class">${character.class}・${character.background?.slice(0,20) ?? ''}</div>
        ${extraMeta ? `<div class="char-meta" style="font-size:0.75rem;color:var(--color-text-muted);margin-top:6px">${extraMeta}</div>` : ''}
      </div>

      <div>
        <div class="panel-section-title">數值</div>
        ${this._bar('HP', hp, maxHp, 'hp')}
        ${this._bar('SAN', san, maxSan, 'san')}
        ${this._bar('LUCK', luck, 100, 'luck')}
      </div>

      <div>
        <div class="panel-section-title">屬性</div>
        <div class="stats-grid">
          ${['STR','DEX','INT','POW','MOV'].map(k =>
            `<div class="stat-cell">
               <div class="stat-cell-label">${k}</div>
               <div class="stat-cell-value">${getEffectiveStat(character, k)}</div>
             </div>`
          ).join('')}
        </div>
      </div>

      <div>
        <div class="panel-section-title">技能</div>
        <div class="skills-list">
          ${(character.skills ?? []).map(sk => {
            // 合法的屬性名稱集合
            const VALID_STATS = new Set(['STR','DEX','INT','POW','MOV','HP','SAN','LUCK']);
            const statLabel = VALID_STATS.has(sk.type) ? sk.type : null;
            const label = statLabel
              ? `${sk.name} <span class="skill-tag-stat">(${statLabel} +${sk.bonus})</span>`
              : `${sk.name} +${sk.bonus}`;
            return `<span class="skill-tag">${label}</span>`;
          }).join('') || '<span class="text-muted text-xs">無</span>'}
        </div>
      </div>

      ${(character.status_effects?.length) ? `
      <div>
        <div class="panel-section-title">狀態效果</div>
        <div class="status-list">
          ${character.status_effects.map(e => `<span class="status-tag">${e.name}</span>`).join('')}
        </div>
      </div>` : ''}

      ${(character.inventory?.length) ? `
      <div>
        <div class="panel-section-title">道具</div>
        <div class="inventory-list">
          ${character.inventory.map(i => {
            const name = i.name || i.item || '未知道具';
            const qty = i.quantity ? ` (x${i.quantity})` : '';
            return `<div class="inventory-item">🎒 ${name}${qty}</div>`;
          }).join('')}
        </div>
      </div>` : ''}
    `;
  }

  _bar(label, value, max, cls) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return `
      <div class="stat-bar-row">
        <div class="stat-bar-header">
          <span class="stat-bar-label">${label}</span>
          <span class="stat-bar-value">${value}/${max}</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }
}
