# TRPG 文字冒險遊戲 — 規格與功能需求文件

---

## 目錄

1. [專案概述](#一專案概述)
2. [利害關係人](#二利害關係人)
3. [系統架構總覽](#三系統架構總覽)
4. [功能模組需求](#四功能模組需求)
   - 4.1 前端介面模組
   - 4.2 敘事引擎模組（LLM 驅動）
   - 4.3 角色系統模組
   - 4.4 判定系統模組
   - 4.5 戰鬥系統模組
   - 4.6 劇情／事件系統模組
   - 4.7 地圖系統模組
   - 4.8 存檔／讀檔模組
5. [資料結構定義](#五資料結構定義)
   - 5.1 世界卡（WorldCard）
   - 5.2 劇情卡（ScenarioCard）
   - 5.3 地圖卡（MapCard）
   - 5.4 人物卡（CharacterCard）
   - 5.5 事件卡（EventCard）
   - 5.6 存檔格式（SaveData）
6. [LLM 整合規格](#六llm-整合規格)
7. [事件清單](#七事件清單)
8. [非功能性需求](#八非功能性需求)
9. [擴充性設計指引](#九擴充性設計指引)
10. [工作分配與 Coding Agent](#十工作分配與-coding-agent)
11. [詞彙表](#十一詞彙表)

---

## 一、專案概述

### 1.1 背景

本專案為一款以**文字冒險為核心**的 TRPG（桌上角色扮演遊戲）網頁遊戲，以劇情推進、冒險探索為主要遊戲類型。玩家在瀏覽器中體驗完整的 TRPG 流程，包含場景描述、選項選擇、戰鬥、骰子判定與劇情推進，所有敘事輸出由 **LLM（大型語言模型）** 即時生成。

### 1.2 核心目標

- 可使用 `.html`, `.css`, `.js` 建構。
- 以 LLM 驅動場景描述、選項生成與劇情敘事，取代靜態文字腳本。
- 提供清晰、可維護的資料卡（Card）格式，作為 LLM 的 context 輸入。
- 支援存檔／讀檔，確保玩家進度可持久化。
- 架構具備擴充性，可在不大幅改動核心程式碼的前提下新增劇情、角色與規則。

### 1.3 範圍

| 項目 | 包含功能 |
| :--- | :--- |
| 執行環境 | 純瀏覽器（HTML/CSS/JS）：UI 優化 |
| 角色卡 | 多個角色卡：一次只用一張 |
| 地圖卡 | 多個地圖卡：一次只用一張 |
| 劇情卡 | 多個劇情卡：依照地圖卡使用 |
| LLM 整合 | 多輪 API 呼叫：可替換更多 LLM 來源 |
| 存檔 | LocalStorage 或其他方式：可查看的存檔抽屜 |
| 語言 | 繁體中文 |

---

## 二、利害關係人

### 2.1 多種使用者角色

| 角色 | 描述 | 主要需求 |
| :--- | :--- | :--- |
| 一般玩家 | 正常遊戲流程、標準數值 | 流暢體驗、合理劇情 |
| 新手玩家 | 不熟悉 TRPG 規則 | 操作說明、引導選項 |
| 速通玩家 | 快速通關、挑戰難度 | 更高數值或更短的劇情流程 |
| 蒐集探索型玩家 | 觸發所有事件、蒐集結局 | 探索紀錄、頻繁存檔、選項提示 |
| 測試者 | 驗證功能與平衡性 | 指定數值、強制觸發事件、測試模式 |

---

## 三、系統架構總覽

```
┌─────────────────────────────────────────────────────┐
│              瀏覽器前端（HTML/CSS/JS）               │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐                │
│  │  UI 介面層    │   │  遊戲狀態層   │                │
│  │  (場景顯示、  │◄──┤  (GameState) │                │
│  │   選項按鈕)   │   │              │                │
│  └──────┬───────┘   └──────┬───────┘                │
│         │                  │                        │
│  ┌──────▼──────────────────▼──────────────────┐     │
│  │              核心引擎（GameEngine）         │     │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │     │
│  │  │ 敘事引擎  │ │  判定系統 │ │  事件系統  │  │     │
│  │  │ (LLM)    │ │ (Dice)   │ │ (EventBus) │  │     │
│  │  └──────────┘ └──────────┘ └────────────┘  │     │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │     │
│  │  │ 角色系統  │ │ 地圖系統  │ │  存檔系統  │  │     │
│  │  │(Character)││  (Map)   │ │  (Save)    │  │     │
│  │  └──────────┘ └──────────┘ └────────────┘  │     │
│  └────────────────────────────────────────────┘     │
│                          │                          │
│  ┌───────────────────────▼──────────────────────┐   │
│  │              資料層（Card System）            │   │
│  │  WorldCard │ ScenarioCard │ MapCard │ ...    │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────┘
                           │ API 呼叫 
                ┌──────────▼──────────┐
                │         API         │
                │     （ LLM 模型 ）   │
                └─────────────────────┘
```

---

## 四、功能模組需求

### 4.1 前端介面模組

**模組 ID**：`MOD-UI`

#### 需求清單

| 需求 ID | 需求描述 | 優先級 | 備註 |
|:---|:---|:---|:---|
| UI-01 | 遊戲主畫面顯示當前場景文字描述（由 LLM 生成） | 必須 | 支援 Markdown 渲染 |
| UI-02 | 顯示可選行動選項（3 個選項） | 必須 | 內容由 LLM 輸出並注入到前端中，使用者點擊後，將選項內容以及相關判定數值，加入下一次 LLM 模型的上下文之中 |
| UI-03 | 角色資訊面板，常駐側邊或可收合 | 必須 | 顯示屬性值、職業、技能、狀態 |
| UI-04 | 顯示骰子判定動畫與結果（成功／失敗） | 必須 | LLM 自行判定，需要時通過執行 Skill 獲得結果用以判定，包含 LLM 的評斷以及判定結果 |
| UI-05 | 存檔／讀檔按鈕，可隨時操作 | 必須 | 存檔抽屜，可查看歷史紀錄，以及讀檔功能 |
| UI-06 | 遊戲紀錄（Log）區域，顯示歷史對話與事件 | 必須 | 可捲動 |
| UI-07 | 玩家模式選擇 | 必須 | 在啟動時選擇相應的玩家模式，包含一般模式、速通模式、蒐集探索模式、測試模式(需輸入密碼) |
| UI-08 | 新手引導提示 | 必須 | 在啟動時選擇相應的玩家模式，並在遊戲過程中提供引導 |
| UI-09 | 探索紀錄面板（已觸發事件、地點列表） | 必須 | 蒐集型玩家使用 |
| UI-10 | 測試模式面板 | 必須 | 允許直接設定數值與事件 |

#### 頁面佈局

```
┌────────────────────────────────────────────────┐
│  [遊戲標題]                       [存檔] [讀檔] │
├───────────────────────┬────────────────────────┤
│                       │  角色面板               │
│  場景描述區域          │  ─────────────────      │
│  （LLM 生成文字）      │  名稱：xxx             │
│                       │  職業：xxx             │
│                       │  HP：██████░░ 60/100   │
│                       │  屬性：STR 50, DEX 40...│
│                       │  技能：xxx, xxx        │
├───────────────────────┤                        │
│  [選項 A]  [選項 B]    │  ─────────────────     │
│  [選項 C]             │  [查看完整角色資料]      │
├───────────────────────┴────────────────────────┤
│  遊戲紀錄（Log）                                │
│  > 你選擇了 [選項 A]...                         │
│  > 判定：骰子 4+3 + STR 12 = 行動值 19 → 成功   │
└────────────────────────────────────────────────┘
```

---

### 4.2 敘事引擎模組（LLM 驅動）

**模組 ID**：`MOD-NARR`

#### 功能說明

敘事引擎負責將當前遊戲狀態組合成**提示詞（Prompt）**，呼叫 LLM API，並解析回傳的結構化輸出，提供場景描述與選項給前端顯示。
分為兩次呼叫，第一次呼叫用來執行判定系統或是其他系統產生的json，第二次呼叫用來輸出場景描述與選項給前端顯示。

#### 需求清單

| 需求 ID | 需求描述 | 優先級 |
| :--- | :--- | :--- |
| NARR-01 | 依據當前 GameState 組建系統提示詞（System Prompt） | 必須 |
| NARR-02 | LLM 輸出必須為結構化 JSON，包含 `scene_description`、`actions`、`flags` 欄位 | 必須 |
| NARR-03 | 初始提示詞包含：地圖卡、劇情卡、角色卡、選擇模式、其他相關資訊等。 | 必須 |
| NARR-04 | 提供最近 N 筆（預設 30）對話歷史作為 context | 必須 |
| NARR-05 | 支援 LLM 輸出失敗時的 fallback 處理（顯示錯誤訊息、保留上一狀態） | 必須 |
| NARR-06 | LLM 輸出的選項包含條件欄位（`condition`），前端依角色狀態動態顯示／隱藏 | 建議 |
| NARR-07 | 支援替換 LLM 後端（抽象化 API 呼叫介面） | 建議 |

#### LLM 初始格式（Prompt 結構）

```
[系統角色]
你是一個 TRPG 遊戲的 GM（遊戲主持人）。以下是世界觀與當前遊戲狀態。
請依照指定格式輸出場景描述與可選行動...。

[世界觀]
{worldview}

[地圖卡]
{map_card}

[劇情卡]
{story_card}

[角色卡]
{character_card}

[要求輸出格式 - 僅輸出 JSON，不附加其他文字]
{output_schema}
```

#### LLM 後續格式（Prompt 結構）

```
[地圖卡節點]
{current_map_node}

[劇情卡節點]
{current_scenario_node}

[當前角色數值]
{current_character_status}

[最近事件紀錄]
{recent_events}

[玩家上一個行動]
{last_action}

[要求輸出格式 - 僅輸出 JSON，不附加其他文字]
{output_schema}
```

#### LLM 輸出格式（JSON Schema）

```json
{
  "scene_description": "（100–300字場景描述）",
  "current_character_status": "（給腳本讀取，並在右側邊欄實時更新並顯示，需包含完整的角色卡資訊）",
  "actions": [
    {
      "id": "action_1",
      "label": "（選項文字，15字以內）",
      "description": "（選項詳細說明，可為空）",
      "requires": {
        "stat": "STR",
        "min_value": 50
      },
      "tags": ["combat", "explore", "talk"]
    },
    {
      "id": "action_2",
      "label": "（選項文字，15字以內）",
      "description": "（選項詳細說明，可為空）",
      "requires": {
        "stat": "DEX",
        "min_value": 60
      },
      "tags": ["combat", "explore", "talk"]
    },
    {
      "id": "action_3",
      "label": "（選項文字，15字以內）",
      "description": "（選項詳細說明，可為空）",
      "requires": {
        "stat": "MOV",
        "min_value": 10
      },
      "tags": ["combat", "explore", "talk"]
    }
  ],
  "hidden_flags": {
    "trigger_event": "（可選，觸發的事件 ID）",
    "auto_dice_check": true
  }
}
```

---

### 4.3 角色系統模組

**模組 ID**：`MOD-CHAR`

#### 需求清單

| 需求 ID | 需求描述 | 優先級 |
|:---|:---|:---|
| CHAR-01 | 角色具備基本屬性：STR（力量）、DEX（敏捷）、INT（智力）、POW（意志）、MOV（移動力）、HP（體力）、SAN（理智）、LUCK（幸運） | 必須 |
| CHAR-02 | 角色具備職業（Class），職業決定技能列表與骰子加成 | 必須 |
| CHAR-03 | 角色具備技能列表（Skills），技能可在判定時提供固定加值 | 必須 |
| CHAR-04 | 角色具備 HP（生命值）、SAN（理智） | 必須 |
| CHAR-05 | 屬性值可因事件、裝備、技能觸發而**臨時變動**（buff/debuff） | 必須 |
| CHAR-06 | 屬性值可因劇情達成**永久變動** | 必須 |
| CHAR-07 | 角色狀態（Status Effects）系統：中毒、疲勞、受傷等，影響判定加值 | 必須 |
| CHAR-08 | 完成結局後可將當前數值的角色儲存為新的角色卡 | 必須 |

#### 職業設計框架

| 職業 | 屬性 | 加成 | 起始技能範例 |
|:---|:---|:---|:---|
| 學生 | DEX, MOV | +5 | 閃避(DEX 臨時 +5)、奔跑(MOV 臨時 +5) |
| 教師 | INT, POW | +5 | 思考(INT 臨時 +5)、冷靜(POW 臨時 +5) |
| 工人 | STR, HP | +5 | 格鬥(STR 臨時 +5)、恢復(HP +5) |
| 工程師 | INT, SAN | +5 | 思考(INT 臨時 +5)、冥想(SAN +5) |
| 普通人 | HP, LUCK | +5 | 休息(HP +5)、祈禱(LUCK 臨時 +5) |

---

### 4.4 判定系統模組

**模組 ID**：`MOD-DICE`

#### 判定公式

可製作成一個 Skills，當進行判定時執行，/skill/dice/README.md，/skill/dice/Script/dice.py。

```
行動值 = Roll(2d6) + 職業加成 + 技能加成 + 人物狀態增減 + 幸運
```

其中：

- `Roll(2d6)`：擲兩顆六面骰，範圍 2–12
- `職業加成`：由當前職業與行動類型對應，範圍 0–3
- `技能加成`：持有相關技能時給予，範圍 0–3
- `人物狀態增減`：受傷（-3）、亢奮（+2）
- `幸運`：幸運 > 70(+2)，幸運 < 30(-3)

#### 判定結果閾值

| 判定結果 | 行動值 | 效果 |
| :--- | :--- | :--- |
| 大成功（Critical Success） | ≥ 15 | 行動完全成功，獲得額外加成(LUCK +2) |
| 成功（Success） | 11–14 | 行動成功 |
| 部分成功（Partial Success） | 8–10 | 行動成功但伴隨代價（LUCK -2） |
| 失敗（Failure） | 5–7 | 行動失敗，無事發生 |
| 大失敗（Critical Failure） | 2–4 | 行動失敗且產生額外負面後果（LUCK -3） |

#### 需求清單

| 需求 ID | 需求描述 | 優先級 |
|:---|:---|:---|
| DICE-01 | 依上述公式計算行動值 | 必須 |
| DICE-02 | 判定過程透明化，在 Log 中顯示各加值來源 | 必須 |
| DICE-03 | 支援強制指定骰子結果（測試模式時顯示，平時不顯示） | 建議 |
| DICE-04 | 支援不同判定類型（d4, d6, d8, d10, d20、d100）供未來擴充，判定結果閾值隨類型改變 | 選配 |

---

### 4.5 戰鬥系統模組

**模組 ID**：`MOD-COMBAT`

#### 戰鬥流程）

```
戰鬥事件
  → 雙方確定（角色(當前 HP) vs 敵人(100 HP)）
  → 玩家先攻
  → 回合開始
      → 攻擊方：damage = Roll(2d6) + STR/30
      → 計算傷害：HP = HP - damage
      → 敵人 HP 歸零：敵人死亡 / 戰鬥勝利
      → 玩家 HP 歸零：玩家重傷 / 戰鬥失敗
  → 戰鬥結束，觸發結果事件：重傷(全屬性 -20%，HP -20, SAN -20, MOV -3)
```

#### 需求清單

| 需求 ID | 需求描述 | 優先級 |
|:---|:---|:---|
| COMBAT-01 | 實作回合制戰鬥邏輯（玩家行動 → 敵人行動） | 必須 |
| COMBAT-02 | 敵人設定：HP、STR | 必須 |
| COMBAT-03 | 戰鬥過程由 LLM 生成敘事文字 | 建議 |

---

### 4.6 劇情／事件系統模組

**模組 ID**：`MOD-EVENT`

#### 需求清單

| 需求 ID | 需求描述 | 優先級 |
| :--- | :--- | :--- |
| EVENT-01 | 劇情推進依據玩家行動與判定結果，切換至對應劇情節點 | 必須 |
| EVENT-02 | 支援四種結局：成功、失敗、普通、開放式 | 必須 |
| EVENT-03 | 特殊事件（Special Event）依條件自動觸發 | 必須 |
| EVENT-04 | 劇情分支條件支援：屬性閾值、旗標（flag）、已觸發事件 | 必須 |
| EVENT-05 | 事件執行後更新角色數值、旗標、地圖解鎖狀態 | 必須 |
| EVENT-06 | 事件觸發順序可配置（立即 / 延遲 / 條件型） | 建議 |

#### 結局觸發條件範例

| 結局類型 | 觸發條件範例 |
| :--- | :--- |
| 成功結局 | 完成劇情目標 + HP > 0 |
| 失敗結局 | HP ≤ 0  
| 普通結局 | 未完成劇情目標 + HP > 0 + SAN < 0(無能力繼續行動) |
| 開放式結局 | 完成劇情目標/未完成劇情目標 + HP > 0 + SAN > 0 + 達成特殊條件(獲得特定道具)，劇情開放詮釋 |

---

### 4.7 地圖系統模組

**模組 ID**：`MOD-MAP`

#### 需求清單

| 需求 ID | 需求描述 | 優先級 |
| :--- | :--- | :--- |
| MAP-01 | 地圖以節點（Node）與路徑（Edge）結構組成有向圖 | 必須 |
| MAP-02 | 每個節點含：ID、名稱、描述、可觸發事件列表、連接節點 | 必須 |
| MAP-03 | 節點可設定進入條件（如需要物品或已完成某事件） | 必須 |
| MAP-04 | 玩家移動至新節點時觸發場景更新（呼叫敘事引擎） | 必須 |
| MAP-05 | 可在網頁的側邊欄顯示 | 必須 |
| MAP-06 | 節點可標記為：已探索 / 未探索 / 鎖定 | 選配 |
| MAP-07 | 支援簡易地圖視覺化（節點連線圖，可選） | 選配 |

---

### 4.8 存檔／讀檔模組

**模組 ID**：`MOD-SAVE`

#### 需求清單

| 需求 ID | 需求描述 | 優先級 |
| :--- | :--- | :--- |
| SAVE-01 | 手動存檔，儲存至 LocalStorage | 必須 |
| SAVE-02 | 讀取存檔，還原完整遊戲狀態 | 必須 |
| SAVE-03 | 自動存檔（每次場景切換後觸發） | 必須 |
| SAVE-04 | 存檔包含：角色狀態、當前劇情節點、地圖節點、事件旗標、對話歷史 | 必須 |
| SAVE-05 | 存檔槽設計（3 槽） | 建議 |
| SAVE-06 | 存檔資料版本控制，防止版本不兼容錯誤 | 建議 |
| SAVE-07 | 支援存檔匯出／匯入（JSON 下載） | 建議 |

---

## 五、資料結構定義

### 5.1 劇情卡（ScenarioCard）

```json
{
  "id": "scenario_001",
  "title": "序章：甦醒",
  "chapter": 1,
  "description": "玩家在一間昏暗的實驗室醒來，周圍有不明的實驗設備。",
  "entry_condition": null,
  "exit_conditions": {
    "success": { "flag": "found_key_card", "stat_check": null },
    "failure": { "hp_lte": 0 },
    "normal": { "flag": "left_without_clue" },
    "open": { "flag": "ally_survived" }
  },
  "key_events": ["event_001", "event_002", "event_special_001"],
  "available_map": "map_001",
  "starting_node": "node_001"
}
```

### 5.2 地圖卡（MapCard）

```json
{
  "id": "map_001",
  "name": "B2 實驗區",
  "nodes": [
    {
      "id": "node_001",
      "name": "甦醒房間",
      "description": "一間充滿儀器的白色房間，你躺在一張金屬床上。",
      "events": ["event_001"],
      "connections": ["node_002", "node_003"],
      "entry_condition": null,
      "explored": false,
      "locked": false
    },
    {
      "id": "node_002",
      "name": "走廊",
      "description": "昏暗的走廊，牆上有血跡。",
      "events": ["event_002"],
      "connections": ["node_001", "node_004"],
      "entry_condition": { "flag": "door_unlocked" },
      "explored": false,
      "locked": true
    }
  ]
}
```

### 5.3 人物卡（CharacterCard）

```json
{
  "id": "char_001",
  "name": "艾莉",
  "class": "學生",
  "background": "普通大學生。",
  "stats": {
    "STR": 40,
    "DEX": 40,
    "INT": 70,
    "POW": 50,
    "MOV": 50,
  },
  "derived_stats": {
    "HP": 100,
    "SAN": 50,
    "LUCK": 50
  },
  "skills": [
    { "id": "skill_dodge", "name": "閃避", "bonus": 5, "type": "DEX" },
    { "id": "skill_run", "name": "奔跑", "bonus": 5, "type": "MOV" }
  ],
  "inventory": [],
  "status_effects": [],
  "temp_modifiers": []
}
```

### 5.4 存檔格式（SaveData）

```json
{
  "save_version": "1.0.0",
  "timestamp": "2026-05-07T10:00:00Z",
  "slot": 1,
  "game_state": {
    "character": { "...CharacterCard 完整資料..." },
    "current_scenario_id": "scenario_001",
    "current_node_id": "node_002",
    "flags": {
      "event_001_triggered": true,
      "door_unlocked": false
    },
    "map_state": {
      "map_001": {
        "node_001": { "explored": true },
        "node_002": { "explored": false },
        "node_...": { "explored": true }
      }
    },
    "conversation_history": [
      { "role": "user", "content": "玩家行動描述" },
      { "role": "assistant", "content": "LLM 輸出 JSON" }
    ],
    "play_mode": "normal"
  }
}
```

---

## 六、LLM 整合規格

### 6.1 API 配置

| 項目 | 規格 |
| :--- | :--- |
| 預設模型 | `deepseek-v4-flash` |
| 最大 Token 輸出 | 20k tokens |
| 溫度（Temperature） | 0.7（可設定，較高增加隨機性） |
| Context 歷史長度 | 最近 30 輪對話 |
| API Key 管理 | 由環境變數或 UI 輸入框提供，不硬編碼 |

### 6.2 Prompt 組裝策略

```javascript
function buildPrompt(gameState) {
  return {
    system: buildSystemPrompt(gameState.world, gameState.scenario),
    messages: [
      ...trimHistory(gameState.conversationHistory, MAX_HISTORY),
      { role: "user", content: buildUserMessage(gameState) }
    ]
  };
}
```

### 6.3 輸出解析與容錯

- LLM 回應必須為合法 JSON，否則觸發 fallback。
- Fallback 策略：顯示預設場景描述 + 基本行動選項（由靜態資料提供）。
- 解析失敗時記錄錯誤至 Log，不中斷遊戲。

---

## 七、事件清單

| 編號 | 事件類型 | 事件名稱 | 觸發條件 | 相關模組 |
|:---|:---|:---|:---|:---|
| EVT-01 | 外部 | 進入遊戲 | 玩家開啟頁面 | MOD-UI |
| EVT-02 | 外部 | 開始新遊戲 | 點擊「新遊戲」 | MOD-CHAR, MOD-EVENT |
| EVT-03 | 外部 | 新手引導 | 首次遊玩 flag | MOD-UI |
| EVT-04 | 外部 | 場景顯示 | 進入地圖節點 | MOD-NARR, MOD-MAP |
| EVT-05 | 外部 | 選擇行動 | 點擊行動選項 | MOD-NARR, MOD-EVENT |
| EVT-06 | 外部 | 行動判定 | 需要骰子的行動 | MOD-DICE |
| EVT-07 | 外部 | 戰鬥觸發 | 進入戰鬥事件 | MOD-COMBAT |
| EVT-08 | 狀態 | 角色狀態更新 | 事件結果回傳 | MOD-CHAR |
| EVT-09 | 外部 | 查看角色資料 | 點擊角色面板 | MOD-CHAR, MOD-UI |
| EVT-10 | 外部 | 手動存檔 | 點擊存檔按鈕 | MOD-SAVE |
| EVT-11 | 外部 | 讀取存檔 | 點擊讀檔按鈕 | MOD-SAVE |
| EVT-12 | 暫時 | 自動存檔 | 場景切換後 | MOD-SAVE |
| EVT-13 | 狀態 | 特殊事件觸發 | 條件達成 | MOD-EVENT |
| EVT-14 | 狀態 | 劇情分支判斷 | 事件結果評估 | MOD-EVENT |
| EVT-15 | 狀態 | 結局判定 | 結局條件達成 | MOD-EVENT, MOD-UI |
| EVT-16 | 外部 | 探索紀錄查詢 | 點擊探索紀錄 | MOD-UI |
| EVT-17 | 外部 | 速通模式切換 | 玩家設定 | MOD-CHAR, MOD-EVENT |
| EVT-18 | 外部 | 測試模式設定 | 隱藏入口觸發 | MOD-CHAR, MOD-EVENT, MOD-DICE |
| EVT-19 | 外部 | 劇情資料維護 | 設計者操作 | MOD-EVENT（Card Loader） |
| EVT-20 | 外部 | 人物資料維護 | 設計者操作 | MOD-CHAR（Card Loader） |
| EVT-21 | 外部 | 數值規則維護 | 設計者操作 | MOD-DICE |
| EVT-22 | 狀態 | 系統狀態異常檢查 | 內部偵測 | 全模組 |

---

## 八、非功能性需求

| 類別 | 需求 | 指標 |
| :--- | :--- | :--- |
| 效能 | LLM API 呼叫後場景更新 | ≤ 120 秒（含 API 回應） |
| 效能 | 本地計算（判定、存檔） | ≤ 1000ms |
| 相容性 | 支援主流瀏覽器 | Chrome、Edge |
| 可維護性 | Card 資料以純 JSON 管理，無需修改核心程式碼即可新增劇情 | — |

---

## 九、擴充性設計指引

### 9.1 Card 系統擴充

新增劇情、地圖、事件只需新增對應 JSON Card 檔案，並在 Card Loader 中登記，核心引擎不需修改。

```javascript
// Card Loader 介面（預留）
const CardLoader = {
  loadMap: (id) => fetch(`/cards/maps/${id}.json`),
  loadScenario: (id) => fetch(`/cards/scenarios/${id}.json`),
  loadCharacter: (id) => fetch(`/cards/characters/${id}.json`),
  loadEvent: (id) => fetch(`/cards/events/${id}.json`)
};
```

### 9.2 LLM 後端替換

敘事引擎的 API 呼叫抽象化，僅需實作以下介面即可替換為其他 LLM：

```javascript
// LLM Provider 介面
class LLMProvider {
  async generateNarration(prompt) { throw new Error("未實作"); }
}

class DeepSeekProvider extends LLMProvider { ... }
class OpenAIProvider extends LLMProvider { ... }   // 預留
class AnthropicProvider extends LLMProvider { ... } // 預留
class GoogleProvider extends LLMProvider { ... } // 預留
```

### 9.3 判定系統擴充

判定公式以設定物件定義，支援不同規則集：

```javascript
const DiceConfig = {
  base_dice: "2d6",
  result_table: [
    { min: 18, max: 99, label: "大成功", outcome: "critical_success" },
    { min: 12, max: 17, label: "成功",   outcome: "success" },
    // ...
  ]
};
```

### 9.4 存檔系統擴充

存檔後端以介面定義，未來可從 LocalStorage 切換至 IndexedDB 或雲端：

```javascript
class SaveBackend {
  async save(slot, data) { ... }
  async load(slot) { ... }
  async listSlots() { ... }
}

class LocalStorageBackend extends SaveBackend { ... }
class IndexedDBBackend extends SaveBackend { ... }   // 預留
class CloudBackend extends SaveBackend { ... }        // 預留
```

### 9.5 多語系支援（預留）

所有顯示字串集中管理於 `i18n.js`，未來可新增語言：

```javascript
const i18n = {
  "zh-TW": { "success": "成功", "failure": "失敗", ... },
  "en-US": { "success": "Success", "failure": "Failure", ... }  // 預留
};
```

---

## 十、即時監控儀表板（Debug Monitor）

**模組 ID**：`MOD-DEBUG-MONITOR`

### 功能說明

提供開發者／測試者一個獨立的監控頁面（或內嵌儀表板），以**唯讀、即時更新**的方式，集中呈現遊戲運行中的關鍵內部狀態。所有資料由前端 GameState 主動推送，不干預遊戲流程。

### 需求清單

| 需求 ID | 需求描述 | 優先級 | 備註 |
|:---|:---|:---|:---|
| MON-01 | 儀表板以獨立 `.html` 頁面呈現，可透過瀏覽器另開分頁或視窗開啟 | 必須 | 與主遊戲頁面分離，避免干擾 UI |
| MON-02 | 即時顯示**地圖進度**：地圖名稱、所有節點列表，並標記當前節點、已探索節點、鎖定節點、可通行節點 | 必須 | 以清單或簡易圖形呈現（文字顏色區分） |
| MON-03 | 即時顯示**劇情進度**：當前劇情卡名稱、章節、已觸發事件 ID 列表、已設置的全局旗標（flags）鍵值對 | 必須 | 旗標以表格呈現 |
| MON-04 | 即時顯示**角色數值**：基本屬性（STR、DEX、INT、POW、MOV）、數值（HP、SAN、LUCK）、職業、技能列表（含加值）、狀態效果、臨時修正 | 必須 | 包含原始基礎值與當前實際值 |
| MON-05 | 即時顯示**當前 LLM Prompt 結構**：展示上一次／準備送出的完整 prompt 內容，區分 system、messages 陣列（含角色與內容），渲染成可讀結構呈現 | 必須 | 便於檢查 prompt 拼裝是否正確 |
| MON-06 | 即時顯示**最近 N 次骰子判定結果**，包含：觸發行動、擲骰原始值（2d6 結果）、各項加成明細（職業加成、技能加成、狀態修正、幸運修正）、最終行動值、判定結果（大成功～大失敗） | 必須 | 顯示為表格，新結果自動置頂 |
| MON-07 | 所有監控數據更新頻率不低於 1000ms，以輪詢或事件推送方式從主遊戲狀態取得 | 必須 | 避免過度消耗效能 |
| MON-08 | 提供「暫停更新」與「匯出當前狀態（JSON）」按鈕 | 建議 | 便於除錯時凍結數據或保存現場 |
| MON-09 | 支援顯示**最近事件觸發記錄**（EVT 事件 ID、時間戳、觸發條件與結果） | 選配 | 用於追蹤事件流程 |
| MON-10 | 儀表板版面以分頁（Tab）或折疊區塊組織，各區塊獨立捲動，避免單一頁面過長 | 建議 | 提升可讀性 |

### 資料交換機制

- 主遊戲引擎維護一個共享的 `DebugState` 物件，每次狀態變更後更新該物件。
- 監控頁面透過 `postMessage`（同源）或共用 `LocalStorage` 輪詢讀取 `DebugState`。
- 不依賴任何後端服務，全由前端完成。

### 10.2 Fallback 邏輯實作

當 LLM API 呼叫失敗時，應觸發 fallback 邏輯，將預設場景描述 + 基本行動選項顯示給前端。

---

## 十一、詞彙表

| 術語 | 說明 |
|:---|:---|
| TRPG | Tabletop Role-Playing Game，桌上角色扮演遊戲 |
| GM | Game Master，遊戲主持人，本系統由 LLM 擔任 |
| Card | 系統中的資料設定單元（世界卡、劇情卡、地圖卡、人物卡、事件卡） |
| Flag | 遊戲狀態旗標，記錄是否發生過特定事件或達成特定條件 |
| Node | 地圖中的位置節點 |
| Buff/Debuff | 臨時正面／負面屬性修正 |
| LLM | Large Language Model，大型語言模型 |
| LocalStorage | 瀏覽器本地儲存 API |
| 行動值 | 玩家行動判定的最終數值，由骰子 + 加成計算 |
| 大成功／大失敗 | 極端骰子結果，觸發特殊劇情分支 |
| fallback | LLM 呼叫失敗時的備援機制 |

---
