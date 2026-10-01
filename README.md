# TRPG Adventure Engine

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript ES6+](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js 22 LTS](https://img.shields.io/badge/Node.js-22%20LTS%20Portable-339933?style=flat-square&logo=node.js&logoColor=white)
![LLM Powered](https://img.shields.io/badge/LLM-DeepSeek%20%7C%20Ollama%20%7C%20NVIDIA%20%7C%20OpenRouter-8A2BE2?style=flat-square)
![License MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

**TRPG Adventure Engine** 是一款專為瀏覽器環境打造的輕量、高擴充性「大型語言模型（LLM）驅動文字冒險 TRPG 遊戲引擎」。

本專案融合了經典桌上角色扮演遊戲（TRPG）的確定性規則引擎（八大屬性檢定、技能修正、透明 2d6 擲骰、回合制戰鬥、節點地圖探索）與現代生成式 AI（動態場景演化、NPC 深度對話、語意情境推演）。玩家無需繁瑣設定，即可享受充滿未知變數與深厚敘事張力的角色扮演冒險。

---

## 核心特色 (Core Features)

### 1. 動態 LLM 敘事引擎 (Dynamic Narrative Engine)
- **多模型原生支援**：無縫接軌 **DeepSeek**（`deepseek-chat` / `deepseek-reasoner`）、**本機 Ollama**（相容 LLaMA 3、Mistral 等）、**NVIDIA NIM**、**OpenRouter**，支援前端動態切換與自動拉取可用模型清單。
- **結構化 JSON 輸出契約**：嚴格規範 LLM 回傳包含 `scene_description`、`current_character_status`、`actions`（含難度、骰型、目標節點標記）與 `hidden_flags`，確保遊戲數值與敘事 100% 程式碼連動。
- **三層健全 Fallback 容錯**：
  1. 優先直接 JSON 反序列化。
  2. Markdown 程式碼區塊擷取（支援容許非標準外圍文字）。
  3. 正規表達式首尾大括號提取；若 API 斷線或解析徹底失敗，自動啟用 Fallback 應急場景，保證玩家介面永不卡死。
- **長程記憶管理**：維護最高 30 輪滑動歷史對話窗口，配合情境摘要與已達成旗標注入，兼顧敘事連貫性與 Token 成本控制。

### 2. 透明且豐富的 TRPG 判定系統 (Transparent Dice & Rule System)
- **經典數值模型**：
  - **五大主屬性**：力量 (`STR`)、敏捷 (`DEX`)、智力 (`INT`)、意志 (`POW`)、移動 (`MOV`)。
  - **三大衍生數值**：生命值 (`HP`)、理智值 (`SAN`)、幸運值 (`LUCK`)。
- **職業加成與技能機制**：內建 10 種預設職業（學生、教師、工人、工程師、普通人、軟體工程師、護理師、警察、記者、外送員），分別對探索 (`explore`)、交涉 (`talk`)、戰鬥 (`combat`) 提供專屬補正。
- **透明行動值計算公式**：
  $$\text{行動值} = \text{Roll}(2d6) + \text{職業加成} + \text{技能加成} + \text{狀態增減} + \text{幸運修正}$$
  - 幸運值 $> 70$ 獲 $+2$ 增益；$< 30$ 承擔 $-3$ 減益。
- **五級結果閾值查表**：
  - **大成功** ($\ge 15$)：觸發致命一擊或特殊奇遇，LUCK $+2$
  - **成功** ($11 \sim 14$)：順利達成目標
  - **部分成功** ($8 \sim 10$)：付出代價或伴隨險境達成，LUCK $-2$
  - **失敗** ($5 \sim 7$)：行動受阻，情勢惡化
  - **大失敗** ($2 \sim 4$)：嚴重挫敗，可能直接遭受傷害，LUCK $-3$
- **多骰種擴充支援**：具備 $2d4$、$2d6$、$2d8$、$2d10$、$1d20$ 與 $1d100$ 完整查表設定，支援 GM 依照情境自訂檢定骰種。

### 3. 回合制戰鬥與狀態系統 (Combat & Status Engine)
- **HP / SAN 雙重生命線**：受到物理攻擊折損 HP，目睹不可名狀恐懼或深淵事件折損 SAN。任一數值歸零即面臨死亡或瘋狂結局。
- **即時 Buff / Debuff 機制**：內建「受傷（-3）」、「中毒（-2）」、「疲勞（-1）」、「亢奮（+2）」等狀態效果，直接介入每次行動判定。
- **戰鬥懲罰與傳承**：戰鬥失利將承受全屬性折扣與生命減損；通關結局後可將該輪冒險角色的累積經歷與技能匯出為全新「傳承角色卡」。

### 4. 節點地圖與事件探索 (Map & Event Exploration)
- **拓撲地圖推進**：以圖論節點建構地圖體系，支援節點鎖定、特定旗標條件解鎖、鄰接節點限制與即時路徑探索。
- **卡片驅動事件機制**：事件獨立儲存於 JSON 卡片庫，支援前置條件過濾、旗標觸發連鎖、自動數值檢定與自訂敘事銜接。

### 5. 多元玩家模式與引導 (Game Modes & Onboarding)
- **一般模式 (Normal)**：標準 TRPG 節奏，享受沉浸式劇情推進。
- **速通模式 (Speedrun)**：全屬性提升 20%，加快文本演繹與檢定節奏。
- **蒐集探索模式 (Collect)**：針對環境細節全面解析，即時追蹤未觸發事件進度。
- **測試模式 (Test)**：透過安全密碼（預設 `root`）解鎖隱藏控制台，支援強制骰值鎖定、屬性即時覆寫、旗標手動開關與即時事件觸發。
- **新手引導**：提供流暢的 6 步驟互動引導教學，快速掌握介面、屬性條與檢定規則。

### 6. 自適應視聽體驗 (Adaptive Audio & Visuals)
- **10 種沉浸色彩主題**：科幻、冒險、蒸氣、賽博、星際、深淵、黎明、古典、史詩、神話，全域 CSS 變數動態切換。
- **情境音訊引擎**：背景音樂（BGM）具備平滑淡入淡出（Cross-fade），支援隨主題自適應切換，搭配專屬擲骰、成功、失敗、存檔與 LLM 運算回饋音效。

### 7. 獨立除錯監控儀表板 (Debug & Observability Dashboard)
- 內建獨立 `debug.html` 監控頁面。
- 透過瀏覽器跨分頁事件通道即時觀測：
  - **EventBus 事件流廣播**（事件名、Payload 結構、發送時間戳記）
  - **GameState 歷史快照**（屬性變化、旗標追蹤）
  - **LLM 請求監控**（耗時統計、Token 使用量、原始 Prompt 與解析結果）

---

## 極簡一鍵啟動指南 (Quick Start)

### Windows 推薦：零環境依賴（無需手動安裝 Node.js）

本專案提供自帶可攜版 Node.js 執行環境的批次腳本，不需事先安裝任何執行環境，亦不會更動或污染作業系統設定：

1. **首次使用**：雙擊執行 `setup.bat`
   - 腳本將自動下載官方 Node.js 22 LTS 便攜版（壓縮包約 30MB）並解壓至專案 `runtime/` 目錄。
   - 此步驟僅需執行一次。
2. **啟動遊戲**：雙擊執行 `start.bat`
   - 自動檢測並釋放佔用之 `8080` 通訊埠。
   - 透過專屬 `runtime/node.exe` 啟動 `server.js`。
   - 自動啟動預設瀏覽器並開啟遊戲主畫面。

---

### 跨平台 / 手動啟動

若您使用 macOS / Linux，或本機已有 Node.js 環境（Node.js 18+）：

```bash
# 啟動伺服器
node server.js
```

啟動後於瀏覽器造訪以下端點：

- **遊戲主畫面**：`http://localhost:8080`
- **除錯監控儀表板**：`http://localhost:8080/debug.html`

---

## 後端架構與 LLM 配置 (LLM Configuration)

### 為什麼需要輕量 Node.js 伺服器？
1. **解除瀏覽器 CORS 跨域限制**：多數商業 LLM API 不允許前端瀏覽器直接發起跨網域請求，伺服器充當安全且透明的反向代理（`/api/proxy/...`）。
2. **端點封裝與安全性**：避免向公網直接暴露外部模型探索端點，並保障本機檔案系統讀取卡片時的安全性。
3. **卡片動態讀取**：動態掃描 `cards/` 目錄並自動組合角色、劇本與地圖資料（`/api/cards`）。

### 各 Provider 連線設定指南

進入遊戲後，點擊右上角「**⚙️ 設定**」面板填入相關資訊（設定將自動保存於瀏覽器 LocalStorage）：

| Provider | 代理端點 (由系統自動帶入) | API Key 需求 | 預設模型範例 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **DeepSeek** | `/api/proxy/https://api.deepseek.com/...` | 必填 | `deepseek-chat` | 支援 `deepseek-chat`、`deepseek-reasoner` |
| **Ollama** | `/api/proxy/http://localhost:11434/...` | 可空白 | `llama3` / `qwen2.5` | 本機執行，完全免費且保護隱私 |
| **NVIDIA NIM** | `/api/proxy/https://integrate.api.nvidia.com/...` | 必填 | `deepseek-ai/deepseek-r1` | 高效能雲端推理服務 |
| **OpenRouter** | `/api/proxy/https://openrouter.ai/...` | 必填 | `anthropic/claude-3.5-sonnet` | 集合各家旗艦模型之聚合平台 |

> **提示**：若使用 Ollama，請確保已在終端機啟動 Ollama 服務並下載相應模型（如 `ollama run llama3`）。

---

## 專案目錄架構 (Directory Structure)

專案嚴格遵循**單向資料流**與**事件總線（EventBus）解耦架構**，模組間禁止直接互相引用：

```text
TRPG_text_adventure/
├── audio/                      # 音訊資源與管理器
│   ├── bgm/                    # 10 款世界觀主題背景音樂
│   ├── sfx/                    # 擲骰、UI、存檔、LLM 回饋音效
│   └── audio-manager.js        # 平滑淡入淡出、音量控制與事件監聽
├── cards/                      # 核心資料庫 (卡片化架構)
│   ├── characters/             # 角色卡 JSON (如 char_001 ~ char_010)
│   ├── events/                 # 事件卡 JSON (如 event_001 ~ event_011)
│   ├── maps/                   # 地圖卡 JSON (如 map_001 ~ map_004)
│   └── scenarios/              # 劇本卡 JSON (如 scenario_001 ~ scenario_004)
├── character/                  # 角色系統 (屬性運算、職業加成、狀態、傳承卡匯出)
├── combat/                     # 回合制戰鬥系統 (HP/SAN 結算、逃跑與戰敗懲罰)
├── css/                        # 模組化樣式庫 (支援 10 種色彩主題與動畫)
├── debug_monitor/              # 獨立除錯儀表板監控腳本
├── dice/                       # 判定系統 (骰種配置、查表演算法、測試強制骰)
├── event/                      # 事件系統 (條件觸發、旗標連鎖更新)
├── js/                         # 引擎核心架構
│   ├── app.js                  # 前端進入點與全域模組裝配
│   ├── config.js               # 全域設定常數、閾值表與主題定義
│   ├── event-bus.js            # 核心解耦 EventBus 與 GameEvent 常數
│   ├── game-engine.js          # 遊戲主循環、回合驅動與狀態機
│   ├── game-state.js           # 單一資料來源 (Single Source of Truth)
│   ├── i18n.js                 # 國際化多語言設定
│   └── system-check.js         # 前端相容性與環境自檢
├── map/                        # 地圖系統 (節點圖論、連通性驗證、移動判定)
├── narrative/                  # 敘事與 LLM 整合層
│   ├── llm-provider.js         # 多 Provider API 適配器與模型探測
│   └── narrative-engine.js     # Prompt 組裝、JSON 結構化解析與三層 Fallback
├── runtime/                    # 便攜版 Node.js 22 LTS 目錄 (執行 setup.bat 後產生)
├── save/                       # 存檔系統 (LocalStorage 序列化、自動存檔、匯入匯出)
├── ui/                         # 前端 UI 元件層
│   ├── action-panel.js         # 行動選項面板
│   ├── character-panel.js      # 角色屬性與數值面板
│   ├── dice-animation.js      # 物理感擲骰動效與明細彈窗
│   ├── explore-panel.js        # 探索互動清單
│   ├── game-log.js             # 冒險歷史紀錄日誌
│   ├── map-view.js             # 節點拓撲視覺化地圖
│   ├── mode-select.js          # 遊玩模式選擇面板
│   ├── save-drawer.js          # 存讀檔抽屜面板
│   ├── scene-renderer.js       # 場景打字機動畫與視覺特效渲染
│   ├── test-panel.js           # 測試模式作弊面板
│   ├── tutorial.js             # 新手 6 步驟導覽教學
│   └── ui-manager.js           # UI 統籌調度器
├── debug.html                  # 獨立即時除錯監控儀表板
├── index.html                  # 遊戲主介面
├── server.js                   # 本機輕量 Node.js 代理伺服器
├── setup.bat                   # 便攜版 Node.js 下載與解壓腳本
└── start.bat                   # 一鍵清理連接埠、啟動服務與開啟瀏覽器
```

---

## 擴充與自訂指南 (Customization)

所有劇本、角色、地圖與事件均採用宣告式 JSON 設計，置於 `cards/` 目錄下，引擎會在伺服器啟動時自動掃描掛載。

### 1. 新增角色 (`cards/characters/char_xxx.json`)
```json
{
  "id": "char_custom_001",
  "name": "艾登・凡斯",
  "class": "工程師",
  "background": "前深空探測站首席維修技師，擅長重型機具修復與能源管線配置。",
  "stats": { "STR": 50, "DEX": 60, "INT": 70, "POW": 45, "MOV": 50 },
  "derived_stats": { "HP": 90, "SAN": 70, "LUCK": 50 },
  "skills": [
    { "id": "skill_repair", "name": "機械檢修", "bonus": 3, "type": "INT" },
    { "id": "skill_alert", "name": "危機直覺", "bonus": 2, "type": "DEX" }
  ],
  "inventory": [],
  "status_effects": []
}
```

### 2. 新增事件 (`cards/events/event_xxx.json`)
```json
{
  "id": "event_custom_001",
  "title": "廢棄反應爐警報",
  "description": "走廊盡頭傳來刺耳的冷卻液洩漏警報",
  "trigger_condition": {
    "node_id": "reactor_room",
    "required_flags": ["main_power_restored"]
  },
  "effects": [
    {
      "type": "set_flag",
      "key": "reactor_hazard_active",
      "value": true,
      "description": "啟動反應爐輻射警報狀態"
    }
  ],
  "narrative": "刺耳的警報聲瞬間撕裂了寂靜，深紅色的旋轉警示燈照亮了管線交錯的天花板..."
}
```

### 3. 新增地圖與節點 (`cards/maps/map_xxx.json`)
定義地圖節點拓撲結構，設定節點的相鄰連線 (`connections`)、鎖定狀態 (`locked`) 與進入條件旗標 (`entry_condition`)，LLM 敘事引擎將自動限制玩家的移動路徑並即時反饋可前往區域。

---

## 常見問題與疑難排解 (Troubleshooting / FAQ)

### Q1: 啟動時提示通訊埠 8080 被佔用？
- 專案內建的 `start.bat` 會在啟動前**自動探測並終止**佔用 8080 埠號的程序。
- 若手動執行 Node.js，可在終端機手動釋放該通訊埠：
  ```powershell
  # Windows PowerShell 查詢並清除
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process -Force
  ```

### Q2: 本機 Ollama 連線失敗或沒有回應？
1. 確認 Ollama 服務已在背景運作（在命令列執行 `ollama list` 確認是否有輸出）。
2. 若尚未下載模型，請先執行 `ollama pull llama3`（或任意偏好的模型名稱）。
3. 遊戲內設定面板的 Ollama 網址填寫 `http://localhost:11434`，API Key 可直接留空。

### Q3: 遊戲存檔儲存在哪裡？如何備份？
- 存檔資料保存在瀏覽器的 **LocalStorage** 中。
- 引擎提供 **3 個手動存檔槽** 與 **1 個自動存檔槽**（每次關鍵節點自動觸發）。
- 可透過遊戲內「**存讀檔抽屜**」將存檔直接匯出為 `.json` 檔案下載至本機備份，或自本機 JSON 檔案匯入。

---

## 授權條款 (License)

本專案基於 [MIT License](LICENSE) 開源授權，歡迎自由擴充、二次開發或整合至您的 TRPG 劇本創作中。

