// ui/dice-animation.js
export class DiceAnimation {
  constructor(el) {
    this._el = el;
    this._pendingTimer = null;
    this._autoHideTimer = null;
  }

  show(result) {
    if (!this._el) return;
    this._clearTimers();
    this._el.innerHTML = this._buildHtml(result);
    this._el.classList.remove('hidden');

    // 骰子搖動動畫
    const dice = this._el.querySelectorAll('.die');
    dice.forEach(d => d.classList.add('rolling'));

    setTimeout(() => {
      dice.forEach((d, i) => {
        d.classList.remove('rolling');
        d.classList.add('shaking');
        d.textContent = result.rolls[i] ?? '?';
        setTimeout(() => d.classList.remove('shaking'), 400);
      });
      this._el.querySelector('.dice-result-panel').classList.remove('hidden');
      this._autoHideTimer = setTimeout(() => this.hide(), 2600);
    }, 900);

    // 點擊關閉
    this._el.addEventListener('click', () => this.hide(), { once: true });
  }

  showPending(result) {
    if (!this._el) return;
    this._clearTimers();
    this._el.innerHTML = this._buildPendingHtml(result);
    this._el.classList.remove('hidden');

    const dice = this._el.querySelectorAll('.die');
    dice.forEach(d => d.classList.add('rolling'));

    this._pendingTimer = setTimeout(() => {
      dice.forEach(d => {
        d.classList.remove('rolling');
        d.textContent = '?';
      });
      this._el.querySelector('.dice-result-panel')?.classList.remove('hidden');
    }, 900);
  }

  reveal(result) {
    this.show(result);
  }

  hide() {
    this._clearTimers();
    if (this._el) this._el.classList.add('hidden');
  }

  _clearTimers() {
    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = null;
    }
  }

  _buildHtml(result) {
    const outcomeLabels = {
      critical_success: '⭐ 大成功！',
      success: '✅ 成功',
      partial_success: '⚠️ 部分成功',
      failure: '❌ 失敗',
      critical_failure: '💀 大失敗！',
    };

    const diceHtml = result.rolls.map(() =>
      `<div class="die rolling">?</div>`
    ).join('');

    const breakdownLines = [
      `骰子（${result.diceType ?? '2d6'}）：${result.rolls.join(' + ')} = ${result.diceTotal}`,
      result.classBonus  ? `職業加成：+${result.classBonus}` : null,
      result.skillBonus  ? `技能加成：+${result.skillBonus}` : null,
      result.statusModifier ? `狀態修正：${result.statusModifier}` : null,
      result.luckModifier   ? `幸運修正：${result.luckModifier}` : null,
    ].filter(Boolean).join('<br>');

    return `
      <div class="dice-container">${diceHtml}</div>
      <div class="dice-result-panel hidden">
        <div class="dice-outcome ${result.outcome}">${outcomeLabels[result.outcome] ?? result.label}</div>
        <div class="dice-breakdown">${breakdownLines}</div>
        <div class="dice-action-value">行動值 = ${result.actionValue}</div>
        ${result.luckEffect ? `<div class="dice-breakdown">LUCK ${result.luckEffect > 0 ? '+' : ''}${result.luckEffect}</div>` : ''}
        <div class="text-muted text-xs" style="margin-top:12px">點擊任意處繼續</div>
      </div>`;
  }

  _buildPendingHtml(result) {
    const diceCount = result?.rolls?.length || 2;
    const diceHtml = Array.from({ length: diceCount }, () =>
      `<div class="die rolling">?</div>`
    ).join('');

    return `
      <div class="dice-container">${diceHtml}</div>
      <div class="dice-result-panel hidden">
        <div class="dice-outcome">等待 AI 回應...</div>
        <div class="dice-breakdown">判定結果將在場景生成後揭露</div>
      </div>`;
  }
}
