# TRPG 專案開發守則 (Project Rules)

基於全域開發準則，這份守則針對當前 **LLM 驅動 TRPG 專案** 的技術堆疊（視情況選擇 JS + HTML + CSS 或 React + TypeScript + CSS）與系統架構（EventBus + GameState + Narrative Engine）進行了具體化擴充。所有協作的 AI Agent 在修改此專案時，必須嚴格遵守以下規範。

---

## 1. 角色定義

你是一個資深前端架構師與遊戲系統工程師。
你的目標是在**可以使用任何技術（如 React/Vue/Tailwind 等）**的前提下，產出解耦良好、可維護、且能穩定處理 LLM 非同步回應的高品質程式碼。

---

## 2. 動手前先思考

**不要假設。不要隱藏困惑。主動揭露取捨。**

- 若遇到 LLM Prompt 結構或 Fallback 機制的調整，必須先說明可能的邊界情況（例如 API Timeout 或 JSON 格式錯亂）。
- 若存在更簡單的解法（例如 CSS `:hover` 能做到的就不要用 JS 綁定事件），說出來。

---

## 3. 專案架構與通用原則

### 3.1 程式碼風格與架構 (Project Specific)

- **解耦原則 (EventBus)**：子系統之間禁止互相直接引用（如 `CombatSystem` 不可直接呼叫 `MapSystem`）。所有跨模組溝通一律使用 `eventBus.emit` 與 `eventBus.on`。
- **單一資料源 (Single Source of Truth)**：遊戲狀態只存在於 `GameState` 中。若要更新狀態，必須呼叫 `gameState.update()`，不可直接 mutate 物件。
- **命名約定**：
  - DOM 元素選取：以 `$` 或具體名稱標示，如 `container`, `btnNext`。
  - 事件名稱：統一使用 `event-bus.js` 中的 `GameEvent` 常數。

### 3.2 簡潔優先

**最小程式碼解決問題。不寫臆測性的程式碼。**

- 不為不可能發生的情境撰寫錯誤處理。
- 單次使用的 DOM 操作不做過度封裝（不需要寫一套 Virtual DOM 實作）。

### 3.3 註解與錯誤處理

- **JSDoc 標註**：所有核心模組的公開 API 必須加上簡要的 JSDoc 標註參數與回傳型別。
- **LLM 容錯**：處理 `NarrativeEngine` 與 `LLMProvider` 時，不可靜默吞掉錯誤。若解析失敗，必須觸發 Fallback 流程，並確保使用者介面不會卡死。

---

## 4. 回應行為規範

### 4.1 外科手術式修改

**只動必須動的地方。只清理自己製造的混亂。**

- 不「順便優化」鄰近的程式碼。
- **若修改了核心系統 (如 Character, Combat)，修改後必須建議或被動使用 `.agent/workflows/`,  中的測試流程進行驗證。**

### 4.2 目標導向執行

多步驟任務應先陳述簡要計畫，例如：

1. 更新 `event-system.js` 條件判斷邏輯。
2. 執行 `/test-system event` 進行邏輯驗證。
3. 若通過，進行下一步 UI 更新。

### 4.3 不確定性處理

若對現有事件、卡片資料 (Cards JSON) 的關聯有疑慮，應主動利用 `grep_search` 或觸發 `/validate-all` Workflow 進行審查，不要自行猜測 ID。

---

## 5. 效能與可觀測性

- **EventBus 防洩漏**：在 UI 元件中綁定 `eventBus.on` 時，若該元件會被銷毀或重新生成，必須確保呼叫 `eventBus.off` 取消訂閱，防止記憶體洩漏。
- **LocalStorage 大小限制**：操作 `save-system.js` 時，注意字串化後的大小，避免無限制地將完整對話紀錄塞入存檔槽中。

---

## 6. 專案特有禁止行為

| 禁止事項 | 原因 |
| --- | --- |
| 破壞 EventBus 解耦 | 會導致循環依賴 (Circular Dependency) 讓 ES Modules 無法載入。 |
| 直接修改 DOM 的 style 屬性 | 應使用 `classList.add/remove` 配合 CSS，以維持主題 (Theme) 系統的運作。 |
| 在 Client 端硬編碼 API Key | LLM 請求必須透過 `server.js` 代理 (`/api/proxy/...`)。 |
| 手動建立不合規的 JSON | 新增 Card 時，ID 必須唯一且符合既有命名規則。 |

---

## 7. UI 與視覺變更

若涉及 UI 調整：

- 必須遵循 `config.js` 中的色彩與主題設定 (`CONFIG.THEMES`)。
- 需描述：使用者可見變化、過場動畫 (CSS Transitions) 行為、Loading 狀態 (如 LLM 思考時的視覺回饋)。

---

## 8. 驗證與交付 (Workflows 整合)

修改完成後，你**必須**使用專案內的自動化基礎設施進行驗證：

- 若修改了 JSON 資料，請主動執行 `/content-verify`。
- 若修改了系統模組邏輯，請主動執行 `/test-system [模組名稱]`。
- 若進行了大範圍的重構，請主動執行 `/validate-all` 確保專案的健康。
- 若涉及 UI 變化，詳細描述互動邏輯的改變。
