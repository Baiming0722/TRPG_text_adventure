---
name: eventbus-diagnosis
description: Pub/Sub 事件匯流排健康度診斷。
---

# EventBus Diagnosis (事件匯流排診斷)

本技能說明如何診斷專案中大量使用的 EventBus (發布/訂閱模式)，確保事件流動順暢且無記憶體洩漏。

## 常見問題

1. **孤兒事件 (Orphan Events)**：某個元件觸發 (`emit`) 了一個事件，但沒有任何其他元件在監聽 (`on`) 它。
2. **幽靈訂閱 (Ghost Subscriptions)**：元件監聽了一個事件，但該事件在系統中從未被觸發過 (可能是拼字錯誤或功能已被移除)。
3. **監聽器洩漏 (Listener Leaks)**：UI 元件重新渲染時重複綁定監聽器，且未呼叫 `off()` 取消訂閱，導致同一事件觸發多次。
4. **常數不一致**：使用字串字面量 (`'game:start'`) 而不是 `GameEvent.GAME_START`，導致拼寫錯誤難以追蹤。

## 診斷策略

### 1. 靜態分析 (grep_search)

透過搜尋原始碼，比對發布與訂閱的數量：

- 搜尋 `eventBus.emit(`，整理出所有被觸發的事件常數。
- 搜尋 `eventBus.on(`，整理出所有被監聽的事件常數。
- 檢查 `GameEvent` 字典 (在 `event-bus.js`)，確認是否有定義但未被使用的事件。

### 2. 動態追蹤 (Runtime Console)

在瀏覽器 DevTools Console 中，你可以注入一段追蹤腳本，攔截 EventBus 的 `emit` 方法，以觀察事件觸發順序與頻率。

**攔截腳本範例**：

```javascript
// 在 DevTools 執行，開啟事件追蹤
const originalEmit = window.eventBus.emit;
window.eventBus.emit = function(eventName, data) {
    console.log(`[EventBus Trace] ${eventName}`, data);
    return originalEmit.apply(this, arguments);
};

// 檢查監聽器數量
console.log('註冊的事件數:', window.eventBus._listeners.size);
for (const [evt, set] of window.eventBus._listeners.entries()) {
    console.log(`- ${evt}: ${set.size} listeners`);
    if (set.size > 5) {
        console.warn(`  ⚠️ 潛在洩漏：${evt} 有過多監聽器！`);
    }
}
```

*(注意：需要確保 `eventBus` 有被掛載到 `window` 上，請參考 `browser-runtime-debug.md`)*

## 報告格式

```markdown
### EventBus 診斷結果

- **已定義事件**：25 個
- **活躍事件**：20 個 (有 emit 也有 on)
- **孤兒事件**：`GameEvent.SOME_EVENT` (僅 emit 無人監聽)
- **幽靈事件**：`GameEvent.OLD_EVENT` (有 on 但無 emit)
- **監聽器檢查**：發現 `ACTION_SELECTED` 事件綁定了 12 個監聽器，疑似 UI 元件重新渲染時發生 Listener Leak。
```
