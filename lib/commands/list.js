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

function list() {
  const cwd = process.cwd();
  const { t } = getI18n(loadLangForCwd(cwd));

  // Определяем конфиг
  const cfg = config.detectConfig(cwd);
  if (!cfg) {
    console.log(t('commands.list.no_config'));
    return;
  }

  const conf = config.readConfig(cwd);

  console.log('\n' + t('commands.list.installed_packages') + '\n');

  // Читаем из манифеста
  const manifest = loader.loadManifest(cwd);
  const manifestPackages = Object.keys(manifest);

  if (manifestPackages.length === 0) {
    console.log(t('commands.list.empty'));
  } else {
    manifestPackages.sort();
    for (const name of manifestPackages) {
      const info = manifest[name];
      const source = info.linked ? '🔗' : '🌍';
      console.log(`  ${source} ${name}@${info.version}`);
      console.log(`     ${info.path}`);
    }
  }

  // Для обратной совместимости — проверяем старый .mip
  const mipDir = path.join(cwd, '.mip');
  const oldPackages = [];
  if (fs.existsSync(mipDir)) {
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
}

module.exports = { list };