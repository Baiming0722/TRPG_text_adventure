---
name: json-data-audit
description: JSON 資料結構驗證與交叉引用檢查。
---

# JSON Data Audit (JSON 資料審計)

本技能說明如何驗證專案中大量依賴的 JSON 設定檔 (Card 系統)，確保資料結構一致且關聯正確。

## 審計範圍

專案的 `cards/` 目錄包含：

- `characters/`：人物卡
- `maps/`：地圖卡
- `scenarios/`：劇情卡
- `events/`：事件卡

## 核心驗證項目

### 1. 基本 Schema 檢查

- **必填欄位**：每個 JSON 是否都具備 `id`、`name` (或 `title`)。
- **類型正確**：數值是否為 Number，陣列是否為 Array。
- **ID 一致性**：檔案名稱 (`xxx.json`) 是否與內容中的 `id` 欄位一致。

### 2. 交叉引用 (Cross-reference) 完整性

這是最容易出錯的地方，需要確保所有「指標」都指向存在的實體：

- **ScenarioCard -> MapCard**: `scenario.available_map` 的 ID 必須在 `maps/` 中找得到。
- **ScenarioCard -> EventCard**: `scenario.key_events` 陣列中的所有 ID 必須在 `events/` 中找得到。
- **MapCard -> EventCard**: 地圖節點 (`node.events`) 中的 ID 必須在 `events/` 中找得到。
- **MapCard 內部連通性**: 節點 `connections` 陣列中的 ID，必須是同一個地圖卡中定義的其他節點 ID。

### 3. 邏輯合法性

- 屬性數值範圍：如 `STR`, `DEX`, `HP` 應該在 0 ~ 200 之間。
- 條件限制：`entry_condition` 或 `exit_conditions` 內的屬性是否拼字正確 (例如寫成 `STT` 而不是 `STR`)。

## 執行方式

這項技能通常與 `node-script-runner` 搭配使用。

1. 你可以寫一個 Node.js 腳本將所有 JSON 載入記憶體。
2. 建立 ID 的 Set (如 `allEventIds = new Set(events.map(e => e.id))`)。
3. 迭代其他卡片，檢查參照的 ID 是否存在於 Set 中。
4. 輸出未解析的參照 (Dangling references) 作為錯誤。

## 檢查報告格式

```markdown
### Card 資料審計報告

- **掃描檔案數**：45 個
- **發現錯誤**：
  - ❌ `scenarios/scenario_001.json`: `key_events` 包含 `event_999`，但該事件卡不存在。
  - ❌ `maps/map_001.json`: `node_003` 的 `connections` 指向 `node_005`，但該節點未定義。
- **發現警告**：
  - ⚠️ `characters/char_001.json`: `HP` 值設定為 999 (超出建議上限 200)。
```
