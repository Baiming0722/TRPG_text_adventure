// debug_monitor/debug-monitor.js
// Debug 監控儀表板：透過 LocalStorage 輪詢讀取遊戲狀態

const DEBUG_KEY = 'trpg_debug_state';
const POLL_INTERVAL = 1000;

let _paused = false;
let _timer = null;
let _lastData = null;

function init() {
  // Tab 切換
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
      if (_lastData) render(_lastData); // 切換分頁時立即渲染該分頁
    });
  });

  // 控制按鈕
  document.getElementById('btn-pause')?.addEventListener('click', () => {
    _paused = !_paused;
    const btn = document.getElementById('btn-pause');
    btn.textContent = _paused ? '▶ 繼續更新' : '⏸ 暫停更新';
    btn.classList.toggle('active', _paused);
    document.querySelector('.debug-status').className = `debug-status ${_paused ? 'paused' : 'live'}`;
    document.querySelector('.debug-status').textContent = _paused ? '⏸ 已暫停' : '● 即時更新';
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    if (!_lastData) return;
    const json = JSON.stringify(_lastData, null, 2);
    const a = document.createElement('a');
    a.href = 'data:application/json,' + encodeURIComponent(json);
    a.download = `trpg_debug_${Date.now()}.json`;
    a.click();
  });

  // 開始輪詢
  startPolling();
}

function startPolling() {
  _timer = setInterval(() => {
    if (_paused) return;
    const raw = localStorage.getItem(DEBUG_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.timestamp !== _lastData?.timestamp) {
        _lastData = data;
        render(data);
      }
    } catch (e) { console.error("Render Error:", e); }
  }, POLL_INTERVAL);
}

function render(data) {
  renderMap(data);
  renderStory(data);
  renderCharacter(data);
  renderPrompt(data);
  renderDice(data);
  renderEvents(data);
}

function renderMap(data) {
  const panel = document.getElementById('tab-map');
  if (!panel?.classList.contains('active')) return;
  const map = data.currentMapCard;
  const mapState = data.mapState ?? {};
  const currentNodeId = data.currentNodeId;

  if (!map) { panel.innerHTML = '<div style="color:var(--muted)">地圖未載入</div>'; return; }

  const nodeStates = mapState[map.id] ?? {};
  const nodesHtml = map.nodes.map(node => {
    const s = nodeStates[node.id] ?? {};
    const isCurrent = node.id === currentNodeId;
    const isExplored = s.explored ?? false;
    const isLocked = s.locked ?? node.locked ?? false;
    const dotClass = isCurrent ? 'current' : isLocked ? 'locked' : isExplored ? 'explored' : 'accessible';
    return `<div class="node-item">
      <div class="node-dot ${dotClass}"></div>
      <span>${node.name}</span>
      <span style="color:var(--muted);font-size:.72rem">${isCurrent ? '[當前]' : isLocked ? '[鎖定]' : isExplored ? '[已探索]' : '[未探索]'}</span>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="dbg-section">
      <div class="dbg-section-title">地圖：${map.name}</div>
      ${nodesHtml}
    </div>`;
}

function renderStory(data) {
  const panel = document.getElementById('tab-story');
  if (!panel?.classList.contains('active')) return;
  const scenario = data.currentScenarioCard;
  const flags = data.flags ?? {};

  const flagsHtml = Object.entries(flags)
    .map(([k, v]) => `<div class="flag-item"><span class="flag-key">${k}</span><span class="flag-val">= ${JSON.stringify(v)}</span></div>`)
    .join('') || '<div style="color:var(--muted)">無旗標</div>';

  panel.innerHTML = `
    <div class="dbg-section">
      <div class="dbg-section-title">劇情進度</div>
      ${scenario ? `
        <div><b>${scenario.title}</b>（第 ${scenario.chapter} 章）</div>
        <div style="color:var(--muted);font-size:.8rem;margin-top:4px">${scenario.description}</div>
        <div style="margin-top:8px;font-size:.78rem">節點：${data.currentNodeId ?? '未設定'}</div>
      ` : '<div style="color:var(--muted)">劇情未載入</div>'}
    </div>
    <div class="dbg-section">
      <div class="dbg-section-title">全域旗標（${Object.keys(flags).length}）</div>
      ${flagsHtml}
    </div>`;
}

function renderCharacter(data) {
  const panel = document.getElementById('tab-char');
  if (!panel?.classList.contains('active')) return;
  const char = data.character;
  if (!char) { panel.innerHTML = '<div style="color:var(--muted)">角色未載入</div>'; return; }

  const allStats = { ...char.stats, ...char.derived_stats };
  const statsHtml = Object.entries(allStats).map(([k, v]) =>
    `<div class="stat-box"><div class="stat-box-label">${k}</div><div class="stat-box-value">${v}</div></div>`
  ).join('');

  const skillsHtml = (char.skills ?? []).map(s =>
    `<tr><td>${s.name}</td><td>${s.type}</td><td>+${s.bonus}</td></tr>`
  ).join('');

  const statusHtml = (char.status_effects ?? []).map(e =>
    `<span style="background:rgba(224,82,82,.15);color:var(--error);padding:1px 8px;border-radius:99px;font-size:.72rem">${e.name}</span>`
  ).join(' ') || '<span style="color:var(--muted)">無</span>';

  const tempHtml = (char.temp_modifiers ?? []).map(m =>
    `<tr><td>${m.stat}</td><td>${m.value > 0 ? '+' : ''}${m.value}</td><td>${m.source}</td></tr>`
  ).join('');

  panel.innerHTML = `
    <div class="dbg-section">
      <div class="dbg-section-title">${char.name}（${char.class}）</div>
      <div class="stat-grid">${statsHtml}</div>
    </div>
    <div class="dbg-section">
      <div class="dbg-section-title">技能</div>
      <table class="dbg-table"><thead><tr><th>名稱</th><th>類型</th><th>加值</th></tr></thead><tbody>${skillsHtml}</tbody></table>
    </div>
    <div class="dbg-section">
      <div class="dbg-section-title">狀態效果</div>${statusHtml}
    </div>
    ${tempHtml ? `<div class="dbg-section">
      <div class="dbg-section-title">臨時修正</div>
      <table class="dbg-table"><thead><tr><th>屬性</th><th>值</th><th>來源</th></tr></thead><tbody>${tempHtml}</tbody></table>
    </div>` : ''}`;
}

function renderPrompt(data) {
  const panel = document.getElementById('tab-prompt');
  if (!panel?.classList.contains('active')) return;
  const prompt = data.lastPrompt;
  if (!prompt) { panel.innerHTML = '<div style="color:var(--muted)">尚無 Prompt 資料</div>'; return; }

  const msgHtml = (prompt.messages ?? []).map(m =>
    `<div class="prompt-block">
      <div class="prompt-role">${m.role.toUpperCase()}</div>
      <div class="prompt-content">${escHtml(m.content)}</div>
    </div>`
  ).join('');

  panel.innerHTML = `
    <div class="prompt-block">
      <div class="prompt-role">SYSTEM</div>
      <div class="prompt-content">${escHtml(prompt.system ?? '')}</div>
    </div>
    ${msgHtml}`;
}

function renderDice(data) {
  const panel = document.getElementById('tab-dice');
  if (!panel?.classList.contains('active')) return;
  const history = data.diceHistory ?? [];

  if (!history.length) { panel.innerHTML = '<div style="color:var(--muted)">尚無骰子紀錄</div>'; return; }

  const rows = history.map(r => `
    <div class="dice-row">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span class="dice-outcome ${r.outcome}">${r.label}</span>
        <span style="font-weight:600">${r.actionLabel || '（未知行動）'}</span>
        <span style="color:var(--muted);font-size:.72rem;margin-left:auto">${r.timestamp?.slice(11,19)}</span>
      </div>
      <div style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">
        骰子（${r.diceType ?? '2d6'}）：${(r.rolls ?? []).join('+')} = ${r.diceTotal}
        ｜職業 +${r.classBonus}
        ｜技能 +${r.skillBonus}
        ｜狀態 ${r.statusModifier}
        ｜幸運 ${r.luckModifier}
        ｜<span style="color:var(--text)">行動值 = ${r.actionValue}</span>
        ${r.isForcedRoll ? '<span style="color:var(--warn)">（強制）</span>' : ''}
      </div>
    </div>`).join('');

  panel.innerHTML = rows;
}

function renderEvents(data) {
  const panel = document.getElementById('tab-events');
  if (!panel?.classList.contains('active')) return;
  const history = data.eventHistory ?? [];

  if (!history.length) { panel.innerHTML = '<div style="color:var(--muted)">尚無事件紀錄</div>'; return; }

  const rows = history.map(e => `
    <tr>
      <td>${e.timestamp?.slice(11,19) ?? ''}</td>
      <td style="color:var(--accent)">${e.eventId}</td>
      <td>${e.eventTitle ?? ''}</td>
      <td style="color:var(--muted)">${(e.effects ?? []).join(', ')}</td>
    </tr>`).join('');

  panel.innerHTML = `
    <table class="dbg-table">
      <thead><tr><th>時間</th><th>事件 ID</th><th>標題</th><th>效果</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', init);
