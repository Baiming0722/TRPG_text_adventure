// ui/scene-renderer.js
// marked.js 透過 <script> 標籤載入至 window.marked（見 index.html）

export class SceneRenderer {
  constructor(el) {
    this._el = el;
    this._currentText = '';
  }

  render(text, isFallback = false) {
    if (!text || !this._el) return;
    this._el.innerHTML = '';
    if (isFallback) {
      const warn = document.createElement('p');
      warn.style.color = 'var(--color-partial-success)';
      warn.style.fontSize = '.82rem';
      warn.textContent = '⚠️ 備援模式';
      this._el.appendChild(warn);
    }
    // 優化 LLM 輸出的文字顯示，遇到句號就換行
    const formattedText = text.replace(/。/g, '。\n\n');

    // 使用 window.marked 渲染 Markdown（CDN 全域載入）
    const markedParser = window.marked ?? { parse: (t) => `<p>${t}</p>` };
    const html = markedParser.parse(formattedText);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    this._el.appendChild(wrapper);
    this._el.scrollTop = 0;
  }
}
