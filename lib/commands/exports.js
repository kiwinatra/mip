/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const { ExportsResolver } = require('../core/exports-resolver');
const { loadLangForCwd, getI18n } = require('../i18n');
const features = require('../utils/features');
const fs = require('fs');
const path = require('path');

async function exportsCommand(packageName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['exports.enabled'] === false) {
    console.log('ℹ️ Exports command is disabled (exports.enabled: false)');
    return;
  }

  if (!packageName) {
    console.log(t('commands.exports.usage'));
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnExports'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`📤 Get exports for "${packageName}"? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  const resolver = new ExportsResolver(process.cwd());
  
  // Проверка флагов
  const showJson = process.argv.includes('--json');
  const showDetails = process.argv.includes('--details') || process.argv.includes('-d');
  const showTree = process.argv.includes('--tree') || process.argv.includes('-t');

  const paths = resolver.getExportedPaths(packageName);

  if (paths.length === 0) {
    console.log(t('commands.exports.not_found', { package: packageName }));
    return;
  }

  // Получаем информацию о пакете
  let packageInfo = null;
  try {
    const manifest = require('../loader').loadManifest(process.cwd());
    if (manifest[packageName]) {
      packageInfo = manifest[packageName];
    }
  } catch (e) {
    // Игнорируем ошибки
  }

  if (showJson) {
    const result = {
      package: packageName,
      exports: paths.map(p => ({
        path: p,
        exists: resolver.hasExport(packageName, p)
      })),
      info: packageInfo || null
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(t('commands.exports.title', { package: packageName }));

  if (showDetails && packageInfo) {
    console.log(`\n📦 Version: ${packageInfo.version}`);
    console.log(`📁 Path: ${packageInfo.path}`);
    console.log(`🔗 Linked: ${packageInfo.linked ? 'Yes' : 'No'}`);
    console.log('');
  }

  // Группировка по типу
  if (showTree) {
    // Простое дерево
    const categories = {
      main: [],
      subpaths: [],
      conditions: []
    };

    for (const p of paths) {
      if (p === '.') {
        categories.main.push(p);
      } else if (p.startsWith('./') && p.split('/').length <= 3) {
        categories.subpaths.push(p);
      } else {
        categories.conditions.push(p);
      }
    }

    if (categories.main.length > 0) {
      console.log('  📦 Main exports:');
      for (const p of categories.main) {
        const exists = resolver.hasExport(packageName, p);
        console.log(`    ${exists ? '✅' : '❌'} ${p}`);
      }
    }

    if (categories.subpaths.length > 0) {
      console.log('\n  📁 Subpath exports:');
      for (const p of categories.subpaths) {
        const exists = resolver.hasExport(packageName, p);
        console.log(`    ${exists ? '✅' : '❌'} ${p}`);
      }
    }

    if (categories.conditions.length > 0) {
      console.log('\n  🔀 Conditional exports:');
      for (const p of categories.conditions) {
        const exists = resolver.hasExport(packageName, p);
        console.log(`    ${exists ? '✅' : '❌'} ${p}`);
      }
    }
  } else {
    // Обычный список с ограничением
    const maxDisplay = mipFeatures['exports.maxDisplay'] || 50;
    const displayPaths = paths.slice(0, maxDisplay);
    
    for (const p of displayPaths) {
      const exists = resolver.hasExport(packageName, p);
      const icon = exists ? '✅' : '❌';
      
      // Проверка на наличие дополнительной информации
      let extra = '';
      if (showDetails) {
        try {
          const fullPath = resolver.getFullPath(packageName, p);
          if (fullPath && fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath);
            extra = ` (${formatSize(stat.size)})`;
          }
        } catch (e) {
          // Игнорируем
        }
      }
      
      console.log(`  ${icon} ${p}${extra}`);
    }
    
    if (paths.length > maxDisplay) {
      console.log(`  ... and ${paths.length - maxDisplay} more exports`);
    }
  }

  // Подсказка
  if (!showTree && !showJson && mipFeatures['exports.showTreeHint'] !== false) {
    console.log(`\n💡 Use ${mipFeatures['cli.color'] !== false ? '--tree' : '--tree'} to see categorized exports`);
    console.log(`💡 Use ${mipFeatures['cli.color'] !== false ? '--details' : '--details'} to see file sizes`);
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = { exports: exportsCommand };