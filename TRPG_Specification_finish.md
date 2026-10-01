# TRPG 文字冒險遊戲 — 需求核對與完成度紀錄

---

## 一、利害關係人 (Stakeholders) 需求滿足狀態

| 角色 | 描述 | 主要需求 | 完成狀態 |
| :--- | :--- | :--- | :--- |
| **一般玩家** | 正常遊戲流程、標準數值 | 流暢體驗、合理劇情 | ✅ **已滿足**：核心引擎 + LLM 敘事 + 完整系統架構 |
| **新手玩家** | 不熟悉 TRPG 規則 | 操作說明、引導選項 | ✅ **已滿足**：`tutorial.js` 6 步驟引導（首次遊玩自動觸發） |
| **速通玩家** | 快速通關、挑戰難度 | 更高數值或更短劇情 | ✅ **已滿足**：`mode-select.js` 速通模式 + `applySpeedrunBonus()` 全屬性 +20% |
| **蒐集探索型玩家** | 觸發所有事件、蒐集結局 | 探索紀錄、頻繁存檔、選項提示 | ✅ **已滿足**：`explore-panel.js` 地點/事件/旗標紀錄 + 自動存檔 |
| **測試者** | 驗證功能與平衡性 | 指定數值、強制觸發事件、測試模式 | ✅ **已滿足**：`test-panel.js`（需密碼 `root`）+ `debug.html` 監控儀表板 |

---

## 二、需求功能 (Module Requirements) 核對清單

### 4.1 前端介面模組 (MOD-UI)

✅ **全面完成（10/10）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| UI-01 | 場景文字描述（Markdown 渲染） | ✅ | `scene-renderer.js`（`marked.js`） |
| UI-02 | 行動選項（3 個，依條件動態啟用/禁用） | ✅ | `action-panel.js`（`requires.stat` 閾值檢查） |
| UI-03 | 角色資訊面板（側欄常駐） | ✅ | `character-panel.js` |
| UI-04 | 骰子判定動畫與結果 | ✅ | `dice-animation.js` + `formatCheckResult()` |
| UI-05 | 存檔/讀檔按鈕（隨時操作） | ✅ | `save-drawer.js` 右上角抽屜 |
| UI-06 | 遊戲紀錄 Log 區域 | ✅ | `game-log.js` 可捲動 |
| UI-07 | 玩家模式選擇 | ✅ | `mode-select.js`（一般/速通/蒐集/測試） |
| UI-08 | 新手引導提示 | ✅ | `tutorial.js` 6 步驟（首次遊玩旗標觸發） |
| UI-09 | 探索紀錄面板 | ✅ | `explore-panel.js`（地點進度、事件歷史、旗標） |
| UI-10 | 測試模式面板 | ✅ | `test-panel.js`（強制骰值、HP/SAN 調整、設旗標） |

### 4.2 敘事引擎模組 (MOD-NARR)

✅ **全面完成（7/7）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| NARR-01 | 依據 GameState 組建 System Prompt | ✅ | `narrative-engine.js` `buildSystemPrompt()` |
| NARR-02 | JSON 結構化輸出（scene_description / actions / flags） | ✅ | `OUTPUT_SCHEMA` 強制 JSON |
| NARR-03 | 初始提示含地圖卡、劇情卡、角色卡、模式 | ✅ | `buildSystemPrompt()` 含完整卡片 |
| NARR-04 | 最近 N 筆對話歷史（預設 30） | ✅ | `trimHistory(history, 30)` |
| NARR-05 | LLM 失敗 fallback 處理 | ✅ | 3 層解析策略 + `buildFallbackScene()` |
| NARR-06 | 選項條件欄位（`condition`）動態顯示/隱藏 | ✅ | `action-panel._checkRequires()` |
| NARR-07 | 可替換 LLM 後端 | ✅ | `llm-provider.js` 4 Provider（DeepSeek/NVIDIA/Ollama/OpenRouter） |

### 4.3 角色系統模組 (MOD-CHAR)

✅ **全面完成（8/8）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| CHAR-01 | 八大屬性（STR/DEX/INT/POW/MOV/HP/SAN/LUCK） | ✅ | `config.js` + 角色卡 JSON |
| CHAR-02 | 職業系統（Class），決定技能與加成 | ✅ | 10 職業 + `CLASS_BONUS_MAP` |
| CHAR-03 | 技能列表（Skills），判定時固定加值 | ✅ | `character.skills[]` + `getSkillBonus()` |
| CHAR-04 | HP（生命值）、SAN（理智值） | ✅ | `derived_stats` 含 HP/SAN |
| CHAR-05 | 臨時變動 buff/debuff | ✅ | `applyBuff()` / `removeBuff()` |
| CHAR-06 | 永久變動（劇情結果） | ✅ | `applyPermanentChange()` |
| CHAR-07 | 狀態效果系統（中毒/疲勞/受傷等） | ✅ | `addStatusEffect()` / `removeStatusEffect()` / `getStatusModifier()` |
| CHAR-08 | 完成結局後匯出為新角色卡 | ✅ | `exportAsNewCard()` — 清除臨時修正與狀態效果，保留永久數值 |

### 4.4 判定系統模組 (MOD-DICE)

✅ **全面完成（4/4）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| DICE-01 | 行動值公式計算 | ✅ | `prepareCheck()`：Roll(2d6)+職業+技能+狀態+幸運 |
| DICE-02 | 判定過程透明化（Log 顯示各加值來源） | ✅ | `formatCheckResult()` 完整明細 |
| DICE-03 | 強制指定骰子結果（測試模式） | ✅ | `setForcedDiceValue()` |
| **DICE-04** | 支援多種骰子類型（d4/d6/d8/d10/d20/d100） | ✅ | `config.js` 定義閾值表 + 動態套用 |

### 4.5 戰鬥系統模組 (MOD-COMBAT)

✅ **全面完成（3/3）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| COMBAT-01 | 回合制戰鬥邏輯（玩家行動 → 敵人行動） | ✅ | `executeCombatRound()` 自動結算 |
| COMBAT-02 | 敵人設定（HP、STR） | ✅ | `startCombat(enemy)` 參數化 |
| COMBAT-03 | 戰鬥過程由 LLM 生成敘事文字（建議） | ✅ | 戰鬥 context 餵入 LLM 敘事引擎；引擎自動結算回合後接 LLM 生成 |

### 4.6 劇情／事件系統模組 (MOD-EVENT)

⚠️ **部分未完成（5/6，1 項建議未實作）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| EVENT-01 | 依玩家行動與判定結果切換劇情節點 | ✅ | `_handleActionSelected()` → `moveToNode()` |
| EVENT-02 | 四種結局（成功/失敗/普通/開放式） | ✅ | `checkEnding()` 依 `exit_conditions` 判斷 |
| EVENT-03 | 特殊事件依條件自動觸發 | ✅ | `checkAndTriggerEvents()` 掃描條件 |
| EVENT-04 | 分支條件（屬性閾值、旗標、已觸發事件） | ✅ | `checkCondition()` 支援多條件 |
| EVENT-05 | 事件執行後更新角色數值、旗標、地圖狀態 | ✅ | `executeEventEffects()` 5 種效果類型 |
| **EVENT-06** | 事件觸發順序可配置（立即/延遲/條件型） | ❌ **未完成** | 僅順序掃描 `eventIds`，無延遲/排程機制 |

> 註：EVENT-06 規格標示為**建議**。

### 4.7 地圖系統模組 (MOD-MAP)

✅ **全面完成（7/7）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| MAP-01 | 節點（Node）與路徑（Edge）有向圖 | ✅ | `nodes[].connections` 陣列 |
| MAP-02 | 節點欄位：ID/名稱/描述/事件/連接 | ✅ | JSON 結構完整 |
| MAP-03 | 節點進入條件（物品/事件完成） | ✅ | `entry_condition` + `checkCondition()` |
| MAP-04 | 移動至新節點觸發場景更新 | ✅ | `moveToNode()` → `MAP_NODE_CHANGED` → LLM |
| MAP-05 | 側邊欄顯示 | ✅ | `map-view.js` Canvas 地圖 |
| MAP-06 | 節點標記：已探索/未探索/鎖定 | ✅ | `getMapSummary()` 回傳完整狀態 |
| MAP-07 | 地圖視覺化（節點連線圖） | ✅ | `map-view.js` Canvas 繪圖 + 拖曳平移 + 滾輪縮放 + 雙擊重置 + 圖例 |

### 4.8 存檔／讀檔模組 (MOD-SAVE)

✅ **全面完成（7/7）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| SAVE-01 | 手動存檔至 LocalStorage | ✅ | `saveGame(slot)` |
| SAVE-02 | 讀取存檔還原狀態 | ✅ | `loadGame()` + `restoreFromSave()` |
| SAVE-03 | 自動存檔（每次行動後） | ✅ | `autoSave()` 在 `game-engine.js` |
| SAVE-04 | 存檔含完整狀態 | ✅ | `buildSaveData()`（角色/劇情/地圖/旗標/對話/主題） |
| SAVE-05 | 3 個存檔槽 | ✅ | `CONFIG.SAVE.MAX_SLOTS = 3` |
| SAVE-06 | 版本控制 | ✅ | `save_version` 檢查，不相容時提示 |
| SAVE-07 | JSON 匯出/匯入 | ✅ | `exportSave()` / `importSave()` + 下載按鈕 |

### 4.9 Debug Monitor (MOD-DEBUG-MONITOR)

✅ **全面完成（10/10）**

| 需求 ID | 需求描述 | 狀態 | 實作位置 |
|:---|:---|---:|:---|
| MON-01 | 獨立 HTML 頁面 | ✅ | `debug.html` |
| MON-02 | 地圖進度顯示 | ✅ | `renderMap()` |
| MON-03 | 劇情進度顯示 | ✅ | `renderStory()` |
| MON-04 | 角色數值顯示 | ✅ | `renderCharacter()` |
| MON-05 | LLM Prompt 結構顯示 | ✅ | `renderPrompt()` |
| MON-06 | 骰子判定記錄顯示 | ✅ | `renderDice()` |
| MON-07 | 更新頻率 ≥ 1000ms | ✅ | `POLL_INTERVAL = 1000` |
| MON-08 | 暫停更新 / 匯出 JSON 按鈕 | ✅ | `btn-pause` / `btn-export` |
| MON-09 | 最近事件觸發記錄 | ✅ | `renderEvents()` |
| MON-10 | 分頁（Tab）組織 | ✅ | 6 個 Tab 切換 |

---

## 三、事件清單 (Event List) 核對

| 編號 | 事件類型 | 事件名稱 | 觸發條件 | 狀態 |
|:---|:---|:---|:---|:---:|
| EVT-01 | 外部 | 進入遊戲 | 玩家開啟頁面 | ✅ |
| EVT-02 | 外部 | 開始新遊戲 | 點擊「新遊戲」 | ✅ |
| EVT-03 | 外部 | 新手引導 | 首次遊玩 flag | ✅ |
| EVT-04 | 外部 | 場景顯示 | 進入地圖節點 | ✅ |
| EVT-05 | 外部 | 選擇行動 | 點擊行動選項 | ✅ |
| EVT-06 | 外部 | 行動判定 | 需要骰子的行動 | ✅ |
| EVT-07 | 外部 | 戰鬥觸發 | 進入戰鬥事件 | ✅ |
| EVT-08 | 狀態 | 角色狀態更新 | 事件結果回傳 | ✅ |
| EVT-09 | 外部 | 查看角色資料 | 點擊角色面板 | ✅ |
| EVT-10 | 外部 | 手動存檔 | 點擊存檔按鈕 | ✅ |
| EVT-11 | 外部 | 讀取存檔 | 點擊讀檔按鈕 | ✅ |
| EVT-12 | 暫時 | 自動存檔 | 場景切換後 | ✅ |
| EVT-13 | 狀態 | 特殊事件觸發 | 條件達成 | ✅ |
| EVT-14 | 狀態 | 劇情分支判斷 | 事件結果評估 | ✅ |
| EVT-15 | 狀態 | 結局判定 | 結局條件達成 | ✅ |
| EVT-16 | 外部 | 探索紀錄查詢 | 點擊探索紀錄 | ✅ |
| EVT-17 | 外部 | 速通模式切換 | 玩家設定 | ✅ |
| EVT-18 | 外部 | 測試模式設定 | 隱藏入口觸發 | ✅ |
| EVT-19 | 外部 | 劇情資料維護 | 設計者操作（JSON Card + Server API） | ✅ |
| EVT-20 | 外部 | 人物資料維護 | 設計者操作（JSON Card + Server API） | ✅ |
| EVT-21 | 外部 | 數值規則維護 | 設計者操作（`config.js`） | ✅ |
| **EVT-22** | 狀態 | 系統狀態異常檢查 | 內部偵測 | ✅ **已滿足**：實作 `system-check.js` 統一健康檢查模組，實時監控數值與節點狀態 |

---

## 四、總結

| 類別 | 總需求數 | 已完成 | 未完成 | 完成率 |
|:---|---:|---:|---:|---:|
| 利害關係人 | 5 | 5 | 0 | **100%** |
| 前端介面 (MOD-UI) | 10 | 10 | 0 | **100%** |
| 敘事引擎 (MOD-NARR) | 7 | 7 | 0 | **100%** |
| 角色系統 (MOD-CHAR) | 8 | 8 | 0 | **100%** |
| 判定系統 (MOD-DICE) | 4 | 4 | 0 | **100%** |
| 戰鬥系統 (MOD-COMBAT) | 3 | 3 | 0 | **100%** |
| 劇情/事件 (MOD-EVENT) | 6 | 5 | 1（建議） | **83%** |
| 地圖系統 (MOD-MAP) | 7 | 7 | 0 | **100%** |
| 存檔系統 (MOD-SAVE) | 7 | 7 | 0 | **100%** |
| Debug Monitor (MOD-DEBUG-MONITOR) | 10 | 10 | 0 | **100%** |
| 事件清單 (EVT) | 22 | 22 | 0 | **100%** |
| **總計** | **89** | **88** | **1** | **98.8%** |

### 未完成項目（共 1 項，為建議等級）

1. **EVENT-06**（建議）：事件觸發順序可配置（延遲/條件型排程），目前僅順序掃描
