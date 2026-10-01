---
description: 健康檢查
---

# Workflow: /validate-all (全面健康檢查)

**觸發指令**：`/validate-all`
**目的**：專案發布前或進行重大重構後的全面健康檢查，找出潛在的 Bug 或結構錯誤。

## 執行流程

當使用者輸入 `/validate-all`，請依序執行以下步驟，並在最後產出總結報告：

### 1. JSON 資料審計 (Card System)

- **使用 Skill**：`json-data-audit` + `node-script-runner`
- **執行動作**：執行 `.agent/skills/node-script-runner/scripts/validate-json.js --project-root .`
- **目標**：確認所有 JSON Card 格式正確且無 Dangling References (無效參照)。

### 2. JS Import 路徑檢查

- **使用 Skill**：`node-script-runner`
- **執行動作**：執行 `.agent/skills/node-script-runner/scripts/check-imports.js --project-root .`
- **目標**：確認沒有斷鏈的檔案引入。

### 3. EventBus 診斷

- **使用 Skill**：`eventbus-diagnosis` + `js-code-review`
- **執行動作**：使用 `grep_search` 檢查原始碼中 `GameEvent` 的定義，與散落各處的 `emit` / `on` 呼叫。
- **目標**：找出是否有明顯拼寫錯誤，或有 emit 但未被 on 的幽靈事件。

### 4. 靜態程式碼審查 (快速掃描)

- **使用 Skill**：`js-code-review`
- **執行動作**：使用 `grep_search` 掃描常見陷阱 (如 `catch \([^\)]*\)\s*\{\s*\}`，即空 catch 區塊)。
- **目標**：揪出會靜默吞掉錯誤的壞味道。

## 報告產出格式

完成所有步驟後，請以 Markdown 產出一份名為「TRPG 專案全面健康報告」的摘要：

```markdown
# 🏥 TRPG 專案全面健康報告

## 1. JSON Card 審計
[輸出狀態：✅ 通過 / ❌ 失敗]
- 說明：...

## 2. JS Import 路徑
[輸出狀態：✅ 通過 / ❌ 失敗]
- 說明：...

## 3. EventBus 狀態
[輸出狀態：⚠️ 警告]
- 說明：...

## 4. 程式碼壞味道掃描
[輸出狀態：✅ 通過]
- 說明：...

## 結論與建議
[總結當前專案健康度，並列出首要修復建議]
```
