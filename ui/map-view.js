// ui/map-view.js
import { getMapSummary } from '../map/map-system.js';

export class MapView {
  constructor(canvasEl) {
    this._canvas = canvasEl;

    // 視口狀態：位移與縮放
    this._offsetX = 0;
    this._offsetY = 0;
    this._scale  = 1;

    // 拖移狀態
    this._dragging   = false;
    this._lastMouseX = 0;
    this._lastMouseY = 0;

    // 快取佈局（用於 tooltip hover）
    this._layout = {};
    this._nodes  = [];

    this._bindInteraction();
  }

  // ─── 公開方法 ────────────────────────────────────────────

  render() {
    const nodes = getMapSummary();
    if (!this._canvas) return;

    this._nodes = nodes;

    const rect = this._canvas.getBoundingClientRect();
    const W = rect.width  || 280;
    const H = rect.height || 140;

    const ctx = this._canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // 同步實際像素大小，確保畫面銳利
    this._canvas.width        = W * dpr;
    this._canvas.height       = H * dpr;
    this._canvas.style.width  = `${W}px`;
    this._canvas.style.height = `${H}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    if (!nodes.length) {
      // 沒有地圖時顯示提示文字
      ctx.fillStyle = 'rgba(100,120,160,0.4)';
      ctx.font = '12px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('尚未載入地圖', W / 2, H / 2);
      return;
    }

    // 計算基礎佈局（以畫布原始大小為基準，不含 transform）
    this._layout = this._computeLayout(nodes, W, H);

    // 套用拖移 + 縮放 transform
    ctx.save();
    ctx.translate(this._offsetX, this._offsetY);
    ctx.scale(this._scale, this._scale);

    this._drawEdges(ctx, nodes);
    this._drawNodes(ctx, nodes, W, H);

    ctx.restore();

    // 圖例固定在左下角（不受 transform 影響）
    this._drawLegend(ctx, W, H);
  }

  // ─── 繪製方法 ────────────────────────────────────────────

  _drawEdges(ctx, nodes) {
    ctx.strokeStyle = 'rgba(180,200,255,0.18)';
    ctx.lineWidth   = 1.5;
    nodes.forEach(node => {
      const from = this._layout[node.id];
      (node.connections ?? []).forEach(connId => {
        const to = this._layout[connId];
        if (!from || !to) return;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    });
  }

  _drawNodes(ctx, nodes) {
    nodes.forEach(node => {
      const pos = this._layout[node.id];
      if (!pos) return;

      const color = node.isCurrent  ? '#a87eff'
        : node.locked    ? '#3a4460'
        : node.explored  ? '#3dd68c'
        : node.accessible ? '#f0a832'
        : '#3a4460';

      const radius = node.isCurrent ? 11 : 8;

      // 節點主體
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = node.isCurrent ? 18 : (node.accessible || node.explored ? 10 : 0);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 當前節點外環脈衝圈
      if (node.isCurrent) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 17, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(168,126,255,0.5)';
        ctx.lineWidth   = 2;
        ctx.stroke();
      }

      // 節點名稱
      ctx.fillStyle  = node.isCurrent ? '#ffffff' : 'rgba(220,228,245,0.9)';
      ctx.font       = node.isCurrent
        ? 'bold 13px "Noto Sans TC", sans-serif'
        : '12px "Noto Sans TC", sans-serif';
      ctx.textAlign  = 'center';
      ctx.fillText(node.name.slice(0, 6), pos.x, pos.y + radius + 14);
    });
  }

  _drawLegend(ctx, W, H) {
    const items = [
      ['#a87eff', '當前'],
      ['#3dd68c', '已探'],
      ['#f0a832', '可達'],
      ['#3a4460', '鎖定'],
    ];
    ctx.font      = '10px "Noto Sans TC", monospace';
    ctx.textAlign = 'left';
    items.forEach(([c, label], i) => {
      const y = H - 14 - i * 14;
      ctx.fillStyle = c;
      ctx.fillRect(6, y, 7, 7);
      ctx.fillStyle = 'rgba(180,190,210,0.75)';
      ctx.fillText(label, 17, y + 7);
    });

    // 縮放比例提示
    const pct = Math.round(this._scale * 100);
    ctx.fillStyle = 'rgba(120,130,160,0.6)';
    ctx.textAlign = 'right';
    ctx.font      = '10px monospace';
    ctx.fillText(`${pct}%`, W - 6, H - 6);
  }

  // ─── 佈局計算 ─────────────────────────────────────────────

  _computeLayout(nodes, W, H) {
    const layout = {};
    const cx = W / 2;
    const cy = H / 2 - 8;
    const r  = Math.min(W, H) * 0.3;

    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      layout[node.id] = {
        x: Math.round(cx + r * Math.cos(angle)),
        y: Math.round(cy + r * Math.sin(angle)),
      };
    });
    return layout;
  }

  // ─── 互動事件 ─────────────────────────────────────────────

  _bindInteraction() {
    if (!this._canvas) return;

    // 拖移：mousedown → mousemove → mouseup
    this._canvas.addEventListener('mousedown', e => {
      this._dragging   = true;
      this._lastMouseX = e.clientX;
      this._lastMouseY = e.clientY;
      this._canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!this._dragging) return;
      this._offsetX += e.clientX - this._lastMouseX;
      this._offsetY += e.clientY - this._lastMouseY;
      this._lastMouseX = e.clientX;
      this._lastMouseY = e.clientY;
      this.render();
    });

    window.addEventListener('mouseup', () => {
      if (!this._dragging) return;
      this._dragging = false;
      this._canvas.style.cursor = 'grab';
    });

    // 觸控拖移（行動裝置）
    this._canvas.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      this._dragging   = true;
      this._lastMouseX = e.touches[0].clientX;
      this._lastMouseY = e.touches[0].clientY;
    }, { passive: true });

    this._canvas.addEventListener('touchmove', e => {
      if (!this._dragging || e.touches.length !== 1) return;
      this._offsetX += e.touches[0].clientX - this._lastMouseX;
      this._offsetY += e.touches[0].clientY - this._lastMouseY;
      this._lastMouseX = e.touches[0].clientX;
      this._lastMouseY = e.touches[0].clientY;
      this.render();
    }, { passive: true });

    this._canvas.addEventListener('touchend', () => {
      this._dragging = false;
    });

    // 滾輪縮放
    this._canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta     = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale  = Math.min(3, Math.max(0.4, this._scale + delta));
      
      // 以滑鼠游標為縮放中心
      const rect  = this._canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this._offsetX = mouseX - (mouseX - this._offsetX) * (newScale / this._scale);
      this._offsetY = mouseY - (mouseY - this._offsetY) * (newScale / this._scale);
      this._scale   = newScale;

      this.render();
    }, { passive: false });

    // 雙擊重置視角
    this._canvas.addEventListener('dblclick', () => {
      this._offsetX = 0;
      this._offsetY = 0;
      this._scale   = 1;
      this.render();
    });

    // 初始滑鼠樣式
    this._canvas.style.cursor = 'grab';
  }
}
