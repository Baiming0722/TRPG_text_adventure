#!/usr/bin/env node

/**
 * JS Import 路徑檢查器
 * 掃描所有 JS 檔案的 import 語句，確保檔案存在
 * 用法: node check-imports.js --project-root <path>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const rootArgIndex = args.indexOf('--project-root');
const projectRoot = rootArgIndex !== -1 ? args[rootArgIndex + 1] : process.cwd();

const jsDir = path.join(projectRoot, 'js');
const otherDirs = ['character', 'combat', 'dice', 'event', 'map', 'narrative', 'save', 'ui'];

let hasError = false;

function scanDirectory(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(scanDirectory(fullPath));
        } else if (item.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

const allJsFiles = [];
if (fs.existsSync(jsDir)) allJsFiles.push(...scanDirectory(jsDir));
for (const d of otherDirs) {
    const dPath = path.join(projectRoot, d);
    if (fs.existsSync(dPath)) allJsFiles.push(...scanDirectory(dPath));
}

console.log(`\n🔍 開始驗證 ${allJsFiles.length} 個 JS 檔案的 import 路徑...\n`);

const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

for (const file of allJsFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const dir = path.dirname(file);
    
    let match;
    const checkPath = (importPath) => {
        // 跳過外部套件 (非 ./ 或 ../ 開頭)
        if (!importPath.startsWith('.')) return;
        
        let targetPath = path.resolve(dir, importPath);
        
        // 若省略 .js，試著加上
        if (!targetPath.endsWith('.js') && !fs.existsSync(targetPath)) {
            targetPath += '.js';
        }
        
        if (!fs.existsSync(targetPath)) {
            console.error(`[FAIL] ❌ ${path.relative(projectRoot, file)}`);
            console.error(`       找不到匯入目標: ${importPath}`);
            hasError = true;
        }
    };
    
    while ((match = importRegex.exec(content)) !== null) {
        checkPath(match[1]);
    }
    while ((match = dynamicImportRegex.exec(content)) !== null) {
        checkPath(match[1]);
    }
}

console.log(`\n📊 驗證結果: ${hasError ? '發現斷鏈 ❌' : '全部正確 ✅'}`);
if (hasError) process.exit(1);
process.exit(0);
