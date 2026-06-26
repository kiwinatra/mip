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
    console.log('┌─────────────────────┬──────────────┬──────────────┬────────────┬────────────┐');
    console.log('│ Package             │ Current      │ Latest       │ Store      │ Manifest   │');
    console.log('├─────────────────────┼──────────────┼──────────────┼────────────┼────────────┤');
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
      });
    } catch (err) {
      results.push({
        name,
        current: currentVersion,
        latest: 'ERROR',
        outdated: false,
        cached: false,
        inManifest: false,
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

  results.forEach(({ name, current, latest, outdated, cached, inManifest }) => {
    const status = outdated ? '⚠️' : '✅';
    const cacheIcon = cached ? '🌍' : '📡';
    const manifestIcon = inManifest ? '📋' : '❌';
    const namePadded = name.padEnd(21, ' ');
    const currentPadded = current.padEnd(14, ' ');
    const latestPadded = latest.padEnd(14, ' ');

    if (outdated) {
      console.log(`│ ${status} ${namePadded}│ ${currentPadded}│ ${latestPadded}│ ${cacheIcon}      │ ${manifestIcon}       │`);
    }
  });

  console.log('└─────────────────────┴──────────────┴──────────────┴────────────┴────────────┘');
  console.log(`\n📊 ${outdatedCount} package(s) outdated out of ${Object.keys(deps).length}`);

  if (outdatedCount > 0) {
    console.log('\n💡 Run "mip update" to update all packages');
    console.log('💡 Run "mip update --latest" to update to latest versions');
  }
}

module.exports = { outdated };