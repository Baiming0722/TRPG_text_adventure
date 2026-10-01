// audio/audio-manager.js
// Local BGM and SFX system. Audio unlock is delayed until the first user gesture.

import { CONFIG } from '../js/config.js';
import { eventBus, GameEvent } from '../js/event-bus.js';
import { gameState } from '../js/game-state.js';

const SUCCESS_OUTCOMES = new Set(['critical_success', 'success', 'partial_success']);

function clamp01(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(1, Math.max(0, num));
}

class AudioManager {
  constructor() {
    this._initialized = false;
    this._unlocked = false;
    this._context = null;
    this._sfxBuffers = new Map();
    this._sfxLoading = new Map();
    this._htmlSfxPool = new Map();
    this._bgmSlots = [];
    this._activeBgmSlot = 0;
    this._currentBgmStyle = null;
    this._currentBgmSource = null;
    this._fadeTimer = null;
    this._settings = this._buildDefaultSettings();
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;
    this._settings = this._readSettings();
    gameState.update({ audioSettings: this._settings }, true);
    this._bindUnlock();
    this._bindEvents();
  }

  async unlock() {
    if (this._unlocked || !this._settings.enabled) return;
    this._unlocked = true;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this._context = new AudioContextClass();
      if (this._context.state === 'suspended') {
        await this._context.resume().catch(() => {});
      }
    }

    this._bgmSlots = [this._createBgmElement(), this._createBgmElement()];
    this._preloadCoreSfx();
    this._ensureCurrentBgm();
    this._scheduleIdleBgmPreload();
  }

  playSfx(id, options = {}) {
    if (!this._canPlaySfx(id)) return;
    if (this._context) {
      this._playBufferedSfx(id, options);
      return;
    }
    this._playHtmlSfx(id, options);
  }

  playBgm(styleId) {
    if (!this._unlocked || !this._settings.enabled) return;
    const track = CONFIG.AUDIO.BGM_STYLES[styleId];
    if (!track?.source) return;
    if (this._currentBgmSource === track.source && !this._getActiveBgm()?.paused) return;

    this._currentBgmStyle = styleId;
    this._currentBgmSource = track.source;

    if (this._settings.muted || this._settings.bgmVolume <= 0) {
      return;
    }

    const current = this._getActiveBgm();
    const nextSlot = this._activeBgmSlot === 0 ? 1 : 0;
    const next = this._bgmSlots[nextSlot] ?? this._createBgmElement();
    this._bgmSlots[nextSlot] = next;

    next.src = track.source;
    next.currentTime = 0;
    next.loop = true;
    next.volume = 0;

    next.play()
      .then(() => {
        this._activeBgmSlot = nextSlot;
        this._crossfade(current, next, this._settings.bgmVolume);
      })
      .catch((error) => {
        console.warn(`[AudioManager] BGM 播放失敗：${styleId}`, error);
      });
  }

  stopBgm() {
    this._currentBgmStyle = null;
    this._currentBgmSource = null;
    this._bgmSlots.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
    });
  }

  updateSettings(patch = {}) {
    const next = this._normalizeSettings({ ...this._settings, ...patch });
    this._settings = next;
    this._persistSettings();
    gameState.update({ audioSettings: next }, true);
    this._applySettings();
  }

  getSettings() {
    return { ...this._settings };
  }

  _bindEvents() {
    eventBus.on(GameEvent.AUDIO_PLAY_SFX, ({ sfx, id, options } = {}) => {
      this.playSfx(sfx ?? id, options);
    });
    eventBus.on(GameEvent.AUDIO_PLAY_BGM, ({ style, track } = {}) => {
      this.playBgm(style ?? track);
    });
    eventBus.on(GameEvent.AUDIO_STOP_BGM, () => this.stopBgm());
    eventBus.on(GameEvent.AUDIO_SETTINGS_CHANGED, (patch = {}) => this.updateSettings(patch));

    eventBus.on(GameEvent.THEME_CHANGED, ({ theme } = {}) => {
      if (this._settings.bgmMode === 'follow-theme') {
        this.playBgm(theme ?? gameState.get('currentTheme') ?? CONFIG.DEFAULT_THEME);
      }
    });
    eventBus.on(GameEvent.NEW_GAME_STARTED, () => this._ensureCurrentBgm());
    eventBus.on(GameEvent.LOAD_DONE, () => {
      this.playSfx('load_success');
      this._ensureCurrentBgm();
    });
    eventBus.on(GameEvent.SAVE_DONE, ({ success } = {}) => {
      this.playSfx(success ? 'save_success' : 'system_error');
    });
    eventBus.on(GameEvent.ACTION_SELECTED, () => this.playSfx('event_select'));
    eventBus.on(GameEvent.UI_LOADING, () => this.playSfx('llm_thinking'));
    eventBus.on(GameEvent.SCENE_DISPLAYED, () => this.playSfx('llm_output'));
    eventBus.on(GameEvent.LLM_ERROR, () => this.playSfx('system_error'));
    eventBus.on(GameEvent.GAME_ENDED, () => {
      this.playSfx('game_ending');
      this._fadeOutBgm();
    });
    eventBus.on(GameEvent.DICE_PENDING, () => {
      this.playSfx('dice_roll');
    });
    eventBus.on(GameEvent.DICE_REVEALED, (data) => {
      const result = data?.result ?? data;
      this.playSfx(SUCCESS_OUTCOMES.has(result?.outcome) ? 'dice_success' : 'dice_failure');
    });

    document.addEventListener('click', (event) => this._handleDocumentClick(event), true);
    window.addEventListener('error', () => this.playSfx('system_error'));
    window.addEventListener('unhandledrejection', () => this.playSfx('system_error'));
  }

  _bindUnlock() {
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
  }

  _handleDocumentClick(event) {
    const target = event.target?.closest?.('button, select, .mode-card, .theme-card, .char-card, .save-btn, .drawer-close-btn');
    if (!target || target.disabled || target.closest('[data-audio-control="true"]')) return;
    this.playSfx('ui_click');
  }

  _canPlaySfx(id) {
    return Boolean(
      id &&
      this._unlocked &&
      this._settings.enabled &&
      !this._settings.muted &&
      this._settings.sfxVolume > 0 &&
      CONFIG.AUDIO.SFX[id]
    );
  }

  async _playBufferedSfx(id, options = {}) {
    try {
      const buffer = await this._loadSfxBuffer(id);
      if (!buffer || !this._context) return;
      const source = this._context.createBufferSource();
      const gain = this._context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = options.playbackRate ?? 1;
      gain.gain.value = clamp01(options.volume ?? 1, 1) * this._settings.sfxVolume;
      source.connect(gain);
      gain.connect(this._context.destination);
      source.start(0);
    } catch (error) {
      console.warn(`[AudioManager] SFX 播放失敗：${id}`, error);
      this._playHtmlSfx(id, options);
    }
  }

  async _loadSfxBuffer(id) {
    if (this._sfxBuffers.has(id)) return this._sfxBuffers.get(id);
    if (this._sfxLoading.has(id)) return this._sfxLoading.get(id);

    const source = CONFIG.AUDIO.SFX[id];
    const loading = fetch(source)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => this._context.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        this._sfxBuffers.set(id, buffer);
        this._sfxLoading.delete(id);
        return buffer;
      })
      .catch((error) => {
        this._sfxLoading.delete(id);
        throw error;
      });

    this._sfxLoading.set(id, loading);
    return loading;
  }

  _playHtmlSfx(id, options = {}) {
    const source = CONFIG.AUDIO.SFX[id];
    if (!source) return;
    let pool = this._htmlSfxPool.get(id);
    if (!pool) {
      pool = Array.from({ length: 4 }, () => {
        const audio = new Audio(source);
        audio.preload = 'auto';
        return audio;
      });
      this._htmlSfxPool.set(id, pool);
    }

    const audio = pool.find((item) => item.paused) ?? pool[0];
    audio.currentTime = 0;
    audio.volume = clamp01(options.volume ?? 1, 1) * this._settings.sfxVolume;
    audio.playbackRate = options.playbackRate ?? 1;
    audio.play().catch((error) => console.warn(`[AudioManager] HTML SFX 播放失敗：${id}`, error));
  }

  _createBgmElement() {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0;
    return audio;
  }

  _getActiveBgm() {
    return this._bgmSlots[this._activeBgmSlot] ?? null;
  }

  _crossfade(from, to, targetVolume) {
    window.clearInterval(this._fadeTimer);
    const duration = CONFIG.AUDIO.fadeMs;
    const startedAt = performance.now();
    const startFromVolume = from?.volume ?? 0;

    this._fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      to.volume = targetVolume * progress;
      if (from) from.volume = startFromVolume * (1 - progress);

      if (progress >= 1) {
        window.clearInterval(this._fadeTimer);
        to.volume = targetVolume;
        if (from) {
          from.pause();
          from.currentTime = 0;
          from.volume = 0;
        }
      }
    }, 50);
  }

  _fadeOutBgm() {
    const active = this._getActiveBgm();
    if (!active || active.paused) return;
    const startVolume = active.volume;
    const startedAt = performance.now();
    window.clearInterval(this._fadeTimer);
    this._fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / CONFIG.AUDIO.fadeMs);
      active.volume = startVolume * (1 - progress);
      if (progress >= 1) {
        window.clearInterval(this._fadeTimer);
        active.pause();
        active.volume = 0;
      }
    }, 50);
  }

  _applySettings() {
    const active = this._getActiveBgm();
    if (this._settings.muted || !this._settings.enabled || this._settings.bgmVolume <= 0) {
      this._bgmSlots.forEach((audio) => audio.pause());
      return;
    }
    const desiredStyle = this._getDesiredBgmStyle();
    if (desiredStyle !== this._currentBgmStyle || !active?.src) {
      this._currentBgmSource = null;
      this.playBgm(desiredStyle);
      return;
    }
    if (active && this._currentBgmSource) {
      active.volume = this._settings.bgmVolume;
      active.play().catch(() => {});
      return;
    }
    this._ensureCurrentBgm();
  }

  _ensureCurrentBgm() {
    this.playBgm(this._getDesiredBgmStyle());
  }

  _getDesiredBgmStyle() {
    const theme = gameState.get('currentTheme') ?? CONFIG.DEFAULT_THEME;
    const style = this._settings.bgmMode === 'follow-theme' ? theme : this._settings.bgmStyle;
    return CONFIG.AUDIO.BGM_STYLES[style] ? style : CONFIG.DEFAULT_THEME;
  }

  _preloadCoreSfx() {
    if (!this._context) return;
    Object.keys(CONFIG.AUDIO.SFX).forEach((id) => {
      this._loadSfxBuffer(id).catch((error) => console.warn(`[AudioManager] SFX 預載失敗：${id}`, error));
    });
  }

  _scheduleIdleBgmPreload() {
    const preload = () => {
      Object.values(CONFIG.AUDIO.BGM_STYLES).forEach((track) => {
        if (!track.source) return;
        const audio = new Audio(track.source);
        audio.preload = 'metadata';
      });
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preload, { timeout: CONFIG.AUDIO.preloadDelayMs });
    } else {
      window.setTimeout(preload, CONFIG.AUDIO.preloadDelayMs);
    }
  }

  _readSettings() {
    const defaults = this._buildDefaultSettings();
    try {
      const raw = localStorage.getItem(CONFIG.AUDIO.STORAGE_KEY);
      return this._normalizeSettings(raw ? { ...defaults, ...JSON.parse(raw) } : defaults);
    } catch (error) {
      console.warn('[AudioManager] 無法讀取音訊設定', error);
      return defaults;
    }
  }

  _persistSettings() {
    try {
      localStorage.setItem(CONFIG.AUDIO.STORAGE_KEY, JSON.stringify(this._settings));
    } catch (error) {
      console.warn('[AudioManager] 無法儲存音訊設定', error);
    }
  }

  _buildDefaultSettings() {
    return {
      enabled: CONFIG.AUDIO.enabled,
      muted: CONFIG.AUDIO.muted,
      bgmVolume: CONFIG.AUDIO.bgmVolume,
      sfxVolume: CONFIG.AUDIO.sfxVolume,
      bgmMode: CONFIG.AUDIO.bgmMode,
      bgmStyle: CONFIG.AUDIO.bgmStyle,
    };
  }

  _normalizeSettings(settings) {
    const style = CONFIG.AUDIO.BGM_STYLES[settings.bgmStyle] ? settings.bgmStyle : CONFIG.AUDIO.bgmStyle;
    return {
      enabled: settings.enabled !== false,
      muted: Boolean(settings.muted),
      bgmVolume: clamp01(settings.bgmVolume, CONFIG.AUDIO.bgmVolume),
      sfxVolume: clamp01(settings.sfxVolume, CONFIG.AUDIO.sfxVolume),
      bgmMode: settings.bgmMode === 'manual' ? 'manual' : 'follow-theme',
      bgmStyle: style,
    };
  }
}

export const audioManager = new AudioManager();
