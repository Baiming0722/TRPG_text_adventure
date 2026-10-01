---
name: browser-runtime-debug
description: 透過 DevTools Console 檢查與診斷網頁應用的執行時狀態。
---

# Browser Runtime Debug (瀏覽器執行時診斷)

本技能指南說明如何透過 Chrome DevTools MCP (或其他能執行瀏覽器腳本的工具) 來診斷前端狀態。

## 適用情境

- 檢查 `localStorage` 內存放的資料 (如遊戲存檔、狀態快照)。
- 觸發特定的瀏覽器事件進行測試。
- 檢查 UI 的 DOM 狀態。

## 核心技術

### 1. 讀取 LocalStorage

遊戲的 Debug Monitor 將目前狀態寫入 `localStorage` 的 `trpg_debug_state`，存檔則寫入 `trpg_save_slot_*` 或 `trpg_autosave`。

你可以透過 `evaluate_script` 或直接在 Console 執行：

```javascript
// 取得最新的 Debug 狀態快照
const debugStateRaw = localStorage.getItem('trpg_debug_state');
if (debugStateRaw) {
    const debugState = JSON.parse(debugStateRaw);
    console.log(debugState);
} else {
    console.log('找不到 trpg_debug_state');
}
```

### 2. 操作 ES Module 單例 (陷阱與解法)

**陷阱**：在 ES6 Modules (`<script type="module">`) 中宣告的變數 (如 `gameEngine`, `gameState`) 預設不在全域作用域 (`window`) 中。

**解法 1 (推薦)**：如果目標是有同步到 `localStorage` 的狀態，優先讀取 `localStorage`。
**解法 2 (若需呼叫函式)**：請使用者在原始碼中暫時將目標掛載到 `window` 上，例如在模組最後加入 `window.gameEngine = gameEngine;`。

### 3. 注入診斷腳本

你可以寫一段稍微複雜的腳本來搜集資訊並回傳。注意：在使用 MCP `evaluate_script` 時，如果要回傳物件，最好確保物件可被 JSON 序列化，或者直接回傳格式化的字串。

```javascript
// 範例：列出所有存檔的大小與版本
(() => {
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('trpg_save') || key === 'trpg_autosave') {
            const raw = localStorage.getItem(key);
            try {
                const data = JSON.parse(raw);
                result.push({
                    key,
                    size: raw.length,
                    version: data.save_version,
                    character: data.game_state?.character?.name || '未知'
                });
            } catch (e) {
                result.push({ key, error: '解析失敗' });
            }
        }
    }
    return result; // 會回傳給 evaluate_script
})();
```

## 預期輸出格式

當你完成診斷後，請向使用者輸出如下格式的結果：

```markdown
### 執行時狀態診斷結果

- **檢查目標**：[如：存檔完整性 / 當前角色數值]
- **發現**：
  - [列出觀察到的具體數值或錯誤]
- **結論**：[如：資料一致，無發現異常 / 發現版本不相容]
```
