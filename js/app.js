// js/app.js
// 應用進入點：初始化引擎與 UI，顯示開始流程

import { gameEngine } from './game-engine.js';
import { UIManager } from '../ui/ui-manager.js';
import { CONFIG } from './config.js';
import { gameState } from './game-state.js';
import { audioManager } from '../audio/audio-manager.js';

async function init() {
  // 初始化遊戲引擎
  gameEngine.init();

  // 初始化音訊管理器；實際播放會延遲到使用者第一次互動後解鎖
  audioManager.init();

  // 套用預設主題
  document.documentElement.setAttribute('data-theme', gameState.get('currentTheme') ?? CONFIG.DEFAULT_THEME);

  // 初始化 UI 管理器
  const uiManager = new UIManager();

  // 顯示開始 Modal
  await uiManager.showStartModal();
}

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', init);
