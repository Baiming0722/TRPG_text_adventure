// narrative/llm-provider.js
// LLM Provider 抽象層：DeepSeek 與 NVIDIA 實作

import { CONFIG } from '../js/config.js';

/** LLM Provider 基底類別 */
class LLMProvider {
  constructor(config) {
    this.config      = config;
    this.apiKey      = '';
    this.temperature = config.temperature;
    // 預設使用 config 中設定的模型，可由 setModel() 覆蓋
    this._model      = config.model;
    this._endpoint   = null;
  }

  setApiKey(key)       { this.apiKey = key; }
  setTemperature(temp) { this.temperature = temp; }
  setModel(model)      { this._model = model; }
  setEndpoint(url)     { this._endpoint = url; }
  getProviderName()    { return this.config.name; }
  getModel()           { return this._model; }
  getEndpoint()        { return this._endpoint ?? this.config.endpoint; }

  /** @param {{ system: string, messages: object[] }} prompt */
  async generateNarration(prompt) {
    throw new Error('LLMProvider.generateNarration 尚未實作');
  }
}

/** 通用 OpenAI 相容格式的 HTTP 呼叫實作 */
class OpenAICompatibleProvider extends LLMProvider {
  async generateNarration(prompt, options = {}) {
    if (!this.apiKey) throw new Error('請先設定 API Key');
    if (!this._model) throw new Error('請先選擇 AI 模型（點擊設定 → 取得模型 → 選擇）');

    const messages = [
      { role: 'system', content: prompt.system },
      ...prompt.messages,
    ];

    // 若有自訂 endpoint 則優先使用，並確保路徑正確
    let requestUrl = this.config.endpoint;
    if (this._endpoint) {
      requestUrl = this._endpoint.replace(/\/$/, '');
      if (this.config.name === 'Ollama' && !requestUrl.endsWith('/v1/chat/completions')) {
        requestUrl = `${requestUrl}/v1/chat/completions`;
      }
    }

    if (!requestUrl.startsWith('/api/proxy/')) {
      requestUrl = `/api/proxy/${requestUrl}`;
    }

    const requestMeta = {
      provider: this.config.name,
      model: this._model,
      endpoint: requestUrl,
      messageCount: messages.length,
      maxTokens: this.config.maxTokens,
      temperature: this.temperature,
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this._model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.temperature,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const error = new Error(`API 回應錯誤 ${response.status}: ${errorBody.slice(0, 300)}`);
      error.name = 'LLMHttpError';
      error.llmDetails = {
        ...requestMeta,
        status: response.status,
        statusText: response.statusText,
        responseBody: errorBody.slice(0, 2000),
      };
      throw error;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    return { success: true, content, meta: requestMeta };
  }
}

/** DeepSeek Provider */
class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor() {
    super(CONFIG.LLM.PROVIDERS.deepseek);
  }
}

/** NVIDIA NIM Provider */
class NvidiaProvider extends OpenAICompatibleProvider {
  constructor() {
    super(CONFIG.LLM.PROVIDERS.nvidia);
  }
}

/** Ollama Provider */
class OllamaProvider extends OpenAICompatibleProvider {
  constructor() {
    super(CONFIG.LLM.PROVIDERS.ollama);
  }
}

/** OpenRouter Provider */
class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor() {
    super(CONFIG.LLM.PROVIDERS.openrouter);
  }
}

/** Provider 工廠 */
const _providers = {
  deepseek: new DeepSeekProvider(),
  nvidia: new NvidiaProvider(),
  ollama: new OllamaProvider(),
  openrouter: new OpenRouterProvider(),
};

let _currentProviderId = CONFIG.LLM.DEFAULT_PROVIDER;

export function getProvider(providerId) {
  return _providers[providerId] ?? _providers[CONFIG.LLM.DEFAULT_PROVIDER];
}

export function getCurrentProvider() {
  return _providers[_currentProviderId];
}

export function setCurrentProvider(providerId) {
  if (_providers[providerId]) {
    _currentProviderId = providerId;
  }
}

export function setApiKey(providerId, key) {
  if (_providers[providerId]) {
    _providers[providerId].setApiKey(key);
  }
}

export function setTemperature(temp) {
  Object.values(_providers).forEach(p => p.setTemperature(temp));
}

/** 設定指定 provider 的使用模型 */
export function setModel(providerId, model) {
  if (_providers[providerId]) {
    _providers[providerId].setModel(model);
  }
}

export function setEndpoint(providerId, url) {
  if (_providers[providerId]) {
    _providers[providerId].setEndpoint(url);
  }
}

export function getProviderList() {
  return Object.entries(CONFIG.LLM.PROVIDERS).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    model: cfg.model,
  }));
}
