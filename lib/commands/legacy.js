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

// lib/commands/legacy.js
const fs = require('fs');
const path = require('path');
const { LegacyFallback } = require('../core/legacy-fallback');
const { loadLangForCwd, getI18n } = require('../i18n');
const features = require('../utils/features');

async function legacy(action, packageName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['legacy.enabled'] === false) {
    console.log('ℹ️ Legacy command is disabled (legacy.enabled: false)');
    return;
  }

  // Проверка interactive для опасных операций
  if (action === 'clean' || action === 'fix') {
    if (mipFeatures['interactive.promptOnLegacy'] !== false) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const actionLabel = action === 'clean' ? 'clean all legacy packages' : `fix "${packageName}"`;
      const answer = await new Promise(resolve => {
        rl.question(`🔄 ${actionLabel}? (y/N) `, resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Cancelled');
        return;
      }
    }
  }

  const fallback = new LegacyFallback(process.cwd());

  if (action === 'list') {
    console.log(t('commands.legacy.checking'));

    const mipDir = path.join(process.cwd(), '.mip');
    if (!fs.existsSync(mipDir)) {
      console.log(t('commands.legacy.no_packages'));
      return;
    }

    const packages = fs.readdirSync(mipDir);
    const legacyPackages = [];

    for (const pkg of packages) {
      if (fallback.isLegacyPackage(pkg)) {
        legacyPackages.push(pkg);
      }
    }

    if (legacyPackages.length === 0) {
      console.log(t('commands.legacy.none_found'));
    } else {
      // Сортировка по размеру
      const withSize = legacyPackages.map(pkg => {
        const pkgPath = path.join(mipDir, pkg);
        let size = 0;
        try {
          size = getDirSize(pkgPath);
        } catch (e) {}
        return { name: pkg, size };
      });
      
      withSize.sort((a, b) => b.size - a.size);
      
      console.log(t('commands.legacy.found_title', { count: withSize.length }));
      
      const showSize = mipFeatures['legacy.showSize'] !== false;
      const maxDisplay = mipFeatures['legacy.maxDisplay'] || 20;
      const display = withSize.slice(0, maxDisplay);
      
      for (const pkg of display) {
        if (showSize) {
          console.log(`  • ${pkg.name} (${formatSize(pkg.size)})`);
        } else {
          console.log(`  • ${pkg.name}`);
        }
      }
      
      if (withSize.length > maxDisplay) {
        console.log(`  ... and ${withSize.length - maxDisplay} more`);
      }
      
      if (mipFeatures['legacy.showFixHint'] !== false) {
        console.log(t('commands.legacy.fix_hint'));
      }
    }
    return;
  }

  if (action === 'fix' && packageName) {
    console.log(t('commands.legacy.fixing', { package: packageName }));
    
    // Проверяем, существует ли пакет
    const mipDir = path.join(process.cwd(), '.mip');
    if (!fs.existsSync(path.join(mipDir, packageName))) {
      console.log(`❌ Package "${packageName}" not found in .mip`);
      return;
    }
    
    const emulated = fallback.emulateDependencies(packageName);
    console.log(t('commands.legacy.fixed', { package: packageName, count: emulated }));
    
    // Сохраняем в конфиг как legacy dependency
    try {
      const config = require('../utils/config');
      const conf = config.readConfig(process.cwd());
      if (conf) {
        if (!conf.legacyDependencies) conf.legacyDependencies = {};
        conf.legacyDependencies[packageName] = {
          fixedAt: new Date().toISOString(),
          emulatedCount: emulated
        };
        config.writeConfig(conf, process.cwd());
        console.log(`✅ Added to config: ${packageName} as legacy dependency`);
      }
    } catch (e) {
      // Игнорируем ошибки записи
    }
    return;
  }

  if (action === 'clean') {
    const removed = fallback.cleanEmulation();
    console.log(t('commands.legacy.cleaned', { count: removed }));
    
    // Удаляем из конфига
    try {
      const config = require('../utils/config');
      const conf = config.readConfig(process.cwd());
      if (conf && conf.legacyDependencies) {
        const count = Object.keys(conf.legacyDependencies).length;
        delete conf.legacyDependencies;
        config.writeConfig(conf, process.cwd());
        console.log(`✅ Removed ${count} legacy entries from config`);
      }
    } catch (e) {
      // Игнорируем ошибки записи
    }
    return;
  }

  // Проверка флага --auto-fix
  if (action === 'auto-fix' || action === '--auto-fix') {
    console.log('🔧 Auto-fixing legacy packages...');
    const mipDir = path.join(process.cwd(), '.mip');
    if (!fs.existsSync(mipDir)) {
      console.log(t('commands.legacy.no_packages'));
      return;
    }

    const packages = fs.readdirSync(mipDir);
    let fixed = 0;
    
    for (const pkg of packages) {
      if (fallback.isLegacyPackage(pkg)) {
        const emulated = fallback.emulateDependencies(pkg);
        if (emulated > 0) {
          fixed++;
          console.log(`  ✅ Fixed ${pkg} (${emulated} dependencies emulated)`);
        }
      }
    }
    
    console.log(`\n✅ Auto-fixed ${fixed} legacy packages`);
    return;
  }

  console.log(t('commands.legacy.usage'));
}

function getDirSize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      size += getDirSize(p);
    } else {
      size += stat.size;
    }
  }
  return size;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = { legacy };