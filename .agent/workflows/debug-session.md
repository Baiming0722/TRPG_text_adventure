---
description: 系統性除錯
---

# Workflow: /debug-session (系統性除錯)

**觸發指令**：`/debug-session [問題描述]`
**目的**：當使用者遇到具體的 Bug 或非預期行為時，以有系統的方式逐步縮小範圍並找出根因。

## 執行流程

當使用者輸入 `/debug-session` 後，請遵循以下 4 階段流程進行除錯：

### 階段 1：問題分析 (Problem Analysis)

1. 根據使用者的 `[問題描述]`，列出所有**可能牽涉到的系統模組**。
   - *範例：如果問題是「戰鬥打贏了卡住沒反應」，可能的模組包含 `combat-system`, `event-system`, `narrative-engine`。*
2. 提出 2~3 個初步假說 (Hypothesis)。

### 階段 2：狀態擷取 (State Extraction)

- **使用 Skill**：`browser-runtime-debug`
- 若問題可重現，請使用者提供重現步驟，或提供一段能在 DevTools 執行的 JS 腳本給使用者，讓使用者貼上 Console 並回報結果。
- 觀察 `trpg_debug_state` 內部的 `flags` 或 `currentNodeId` 是否如預期變化。

### 3. 程式碼追蹤 (Code Tracing)

- **使用 Skill**：`js-code-review`
- 使用 `grep_search` 或 `view_file` 追蹤相關邏輯的原始碼。
- 從事件的起點 (`emit` 或按鈕點擊) 一路追查到終點。
- 檢查變數存取是否漏了 Optional Chaining (`?.`)，或非同步 (`async`/`await`) 的順序是否出錯。

### 4. 驗證與修復 (Verification & Fix)

1. 排除錯誤的假說，確認真正的原因。
2. 提出修改建議 (通常是一小段 diff 或是請使用者取代某些行數)。
3. 給出修復後的迴歸測試建議 (Regression Test)。

## 對話互動範本

請保持對話的階段性，不要一次丟出所有指令，例如：

> 「收到，我們啟動 Debug Session。根據『選項不會出現』的描述，我懷疑是 Narrative Engine 解析 JSON 失敗觸發了 Fallback，或者是 Event 條件不滿足。
>
> 第一步，請你在遊戲運行時，按下 F12 開啟 Console，輸入 `localStorage.getItem('trpg_debug_state')` 並將最後的 `lastPrompt` 或報錯貼給我看。」
