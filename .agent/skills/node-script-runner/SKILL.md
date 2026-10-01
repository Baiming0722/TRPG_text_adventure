---
name: node-script-runner
description: 撰寫與執行 Node.js CLI 腳本以驗證資料或模擬邏輯。
---

# Node Script Runner (Node.js 腳本執行器)

本技能指南說明如何撰寫並執行 Node.js 腳本來對專案進行自動化分析、資料驗證或邏輯模擬。

## 適用情境

- 批次檢查大量 JSON 檔案結構。
- 對 JS 原始碼進行靜態掃描 (如 `import` 路徑檢查)。
- 執行不需要瀏覽器 DOM 環境的純邏輯模擬 (如戰鬥勝率計算、骰子機率分佈)。

## 執行規範

1. **環境**：使用你環境內建的 Node.js，透過 `run_command` 工具執行。
2. **路徑**：盡量使用 `--project-root` 參數或環境變數來讓腳本知道專案的絕對或相對路徑，避免 hardcode。
3. **退出碼 (Exit Codes)**：
   - `0`：驗證通過，無錯誤。
   - `1`：驗證失敗，有警告或錯誤。
4. **輸出格式**：腳本在 terminal 上的輸出應清晰易讀，建議使用 `[PASS]`, `[WARN]`, `[FAIL]` 標籤。

## 隨附腳本工具

在 `.agent/skills/node-script-runner/scripts/` 下有一些現成的工具：

### 1. `validate-json.js` (通用 JSON 結構驗證器)

用於驗證 JSON 是否符合特定的 Schema，或者檢查必填欄位。

*執行範例*：

```bash
node .agent/skills/node-script-runner/scripts/validate-json.js --dir cards/characters
```

### 2. `check-imports.js` (JS 匯入路徑檢查)

掃描專案內所有 `.js` 檔，解析 `import ... from '...'` 的路徑，確認對應的檔案是否存在。

*執行範例*：

```bash
node .agent/skills/node-script-runner/scripts/check-imports.js --dir js/
```

### 3. `dice-simulator.js` (機率模擬器)

載入遊戲的骰子公式，進行 N 次模擬擲骰，觀察結果分佈，用來確保機率或加成未被破壞。

*執行範例*：

```bash
node .agent/skills/node-script-runner/scripts/dice-simulator.js --rolls 10000 --class "工人" --tags "combat"
```

## 如何為新任務撰寫腳本

如果你需要針對特定任務寫新的腳本（例如驗證地圖連通性）：

1. 將腳本寫在 `.agent/skills/node-script-runner/scripts/` 中。
2. 開頭使用 `#!/usr/bin/env node`。
3. 使用 Node.js 內建的 `fs` 和 `path` 模組來讀取專案檔案。
4. **請勿** 引入外部 npm 套件 (避免 `npm install` 的麻煩)，僅使用原生 Node.js 功能。
5. 捕捉例外狀況並輸出友善的錯誤訊息，最後以 `process.exit(1)` 離開。
