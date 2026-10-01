---
description: 驗證新資料卡的正確性
---

# Workflow: /content-verify (內容驗證)

**觸發指令**：`/content-verify`
**目的**：當開發者新增或修改了 `cards/` 目錄下的劇情、地圖、事件或人物卡後，驗證新資料的正確性。

## 執行流程

當使用者輸入 `/content-verify` 後，請依序執行以下 3 個步驟：

### 1. 結構與 Schema 驗證

- **使用 Skill**：`json-data-audit` + `node-script-runner`
- **執行動作**：執行 `.agent/skills/node-script-runner/scripts/validate-json.js --project-root .`
- **目標**：確保所有新增或修改的 JSON 檔案沒有語法錯誤 (Syntax Error)，且必填欄位 (如 `id`, `title`, `name`) 都有被填寫。

### 2. 關聯性與孤島驗證

- **使用 Skill**：`json-data-audit`
- **執行動作**：透過前一步驟的驗證腳本輸出，重點關注是否有 Dangling References (參照了不存在的 ID)。
- **檢查重點**：
  - 新劇情是否指向了有效的起始地圖。
  - 新地圖的節點連線是否合理，有沒有無法到達的孤立節點。
  - 新事件中 `effects` 定義的 Flag Key 是否與舊有事件產生衝突。

### 3. 可執行性評估

- **使用 Skill**：`js-code-review`
- **執行動作**：若新增內容牽涉到 `conditions` (例如屬性檢定、旗標判斷)，人工審查該條件字串是否能被 `event-system.js` 或 `map-system.js` 正確解析。
- **目標**：防止條件判定寫錯導致事件永遠無法觸發。

## 報告產出格式

完成後產出以下摘要：

```markdown
# 📦 內容驗證報告

- **驗證項目**：JSON Schema、參照一致性、邏輯可執行性
- **驗證結果**：[✅ 通過 / ❌ 失敗]

## 發現的問題
- [若有錯誤，條列問題點與所在的檔案路徑]

## 修正建議
- [提供具體的 JSON 修正建議，例如補上缺少的 connections]
```
