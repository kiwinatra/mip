/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const { getPackageInfo } = require('../utils/registry');
const store = require('../utils/store');
const loader = require('../loader');
const config = require('../utils/config');

// ==========================================
// ЦВЕТА ДЛЯ ТАБЛИЦЫ
// ==========================================

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function getSeverityColor(severity) {
  if (severity === 'critical') return COLORS.red;
  if (severity === 'high') return COLORS.yellow;
  if (severity === 'moderate') return COLORS.blue;
  return COLORS.green;
}

async function outdated() {
  const isJson = process.argv.includes('--json');

  // Определяем конфиг
  const cfg = config.detectConfig(process.cwd());
  if (!cfg) {
    console.log('❌ No config file found (mip.yml, mip.json, or package.json)');
    return;
  }

  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.log('❌ Failed to read config');
    return;
  }

  const deps = { ...conf.dependencies, ...conf.devDependencies };

  if (Object.keys(deps).length === 0) {
    console.log('✨ No dependencies found');
    return;
  }

  // Загружаем манифест
  const manifest = loader.loadManifest(process.cwd());

  if (!isJson) {
    console.log('🔍 Checking for outdated packages...\n');
    // 🔥 РАСШИРЕННАЯ ТАБЛИЦА С ЦВЕТАМИ
    console.log(
      '┌─────────────────────┬──────────────┬──────────────┬────────────┬────────────┬────────────┐'
    );
    console.log(
      `│ ${colorize('Package', 'bold')}             │ ${colorize('Current', 'bold')}      │ ${colorize('Latest', 'bold')}       │ ${colorize('Store', 'bold')}      │ ${colorize('Manifest', 'bold')}   │ ${colorize('Status', 'bold')}     │`
    );
    console.log(
      '├─────────────────────┼──────────────┼──────────────┼────────────┼────────────┼────────────┤'
    );
  }

  let outdatedCount = 0;
  const results = [];

  for (const [name, currentVersion] of Object.entries(deps)) {
    try {
      const pkgInfo = await getPackageInfo(name, 'latest');
      const latestVersion = pkgInfo.version;
      const isOutdated = latestVersion !== currentVersion;
      const isInStore = store.isPackageInStore(name, latestVersion);
      const isInManifest = !!manifest[name];

      if (isOutdated) outdatedCount++;

      results.push({
        name,
        current: currentVersion,
        latest: latestVersion,
        outdated: isOutdated,
        cached: isInStore,
        inManifest: isInManifest,
        severity: pkgInfo.severity || 'low',
      });
    } catch (err) {
      results.push({
        name,
        current: currentVersion,
        latest: 'ERROR',
        outdated: false,
        cached: false,
        inManifest: false,
        severity: 'low',
      });
    }
  }

  if (isJson) {
    const payload = {
      packages: results.map(({ name, current, latest, outdated, cached, inManifest }) => ({
        name,
        current,
        latest,
        outdated,
        cached,
        inManifest,
      })),
    };

    console.log(JSON.stringify(payload));

    if (outdatedCount > 0) {
      process.exitCode = 1;
    }

    return;
  }

  // 🔥 ВЫВОД С ЦВЕТАМИ
  results.forEach(({ name, current, latest, outdated, cached, inManifest, severity }) => {
    const namePadded = name.padEnd(21, ' ');
    const currentPadded = current.padEnd(14, ' ');
    const latestPadded = latest.padEnd(14, ' ');
    const cacheIcon = cached ? colorize('🌍', 'green') : colorize('📡', 'gray');
    const manifestIcon = inManifest ? colorize('📋', 'green') : colorize('❌', 'gray');

    let statusIcon;
    let statusText;

    if (outdated) {
      const severityColor = getSeverityColor(severity);
      statusIcon = colorize('⚠️', severityColor);
      statusText = colorize(
        severity.charAt(0).toUpperCase() + severity.slice(1),
        severityColor
      );
    } else {
      statusIcon = colorize('✅', 'green');
      statusText = colorize('Up to date', 'green');
    }

    const statusPadded = statusText.padEnd(14, ' ');

    console.log(
      `│ ${statusIcon} ${namePadded}│ ${currentPadded}│ ${latestPadded}│ ${cacheIcon}      │ ${manifestIcon}       │ ${statusPadded}│`
    );
  });

  console.log(
    '└─────────────────────┴──────────────┴──────────────┴────────────┴────────────┴────────────┘'
  );

  // 🔥 ИТОГ С ЦВЕТОМ
  const summaryColor = outdatedCount > 0 ? 'yellow' : 'green';
  console.log(
    `\n📊 ${colorize(outdatedCount, summaryColor)} package(s) outdated out of ${colorize(
      Object.keys(deps).length,
      'bold'
    )}`
  );

  if (outdatedCount > 0) {
    console.log(`\n💡 Run ${colorize('mip update', 'bold')} to update all packages`);
    console.log(
      `💡 Run ${colorize('mip update --latest', 'bold')} to update to latest versions`
    );
  }
}

module.exports = { outdated };