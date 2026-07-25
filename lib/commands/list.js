/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const store = require('../utils/store');
const { loadLangForCwd, getI18n } = require('../i18n');
const loader = require('../loader');
const config = require('../utils/config');
const features = require('../utils/features');

function list() {
  const cwd = process.cwd();
  const { t } = getI18n(loadLangForCwd(cwd));
  const mipFeatures = features.loadFeatures(cwd);

  // Проверка включена ли команда
  if (mipFeatures['list.enabled'] === false) {
    console.log('ℹ️ List command is disabled (list.enabled: false)');
    return;
  }

  // Определяем конфиг
  const cfg = config.detectConfig(cwd);
  if (!cfg) {
    console.log(t('commands.list.no_config'));
    return;
  }

  const conf = config.readConfig(cwd);

  console.log('\n' + t('commands.list.installed_packages') + '\n');

  // Проверка флага --json
  const isJson = process.argv.includes('--json');

  // Читаем из манифеста
  const manifest = loader.loadManifest(cwd);
  const manifestPackages = Object.keys(manifest);

  if (isJson) {
    const result = {
      packages: manifestPackages.map(name => ({
        name,
        version: manifest[name].version,
        path: manifest[name].path,
        linked: manifest[name].linked || false,
        installed: manifest[name].installed
      })),
      total: manifestPackages.length,
      config: {
        dependencies: Object.keys(conf?.dependencies || {}).length,
        devDependencies: Object.keys(conf?.devDependencies || {}).length
      }
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Сортировка
  const sortBy = mipFeatures['list.sortBy'] || 'name';
  const sortOrder = mipFeatures['list.sortOrder'] || 'asc';
  
  const sortedPackages = manifestPackages.sort((a, b) => {
    let compareA, compareB;
    if (sortBy === 'name') {
      compareA = a;
      compareB = b;
    } else if (sortBy === 'version') {
      compareA = manifest[a].version;
      compareB = manifest[b].version;
    } else if (sortBy === 'size') {
      compareA = getPackageSize(manifest[a].path);
      compareB = getPackageSize(manifest[b].path);
    } else {
      compareA = a;
      compareB = b;
    }
    
    if (sortOrder === 'desc') {
      return compareB.localeCompare(compareA);
    }
    return compareA.localeCompare(compareB);
  });

  // Группировка
  const groupBy = mipFeatures['list.groupBy'] || 'none';
  const groups = {};
  
  if (groupBy === 'type') {
    for (const name of sortedPackages) {
      const isDev = conf?.devDependencies && conf.devDependencies[name];
      const type = isDev ? 'dev' : 'prod';
      if (!groups[type]) groups[type] = [];
      groups[type].push(name);
    }
  }

  const showSize = mipFeatures['list.showSize'] !== false;
  const showPath = mipFeatures['list.showPath'] || false;
  const showLinked = mipFeatures['list.showLinked'] !== false;
  const maxDisplay = mipFeatures['list.maxDisplay'] || 0;

  if (manifestPackages.length === 0) {
    console.log(t('commands.list.empty'));
  } else {
    const displayPackages = maxDisplay > 0 ? sortedPackages.slice(0, maxDisplay) : sortedPackages;
    
    if (groupBy === 'type' && Object.keys(groups).length > 0) {
      for (const [type, pkgs] of Object.entries(groups)) {
        const typeLabel = type === 'dev' ? '📦 Dev Dependencies' : '📦 Dependencies';
        console.log(`\n${typeLabel}:`);
        for (const name of pkgs) {
          const info = manifest[name];
          const source = info.linked ? '🔗' : '🌍';
          const sizeInfo = showSize ? ` (${formatSize(getPackageSize(info.path))})` : '';
          const pathInfo = showPath ? `\n     ${info.path}` : '';
          const linkedInfo = info.linked ? ' (linked)' : '';
          console.log(`  ${source} ${name}@${info.version}${linkedInfo}${sizeInfo}${pathInfo}`);
        }
      }
    } else {
      for (const name of displayPackages) {
        const info = manifest[name];
        const source = info.linked ? '🔗' : '🌍';
        const sizeInfo = showSize ? ` (${formatSize(getPackageSize(info.path))})` : '';
        const pathInfo = showPath ? `\n     ${info.path}` : '';
        const linkedInfo = info.linked ? ' (linked)' : '';
        console.log(`  ${source} ${name}@${info.version}${linkedInfo}${sizeInfo}${pathInfo}`);
      }
    }
    
    if (maxDisplay > 0 && manifestPackages.length > maxDisplay) {
      console.log(`\n  ... and ${manifestPackages.length - maxDisplay} more packages`);
    }
  }

  // Для обратной совместимости - проверяем старый .mip
  const mipDir = path.join(cwd, '.mip');
  const oldPackages = [];
  if (fs.existsSync(mipDir) && mipFeatures['list.showLegacy'] !== false) {
    const items = fs.readdirSync(mipDir).filter(item => {
      const itemPath = path.join(mipDir, item);
      return fs.statSync(itemPath).isDirectory() && item !== 'cache' && item !== 'temp' && item !== 'packages';
    });
    for (const item of items) {
      if (!manifest[item]) {
        const pkgDir = path.join(mipDir, item);
        const versions = fs.readdirSync(pkgDir);
        const version = versions.length > 0 ? versions[0] : 'unknown';
        oldPackages.push({ name: item, version });
      }
    }
  }

  if (oldPackages.length > 0) {
    console.log('\n' + t('commands.list.legacy_packages') + '\n');
    for (const pkg of oldPackages) {
      console.log(`  📁 ${pkg.name}@${pkg.version} (legacy)`);
    }
  }

  // Подсчёт из конфига
  const deps = conf?.dependencies || {};
  const devDeps = conf?.devDependencies || {};
  const totalPackages = manifestPackages.length + Object.keys(deps).length + Object.keys(devDeps).length;

  console.log(`\n${t('commands.list.total', { count: totalPackages })}\n`);

  // Показываем статистику если включено
  if (mipFeatures['list.showStats'] !== false) {
    const storeSize = store.getStoreSize();
    console.log(`💾 Store size: ${formatSize(storeSize)}`);
  }

  // 🥚 EASTER EGG: "Призрачный пакет" — 42-я минута ИЛИ phantom/ghost пакет
  checkGhostEasterEgg(manifestPackages, manifest);
}

function getPackageSize(pkgPath) {
  try {
    let size = 0;
    const files = fs.readdirSync(pkgPath);
    for (const file of files) {
      const filePath = path.join(pkgPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getPackageSize(filePath);
      } else {
        size += stat.size;
      }
    }
    return size;
  } catch {
    return 0;
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkGhostEasterEgg(pkgNames, manifest) {
  try {
    const now = new Date();
    const is42ndMinute = now.getMinutes() === 42;
    const hasGhostPkg = pkgNames.some(name =>
      name.toLowerCase() === 'phantom' || name.toLowerCase() === 'ghost'
    );

    if (!is42ndMinute && !hasGhostPkg) return;

    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const cyan = '\x1b[36m';
    const gray = '\x1b[90m';
    const green = '\x1b[32m';

    const triggerReason = hasGhostPkg
      ? '👻 You found me... you have the phantom package...'
      : '👻 It\'s 42 minutes past the hour... the veil is thin...';

    const ghost = `
${cyan}${bold}
      ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗
     ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝
     ██║  ███╗███████║██║   ██║███████╗   ██║   
     ██║   ██║██╔══██║██║   ██║╚════██║   ██║   
     ╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   
      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   
${reset}
${gray}${bold}A phantom package appears in the manifest...${reset}
${green}   ${triggerReason}${reset}
${gray}   "I don't exist, yet here I am. Just like 42."${reset}
${gray}   — Ghost Package v.0.0.0${reset}
`;
    console.log(ghost);

    // Показываем "призрачный" пакет в списке если его нет на самом деле
    if (!hasGhostPkg) {
      console.log(`   ${cyan}👻 phantom@0.0.0 (ethereal)${reset}`);
    }
  } catch (e) {
    // silently ignore
  }
}

module.exports = { list };
