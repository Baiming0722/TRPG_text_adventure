#!/usr/bin/env node

/**
 * 骰子機率模擬器
 * 模擬 TRPG 判定系統的機率分佈
 * 用法: node dice-simulator.js --rolls 10000 --class "工人" --tags "combat" --luck 50
 */

const args = process.argv.slice(2);

// 解析參數
let rolls = 10000;
let charClass = '普通人';
let tags = [];
let luck = 50;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rolls') rolls = parseInt(args[++i], 10) || 10000;
    if (args[i] === '--class') charClass = args[++i];
    if (args[i] === '--tags') tags = args[++i].split(',');
    if (args[i] === '--luck') luck = parseInt(args[++i], 10) || 50;
}

// 模擬遊戲內的 CONFIG 設定
const CONFIG_DICE = {
    RESULT_TABLE: [
        { min: 15, max: 99, label: '大成功', outcome: 'critical_success' },
        { min: 11, max: 14, label: '成功',   outcome: 'success' },
        { min: 8,  max: 10, label: '部分成功', outcome: 'partial_success' },
        { min: 5,  max: 7,  label: '失敗',   outcome: 'failure' },
        { min: 2,  max: 4,  label: '大失敗', outcome: 'critical_failure' }
    ],
    CLASS_BONUS_MAP: {
        '學生':  { explore: 2, talk: 1, combat: 0 },
        '教師':  { talk: 3, explore: 1, combat: 0 },
        '工人':  { combat: 3, explore: 1, talk: 0 },
        '工程師':{ explore: 3, talk: 1, combat: 0 },
        '普通人':{ explore: 1, talk: 1, combat: 1 }
    }
};

// 計算加成
function getClassBonus(cls, actionTags) {
    const map = CONFIG_DICE.CLASS_BONUS_MAP[cls] || {};
    let max = 0;
    for (const t of actionTags) {
        if (map[t] > max) max = map[t];
    }
    return max;
}

const classBonus = getClassBonus(charClass, tags);
let luckModifier = 0;
if (luck > 70) luckModifier = 2;
if (luck < 30) luckModifier = -3;

console.log(`\n🎲 開始模擬 ${rolls} 次判定...`);
console.log(`- 職業加成 (${charClass}): +${classBonus}`);
console.log(`- 幸運修正 (LUCK ${luck}): ${luckModifier > 0 ? '+' : ''}${luckModifier}`);
const totalBonus = classBonus + luckModifier;

const results = {
    'critical_success': 0,
    'success': 0,
    'partial_success': 0,
    'failure': 0,
    'critical_failure': 0,
    'unknown': 0
};

// 擲骰函數
function rollDice() {
    const r1 = Math.floor(Math.random() * 6) + 1;
    const r2 = Math.floor(Math.random() * 6) + 1;
    return r1 + r2;
}

for (let i = 0; i < rolls; i++) {
    const diceTotal = rollDice();
    const actionValue = diceTotal + totalBonus;
    
    let outcome = 'unknown';
    for (const entry of CONFIG_DICE.RESULT_TABLE) {
        if (actionValue >= entry.min && actionValue <= entry.max) {
            outcome = entry.outcome;
            break;
        }
    }
    results[outcome]++;
}

console.log(`\n📊 模擬結果分佈：`);
for (const entry of CONFIG_DICE.RESULT_TABLE) {
    const count = results[entry.outcome];
    const pct = ((count / rolls) * 100).toFixed(2);
    console.log(`- ${entry.label.padEnd(6, ' ')} (${entry.outcome.padEnd(16, ' ')}): ${String(count).padStart(5, ' ')} 次 (${pct}%)`);
}

if (results['unknown'] > 0) {
    console.error(`\n[FAIL] ❌ 發現 ${results['unknown']} 次未被分類的結果！請檢查 CONFIG_DICE.RESULT_TABLE 是否有漏洞。`);
    process.exit(1);
}

console.log(`\n[PASS] ✅ 模擬完成，結果合理。`);
process.exit(0);
