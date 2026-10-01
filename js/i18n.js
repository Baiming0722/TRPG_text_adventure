// js/i18n.js
// 多語系字串集中管理，未來可擴充 en-US 等語系

const strings = {
  'zh-TW': {
    // 通用
    'app.title': '命運回廊',
    'app.subtitle': 'TRPG 文字冒險遊戲',

    // 按鈕
    'btn.new_game': '新遊戲',
    'btn.continue': '繼續遊戲',
    'btn.save': '存檔',
    'btn.load': '讀檔',
    'btn.confirm': '確認',
    'btn.cancel': '取消',
    'btn.close': '關閉',
    'btn.export': '匯出存檔',
    'btn.import': '匯入存檔',
    'btn.delete': '刪除',
    'btn.back': '返回',
    'btn.start': '開始冒險',
    'btn.pause_monitor': '暫停更新',
    'btn.resume_monitor': '繼續更新',
    'btn.export_state': '匯出狀態',

    // 模式選擇
    'mode.select.title': '選擇遊玩模式',
    'mode.normal': '一般模式',
    'mode.normal.desc': '標準遊戲體驗，均衡的難度與劇情深度。',
    'mode.speedrun': '速通模式',
    'mode.speedrun.desc': '更快的劇情推進節奏，適合追求效率的玩家。',
    'mode.collect': '蒐集探索模式',
    'mode.collect.desc': '完整探索模式，顯示探索紀錄與事件提示。',
    'mode.test': '測試模式',
    'mode.test.desc': '需要密碼。可直接設定數值與強制觸發事件。',
    'mode.test.password': '請輸入測試密碼：',
    'mode.test.password.error': '密碼錯誤，請重試。',

    // 角色選擇
    'char.select.title': '選擇你的角色',
    'char.name': '角色名稱',
    'char.class': '職業',
    'char.background': '背景',
    'char.stats': '基本屬性',
    'char.skills': '技能',

    // 屬性名稱
    'stat.STR': '力量',
    'stat.DEX': '敏捷',
    'stat.INT': '智力',
    'stat.POW': '意志',
    'stat.MOV': '移動力',
    'stat.HP': '生命值',
    'stat.SAN': '理智',
    'stat.LUCK': '幸運',

    // 面板標題
    'panel.character': '角色資訊',
    'panel.map': '地圖',
    'panel.log': '遊戲紀錄',
    'panel.explore': '探索紀錄',
    'panel.test': '測試面板',
    'panel.save': '存檔管理',

    // 存檔
    'save.slot': '存檔槽',
    'save.auto': '自動存檔',
    'save.empty': '（空）',
    'save.confirm_load': '確定要讀取此存檔？目前的進度將會遺失。',
    'save.confirm_delete': '確定要刪除此存檔？此操作無法復原。',
    'save.success': '存檔成功',
    'save.load_success': '讀檔成功',
    'save.delete_success': '已刪除存檔',
    'save.no_data': '沒有存檔資料',
    'save.version_mismatch': '存檔版本不相容，無法載入。',

    // 判定結果
    'dice.result.critical_success': '⭐ 大成功！',
    'dice.result.success': '✅ 成功',
    'dice.result.partial_success': '⚠️ 部分成功',
    'dice.result.failure': '❌ 失敗',
    'dice.result.critical_failure': '💀 大失敗！',

    // 判定詳情
    'dice.roll': '擲骰',
    'dice.class_bonus': '職業加成',
    'dice.skill_bonus': '技能加成',
    'dice.status_modifier': '狀態修正',
    'dice.luck_modifier': '幸運修正',
    'dice.action_value': '行動值',

    // 戰鬥
    'combat.start': '⚔️ 戰鬥開始',
    'combat.player_attack': '玩家攻擊',
    'combat.enemy_attack': '敵人反擊',
    'combat.damage': '造成傷害',
    'combat.victory': '🏆 戰鬥勝利！',
    'combat.defeat': '💀 戰鬥失敗...',
    'combat.enemy': '敵人',
    'combat.enemy_hp': '敵人 HP',

    // 結局
    'ending.success': '🏆 成功結局',
    'ending.failure': '💀 失敗結局',
    'ending.normal': '📖 普通結局',
    'ending.open': '🌟 開放結局',
    'ending.message.success': '你成功完成了任務！',
    'ending.message.failure': '你倒下了... 但這不是終點。',
    'ending.message.normal': '你離開了這裡，但心中留下了未解的謎。',
    'ending.message.open': '你的故事還沒結束，未來等著你去書寫。',
    'ending.save_char': '將此角色儲存為新角色卡',

    // 錯誤
    'error.llm_failed': '⚠️ AI 敘述引擎無回應，已啟用備援模式。',
    'error.load_card': '無法載入資料卡：',
    'error.api_key_missing': '請先設定 API Key。',
    'error.network': '網路連線錯誤，請檢查網路狀態。',
    'error.json_parse': 'AI 回應格式錯誤，已使用備援描述。',

    // LLM 載入
    'loading.thinking': 'AI 正在思考中...',
    'loading.scene': '場景生成中...',
    'loading.combat': '戰鬥解算中...',

    // 新手引導
    'tutorial.step1.title': '歡迎來到命運回廊',
    'tutorial.step1.content': '這是一款由 AI 擔任 GM 的 TRPG 文字冒險遊戲。',
    'tutorial.step2.title': '場景描述',
    'tutorial.step2.content': 'AI 會根據你的行動生成故事描述。',
    'tutorial.step3.title': '行動選項',
    'tutorial.step3.content': '點擊下方的選項按鈕來做出決策。',
    'tutorial.step4.title': '角色面板',
    'tutorial.step4.content': '右側顯示你的角色狀態，注意 HP 和 SAN 值。',
    'tutorial.step5.title': '存檔',
    'tutorial.step5.content': '隨時點擊右上角的存檔按鈕保存進度。',
    'tutorial.done': '開始冒險！',

    // 設定
    'settings.title': '設定',
    'settings.api_key': 'API Key',
    'settings.provider': 'LLM 提供者',
    'settings.temperature': '創意度（Temperature）',
    'settings.theme': '色彩主題',
    'settings.save_settings': '儲存設定',

    // 探索紀錄
    'explore.events_triggered': '已觸發事件',
    'explore.locations_visited': '已探索地點',
    'explore.flags': '遊戲旗標',
    'explore.none': '（尚無紀錄）',

    // 測試面板
    'test.force_dice': '強制骰子值',
    'test.set_stat': '設定屬性',
    'test.trigger_event': '強制觸發事件',
    'test.set_flag': '設定旗標',
    'test.apply': '套用',

    // 地圖
    'map.current': '當前位置',
    'map.explored': '已探索',
    'map.locked': '鎖定',
    'map.accessible': '可通行',
    'map.unknown': '未探索',

    // 自動存檔
    'autosave.notice': '自動存檔已更新',
  },

  // 預留 en-US 語系（未來擴充）
  'en-US': {
    'app.title': 'Corridor of Fate',
  },
};

/** 當前語系 */
let currentLocale = 'zh-TW';

/**
 * 取得翻譯字串
 * @param {string} key - 字串 key
 * @param {...string} args - 替換參數（使用 {0}, {1} 佔位）
 * @returns {string}
 */
export function t(key, ...args) {
  const locale = strings[currentLocale] || strings['zh-TW'];
  let text = locale[key] ?? strings['zh-TW'][key] ?? key;
  args.forEach((arg, i) => {
    text = text.replace(`{${i}}`, arg);
  });
  return text;
}

/** 切換語系 */
export function setLocale(locale) {
  if (strings[locale]) {
    currentLocale = locale;
  }
}

export function getCurrentLocale() {
  return currentLocale;
}
