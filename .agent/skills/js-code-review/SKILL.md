---
name: js-code-review
description: JavaScript 模組程式碼審查方法論。
---

# JavaScript Code Review (JS 程式碼審查)

本技能說明如何有系統地審查 JavaScript 原始碼，找出潛在的 Bug 或不穩定的邏輯。

## 審查面向

### 1. 錯誤處理 (Error Handling)

- **吞噬錯誤**：尋找 `catch (e) {}` 且內部無任何處理或僅有 `console.log`，這會讓除錯變得困難。
- **未處理的 Promise**：確保呼叫 `async` 函式時有加上 `await`，或有 `.catch()`。
- **Throw 類型**：確保 throw 出去的是 `Error` 物件而非字串 (`throw new Error('msg')` vs `throw 'msg'`)。

### 2. 狀態突變 (State Mutation)

- 遊戲狀態 (`GameState`) 應該透過 `.update()` 來變更，而不是直接修改參考 (如 `gameState.getState().flags.x = 1`)。
- 陣列與物件是否做了必要的 Defensive Copy？

### 3. 邊界條件防護 (Guard Clauses)

- 物件深度存取是否使用了 Optional Chaining (`?.`) 或預設值 (`??`)，如 `card.nodes?.find(n => n.id)`。
- 除法運算是否有防範除以零 (如戰鬥傷害計算 `STR / 30`)。

### 4. 模組相依性 (Dependencies)

- 檢查是否有循環依賴 (Circular dependencies)，這在系統間互相呼叫時很常見 (如 `EventSystem` 呼叫 `MapSystem`，而 `MapSystem` 又呼叫 `EventSystem`)。

## 檢查工具與技巧

- 使用 `grep_search` 尋找可疑片段：
  - `grep_search` 查詢 `catch\s*\([^)]*\)\s*\{\s*\}` (空的 catch 區塊)。
  - `grep_search` 查詢 `TODO|FIXME`。
- 如果專案有 Narsil MCP，可以使用 `check_type_errors` 或是 `find_dead_code` 進行靜態分析。

## 審查報告格式

```markdown
### 程式碼審查報告：[模組名稱]

- **發現問題**：
  - ⚠️ `[檔案名稱]:[行數]`：這裡的 `find` 可能回傳 `undefined`，下方的屬性存取未加防護 (`?.`)。
  - ❌ `[檔案名稱]:[行數]`：呼叫 `loadEvent` 但沒有 `await`，導致非同步順序錯誤。
- **修正建議**：
  - 將 `if (node)` 改為 `if (node?.accessible)`。
```
