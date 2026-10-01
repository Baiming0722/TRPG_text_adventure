---
description: 功能測試與邏輯驗證
---

# Workflow: /test-system (系統模組測試)

**觸發指令**：`/test-system [模組名稱]`
**目的**：針對指定的系統模組進行深度功能測試與邏輯驗證。

## 支援的模組與對應測試流程

請根據使用者輸入的 `[模組名稱]`，選取並執行對應的測試流程：

### 1. `dice` (判定系統)

- **使用 Skill**：`node-script-runner`
- **執行動作**：執行 `.agent/skills/node-script-runner/scripts/dice-simulator.js --rolls 10000`。
- **目標**：驗證 10000 次擲骰的分佈是否符合預期，且不會有無法被歸類的 `unknown` 判定結果。

### 2. `character` (角色系統)

- **使用 Skill**：`js-code-review`
- **執行動作**：審查 `character/character-system.js`。
- **目標**：確保 `applyPermanentChange` 有防範數值低於 0 (`Math.max(0, ...)` 是否確實套用到所有屬性)；確保速通模式 (`applySpeedrunBonus`) 的上限邏輯正確。

### 3. `combat` (戰鬥系統)

- **使用 Skill**：`js-code-review`
- **執行動作**：審查 `combat/combat-system.js`。
- **目標**：確認傷害計算 `Math.max(1, ...)` 的保底邏輯是否正確，戰敗懲罰 (全屬性 -20%, HP-20, SAN-20) 是否正確呼叫 `applyPermanentChange`。

### 4. `narrative` (敘事引擎/LLM)

- **使用 Skill**：`js-code-review`
- **執行動作**：審查 `narrative/narrative-engine.js`。
- **目標**：確認 LLM 解析 JSON (如 `parseResponse`) 時的容錯機制是否健全；檢查 Fallback 場景 `buildFallbackScene()` 的內容是否具備。

### 5. `save` (存檔系統)

- **使用 Skill**：`browser-runtime-debug`
- **執行動作**：提示使用者開啟遊戲，並引導使用者在 DevTools 執行存取 `localStorage` 的腳本。
- **目標**：確認存檔格式與 `CONFIG.SAVE_VERSION` 的相容性檢測是否生效。

### 6. `map` & `event` (資料驅動系統)

- **使用 Skill**：`json-data-audit`
- **執行動作**：執行 `.agent/skills/node-script-runner/scripts/validate-json.js`。
- **目標**：專注檢查連通性與事件綁定的合法性。

## 報告產出格式

測試完成後，產出如下報告：

```markdown
# 🧪 系統測試報告：[模組名稱]

## 測試目標
[說明本次測試想要驗證的邏輯]

## 執行過程與發現
[列出執行的指令、審查的行數，以及發現的問題]

## 測試結果
- **狀態**：✅ 通過 / ⚠️ 警告 / ❌ 失敗
- **修復建議**：[若有問題，給出修復方向]
```
