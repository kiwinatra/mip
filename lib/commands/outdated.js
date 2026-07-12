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
const features = require('../utils/features');

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
  const mipFeatures = features.loadFeatures(process.cwd());
  const isJson = process.argv.includes('--json');

  // Проверка включена ли команда
  if (mipFeatures['outdated.enabled'] === false) {
    console.log('ℹ️ Outdated command is disabled (outdated.enabled: false)');
    return;
  }

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

  // Проверка на interactive
  if (mipFeatures['interactive.promptOnOutdated'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`🔍 Check for outdated packages? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  if (!isJson) {
    console.log('🔍 Checking for outdated packages...\n');
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

  // Ограничение количества проверяемых пакетов
  const maxCheck = mipFeatures['outdated.maxCheck'] || 100;
  const packagesToCheck = Object.entries(deps).slice(0, maxCheck);

  // Параллельная проверка
  const useParallel = mipFeatures['outdated.parallelCheck'] !== false;
  const parallelCount = mipFeatures['performance.parallelDownloads'] || 5;

  if (useParallel && packagesToCheck.length > 1) {
    const chunks = [];
    for (let i = 0; i < packagesToCheck.length; i += parallelCount) {
      chunks.push(packagesToCheck.slice(i, i + parallelCount));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async ([name, currentVersion]) => {
        try {
          const pkgInfo = await getPackageInfo(name, 'latest');
          const latestVersion = pkgInfo.version;
          const isOutdated = latestVersion !== currentVersion;
          const isInStore = store.isPackageInStore(name, latestVersion);
          const isInManifest = !!manifest[name];

          if (isOutdated) outdatedCount++;

          return {
            name,
            current: currentVersion,
            latest: latestVersion,
            outdated: isOutdated,
            cached: isInStore,
            inManifest: isInManifest,
            severity: pkgInfo.severity || 'low',
            description: pkgInfo.description || '',
          };
        } catch (err) {
          return {
            name,
            current: currentVersion,
            latest: 'ERROR',
            outdated: false,
            cached: false,
            inManifest: false,
            severity: 'low',
            description: '',
          };
        }
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }
  } else {
    for (const [name, currentVersion] of packagesToCheck) {
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
          description: pkgInfo.description || '',
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
          description: '',
        });
      }
    }
  }

  if (packagesToCheck.length < Object.keys(deps).length) {
    console.log(`⚠️ Showing first ${packagesToCheck.length} of ${Object.keys(deps).length} packages`);
  }

  if (isJson) {
    const payload = {
      packages: results.map(({ name, current, latest, outdated, cached, inManifest, description }) => ({
        name,
        current,
        latest,
        outdated,
        cached,
        inManifest,
        description: description || '',
      })),
    };

    console.log(JSON.stringify(payload));

    if (outdatedCount > 0) {
      process.exitCode = 1;
    }

    return;
  }

  // Вывод с цветами
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

  // Итог с цветом
  const summaryColor = outdatedCount > 0 ? 'yellow' : 'green';
  console.log(
    `\n📊 ${colorize(outdatedCount, summaryColor)} package(s) outdated out of ${colorize(
      packagesToCheck.length,
      'bold'
    )}`
  );

  if (outdatedCount > 0) {
    if (mipFeatures['outdated.showUpdateCommand'] !== false) {
      console.log(`\n💡 Run ${colorize('mip update', 'bold')} to update all packages`);
    }
    if (mipFeatures['outdated.showAuditCommand'] !== false) {
      console.log(`💡 Run ${colorize('mip audit', 'bold')} to check for vulnerabilities`);
    }
  }
}

module.exports = { outdated };