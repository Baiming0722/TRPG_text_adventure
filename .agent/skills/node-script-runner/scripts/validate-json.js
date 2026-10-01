#!/usr/bin/env node

/**
 * 通用 JSON 結構與交叉引用驗證腳本
 * 用法: node validate-json.js --project-root <path>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const rootArgIndex = args.indexOf('--project-root');
const projectRoot = rootArgIndex !== -1 ? args[rootArgIndex + 1] : process.cwd();

const cardsDir = path.join(projectRoot, 'cards');

if (!fs.existsSync(cardsDir)) {
    console.error(`[FAIL] 找不到 cards 目錄：${cardsDir}`);
    process.exit(1);
}

let hasError = false;
let hasWarn = false;

function readJsonFiles(subDir) {
    const dirPath = path.join(cardsDir, subDir);
    if (!fs.existsSync(dirPath)) return [];
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const results = [];
    
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const data = JSON.parse(content);
            results.push({ file, data, fullPath });
        } catch (e) {
            console.error(`[FAIL] ❌ 解析失敗 ${subDir}/${file}: ${e.message}`);
            hasError = true;
        }
    }
    return results;
}

console.log(`\n🔍 開始驗證 Card JSON 資料...\n`);

const events = readJsonFiles('events');
const maps = readJsonFiles('maps');
const scenarios = readJsonFiles('scenarios');
const characters = readJsonFiles('characters');

const eventIds = new Set(events.map(e => e.data.id));
const mapIds = new Set(maps.map(m => m.data.id));

// 1. 基本屬性檢查
function checkBasicFields(category, items, requiredFields) {
    console.log(`👉 檢查 ${category}...`);
    for (const item of items) {
        for (const field of requiredFields) {
            if (item.data[field] === undefined) {
                console.error(`  [FAIL] ❌ ${item.file} 缺少必填欄位: ${field}`);
                hasError = true;
            }
        }
        if (item.data.id && !item.file.includes(item.data.id)) {
            console.warn(`  [WARN] ⚠️ ${item.file} 檔名與 ID (${item.data.id}) 不一致`);
            hasWarn = true;
        }
    }
}

checkBasicFields('Events', events, ['id', 'title']);
checkBasicFields('Maps', maps, ['id', 'name', 'nodes']);
checkBasicFields('Scenarios', scenarios, ['id', 'title', 'starting_node']);
checkBasicFields('Characters', characters, ['id', 'name', 'class', 'stats']);

// 2. 交叉引用檢查
console.log(`\n👉 檢查交叉引用...`);

for (const sc of scenarios) {
    if (sc.data.available_map && !mapIds.has(sc.data.available_map)) {
        console.error(`  [FAIL] ❌ ${sc.file} 引用的地圖不存在: ${sc.data.available_map}`);
        hasError = true;
    }
    if (sc.data.key_events) {
        for (const evtId of sc.data.key_events) {
            if (!eventIds.has(evtId)) {
                console.error(`  [FAIL] ❌ ${sc.file} 引用的事件不存在: ${evtId}`);
                hasError = true;
            }
        }
    }
}

for (const map of maps) {
    const nodes = map.data.nodes || [];
    const nodeIds = new Set(nodes.map(n => n.id));
    
    for (const node of nodes) {
        if (node.events) {
            for (const evtId of node.events) {
                if (!eventIds.has(evtId)) {
                    console.error(`  [FAIL] ❌ ${map.file} 節點 ${node.id} 引用的事件不存在: ${evtId}`);
                    hasError = true;
                }
            }
        }
        if (node.connections) {
            for (const connId of node.connections) {
                if (!nodeIds.has(connId)) {
                    console.error(`  [FAIL] ❌ ${map.file} 節點 ${node.id} 指向了不存在的節點: ${connId}`);
                    hasError = true;
                }
            }
        }
    }
}

console.log(`\n📊 驗證結果: ${hasError ? '失敗 ❌' : (hasWarn ? '警告 ⚠️' : '通過 ✅')}`);
if (hasError) process.exit(1);
process.exit(0);
