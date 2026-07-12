/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { getPackageInfo } = require('../utils/registry');
const { installPackage } = require('./install');
const store = require('../utils/store');
const loader = require('../loader');
const config = require('../utils/config');
const { loadLangForCwd, getI18n } = require('../i18n');
const features = require('../utils/features');

async function update() {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка интерактивного режима
  if (mipFeatures['interactive.promptOnUpdate'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('📦 Check for updates? (Y/n) ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Update check cancelled');
      return;
    }
  }

  // Определяем конфиг
  const cfg = config.detectConfig(process.cwd());
  if (!cfg) {
    console.log(t('commands.update.no_config'));
    return;
  }

  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.log(t('commands.update.no_config'));
    return;
  }

  const deps = { ...conf.dependencies, ...conf.devDependencies };
  const packages = Object.entries(deps).map(([name, currentVersion]) => ({
    name,
    currentVersion,
  }));

  console.log(t('commands.update.checking', { count: packages.length }));

  // Загружаем текущий манифест
  const manifest = loader.loadManifest(process.cwd());

  const updates = await Promise.all(
    packages.map(async ({ name, currentVersion }) => {
      try {
        // Проверка на prerelease
        let versionRange = 'latest';
        if (mipFeatures['update.prerelease']) {
          versionRange = 'latest';
        }
        
        const latest = await getPackageInfo(name, versionRange);
        const isInStore = store.isPackageInStore(name, latest.version);
        const isInManifest = !!manifest[name];

        if (latest.version !== currentVersion) {
          // Проверяем типы обновлений
          const currentParsed = semver.parse(currentVersion);
          const latestParsed = semver.parse(latest.version);
          
          if (currentParsed && latestParsed) {
            const isMajor = latestParsed.major > currentParsed.major;
            const isMinor = latestParsed.minor > currentParsed.minor && latestParsed.major === currentParsed.major;
            const isPatch = latestParsed.patch > currentParsed.patch && 
                           latestParsed.major === currentParsed.major && 
                           latestParsed.minor === currentParsed.minor;
            
            // Проверяем разрешения
            if (isMajor && !mipFeatures['update.major']) {
              return null;
            }
            if (isMinor && !mipFeatures['update.minor']) {
              return null;
            }
            if (isPatch && !mipFeatures['update.patch']) {
              return null;
            }
          }

          return {
            name,
            current: currentVersion,
            latest: latest.version,
            fromCache: isInStore,
            inManifest: isInManifest,
            type: getUpdateType(currentVersion, latest.version)
          };
        }
      } catch (err) {
        console.log(t('commands.update.check_failed', { name }));
      }
      return null;
    })
  );

  const updatesAvailable = updates.filter(u => u !== null);

  if (updatesAvailable.length === 0) {
    console.log(t('commands.update.up_to_date'));
    return;
  }

  console.log(t('commands.update.available_title', { count: updatesAvailable.length }));

  updatesAvailable.forEach(({ name, current, latest, fromCache, inManifest, type }) => {
    const cacheIcon = fromCache ? '🌍' : '📡';
    const manifestIcon = inManifest ? '📋' : '❌';
    const typeIcon = type === 'major' ? '🔴' : type === 'minor' ? '🟡' : '🟢';
    console.log(`  ${typeIcon} ${name}: ${current} → ${latest} (${cacheIcon} ${manifestIcon})`);
  });

  // Проверка autoUpdate
  if (mipFeatures['update.autoUpdate']) {
    console.log(t('commands.update.updating'));
    for (const { name, latest } of updatesAvailable) {
      await installPackage(name, latest, { force: true });
    }
    console.log(t('commands.update.all_updated'));
    return;
  }

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question(t('commands.update.prompt'), async answer => {
    if (String(answer).toLowerCase() === 'y') {
      console.log(t('commands.update.updating'));

      for (const { name, latest } of updatesAvailable) {
        await installPackage(name, latest, { force: true });
      }

      console.log(t('commands.update.all_updated'));
    }
    readline.close();
  });
}

function getUpdateType(current, latest) {
  try {
    const cur = semver.parse(current);
    const lat = semver.parse(latest);
    if (!cur || !lat) return 'unknown';
    
    if (lat.major > cur.major) return 'major';
    if (lat.minor > cur.minor) return 'minor';
    if (lat.patch > cur.patch) return 'patch';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

module.exports = { update };