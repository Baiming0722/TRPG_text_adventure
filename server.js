const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

// 各 Provider 的模型清單端點（由後端管理，不暴露給前端）
const PROVIDER_MODELS_ENDPOINTS = {
    nvidia:     'https://integrate.api.nvidia.com/v1/models',
    deepseek:   'https://api.deepseek.com/models',
    openrouter: 'https://openrouter.ai/api/v1/models',
};

/** 向第三方 HTTPS API 發送 GET 請求，回傳 Promise<{status, body}> */
function httpsGet(targetUrl, apiKey) {
    return new Promise((resolve, reject) => {
        const parsed = url.parse(targetUrl);
        const options = {
            hostname: parsed.hostname,
            path: parsed.path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'User-Agent': 'node-http/20',
            },
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });

        req.on('error', reject);
        req.end();
    });
}

/** 統一回傳 JSON 並附上 CORS 標頭 */
function sendJson(res, statusCode, data) {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    });
    res.end(body);
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // 處理瀏覽器的 CORS 預檢請求（OPTIONS）
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        });
        res.end();
        return;
    }

    // -------------------------------------------------------
    // 端點：GET /api/llm-models?provider=nvidia
    // 後端代為向 Provider 請求，前端完全不碰 NVIDIA/DeepSeek URL
    // -------------------------------------------------------
    if (pathname === '/api/llm-models' && req.method === 'GET') {
        const provider = parsedUrl.query.provider;
        const apiKey = (req.headers['authorization'] || '').replace('Bearer ', '').trim();

        if (!provider || !PROVIDER_MODELS_ENDPOINTS[provider]) {
            sendJson(res, 400, { error: `未知的 provider：${provider}` });
            return;
        }
        if (!apiKey) {
            sendJson(res, 400, { error: '缺少 API Key（Authorization 標頭）' });
            return;
        }

        const targetUrl = PROVIDER_MODELS_ENDPOINTS[provider];
        console.log(`[Models] Fetching ${provider} -> ${targetUrl}`);

        try {
            const { status, body } = await httpsGet(targetUrl, apiKey);
            console.log(`[Models] ${provider} responded ${status}`);

            if (status !== 200) {
                sendJson(res, status, { error: `Provider 回應 ${status}`, detail: body.slice(0, 300) });
                return;
            }

            // 直接透傳 JSON，加上 CORS 標頭
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            });
            res.end(body);
        } catch (err) {
            console.error(`[Models Error] ${err.message}`);
            sendJson(res, 502, { error: err.message });
        }
        return;
    }

    // -------------------------------------------------------
    // 端點：/api/cards
    // 動態掃描 cards 目錄並返回所有卡片內容
    // -------------------------------------------------------
    if (pathname === '/api/cards' && req.method === 'GET') {
        const type = parsedUrl.query.type;
        if (!type || !['characters', 'scenarios', 'maps'].includes(type)) {
            sendJson(res, 400, { error: '未知的 card 類型，必須為 characters, scenarios 或 maps' });
            return;
        }

        const cardsDir = path.join(__dirname, 'cards', type);
        fs.readdir(cardsDir, async (err, files) => {
            if (err) {
                console.error(`[Cards API Error] 無法讀取目錄 ${cardsDir}: ${err.message}`);
                sendJson(res, 500, { error: `無法讀取 ${type} 目錄` });
                return;
            }

            const jsonFiles = files.filter(f => f.endsWith('.json'));
            const cardPromises = jsonFiles.map(file => {
                return new Promise((resolve) => {
                    const filePath = path.join(cardsDir, file);
                    fs.readFile(filePath, 'utf8', (readErr, content) => {
                        if (readErr) {
                            console.warn(`[Cards API Warning] 無法讀取檔案 ${filePath}`);
                            resolve(null);
                        } else {
                            try {
                                resolve(JSON.parse(content));
                            } catch (parseErr) {
                                console.warn(`[Cards API Warning] 無法解析 JSON ${filePath}: ${parseErr.message}`);
                                resolve(null);
                            }
                        }
                    });
                });
            });

            const cards = (await Promise.all(cardPromises)).filter(Boolean);
            
            cards.sort((a, b) => {
                if (a.chapter !== undefined && b.chapter !== undefined) {
                    return a.chapter - b.chapter;
                }
                return (a.id || '').localeCompare(b.id || '');
            });

            sendJson(res, 200, cards);
        });
        return;
    }

    // -------------------------------------------------------
    // 端點：/api/proxy/HTTPS_URL
    // 後端通用的透明代理，解決前端呼叫外部 API 的 CORS 問題
    // -------------------------------------------------------
    if (pathname.startsWith('/api/proxy/')) {
        // 必須從原始 req.url（非解析後的 pathname）擷取目標 URL
        // 原因：url.parse() 會將路徑中的 https:// 的雙斜線押縮為單斜線
        const rawUrl    = req.url; // e.g. /api/proxy/https://openrouter.ai/...
        const targetUrl = rawUrl.slice('/api/proxy/'.length); // https://openrouter.ai/...
        const apiKey = (req.headers['authorization'] || '').replace('Bearer ', '').trim();

        console.log(`[Proxy] ${req.method} -> ${targetUrl}`);

        const parsedTarget = new URL(targetUrl);
        const options = {
            hostname: parsedTarget.hostname,
            port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
            path: parsedTarget.pathname + parsedTarget.search,
            method: req.method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': req.headers['content-type'] || 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'node-http/20',
            },
        };

        const requestModule = parsedTarget.protocol === 'http:' ? http : https;
        const proxyReq = requestModule.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, {
                ...proxyRes.headers,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            });
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`[Proxy Error] ${err.message}`);
            sendJson(res, 502, { error: `代理請求失敗：${err.message}` });
        });

        if (req.method === 'POST') {
            req.pipe(proxyReq);
        } else {
            proxyReq.end();
        }
        return;
    }

    // --- 靜態檔案服務 ---
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end(`Server error: ${error.code}`);
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(`  TRPG Adventure Engine Server Running`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`==========================================`);
});
