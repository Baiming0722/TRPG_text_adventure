# TRPG Adventure Engine

瀏覽器文字冒險 TRPG，前端以 HTML/CSS/JS 實作，LLM 敘事透過本機 Node server 代理呼叫。

## 需求

- Windows 10 以上（專案內含 `setup.bat` + `start.bat`）
- **不需要安裝 Node.js**——專案自帶便攜版

## 啟動方式

### 首次使用（安裝便攜版 Node.js）

```bat
setup.bat
```

會自動下載 Node.js 22 LTS 便攜版（約 30MB）到 `runtime/` 資料夾。
僅需執行一次，之後便攜版會保留在專案內。

### 啟動遊戲

```bat
start.bat
```

會執行以下流程：

1. 使用 `runtime/node.exe` 啟動伺服器（若無便攜版則回退至系統 Node.js）
2. 清理 `8080` 既有程序
3. 啟動 `node server.js`
4. 自動開啟瀏覽器到 `http://localhost:8080`

### 手動啟動

```powershell
.\runtime\node.exe server.js
```

啟動後可用網址：

- 遊戲主畫面：`http://localhost:8080`
- Debug 監控：`http://localhost:8080/debug.html`

## 為什麼需要 Node server

本專案不是純靜態頁面啟動，原因如下：

- LLM 請求走 `/api/proxy/...`，由 `server.js` 轉送外部 API
- 取得模型清單走 `/api/llm-models?provider=...`
- 直接開 `index.html` 不會有上述 API 端點

## LLM Provider 設定

在遊戲右上角設定面板填入以下欄位：

- `Provider`
- `API Key`（`ollama` 可留空）
- `URL`
- `Model`

### Ollama（本機）

- Provider：`ollama`
- API Key：可空白
- URL：`http://localhost:11434`
- Model：例如 `llama3`

先確認本機有模型：

```powershell
ollama list
```

### DeepSeek

- Provider：`deepseek`
- API Key：你的 DeepSeek key
- URL：`https://api.deepseek.com/chat/completions`
- Model：例如 `deepseek-v4-flash`

### NVIDIA NIM

- Provider：`nvidia`
- API Key：你的 NVIDIA key
- URL：`https://integrate.api.nvidia.com/v1/chat/completions`
- Model：例如 `deepseek-ai/deepseek-v4-flash`

## 備註

- LLM 設定會存到瀏覽器 LocalStorage（key：`trpg_llm_settings`）
- 存檔資料會存到 LocalStorage（手動 3 槽 + 自動存檔）
