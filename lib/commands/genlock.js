/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { getPackageInfo } = require('../utils/registry');
const { loadLangForCwd, getI18n } = require('../i18n');
const config = require('../utils/config');

async function genlock() {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  // Определяем конфиг
  const cfg = config.detectConfig(process.cwd());
  if (!cfg) {
    console.log(t('commands.genlock.no_config'));
    return;
  }

  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.log(t('commands.genlock.no_config'));
    return;
  }

  const yamlLockPath = path.join(process.cwd(), 'mip-lock.yml');
  const jsonLockPath = path.join(process.cwd(), 'mip-lock.json');

  console.log(t('commands.genlock.generating'));

  const deps = { ...conf.dependencies, ...conf.devDependencies };
  const packages = Object.entries(deps);

  if (packages.length === 0) {
    console.log(t('commands.genlock.no_deps'));
    return;
  }

  const lockData = {
    version: '1.0.0',
    packages: {},
    generatedAt: new Date().toISOString(),
  };

  let generated = 0;
  const total = packages.length;

  for (const [name, versionRange] of packages) {
    try {
      process.stdout.write(`\r  ${t('commands.genlock.progress')} ${generated + 1}/${total}`);

      const pkgInfo = await getPackageInfo(name, versionRange);
      const mipPath = path.join('.mip', name, pkgInfo.version);

      lockData.packages[`${name}@${pkgInfo.version}`] = {
        version: pkgInfo.version,
        resolved: pkgInfo.tarball,
        dependencies: pkgInfo.dependencies || {},
        peerDependencies: pkgInfo.peerDependencies || {},
        installPath: mipPath,
      };

      generated++;
    } catch (err) {
      console.log(`\n  ${t('commands.genlock.failed', { name, message: err.message })}`);
    }
  }

  console.log('');

  // Сохраняем в YAML
  fs.writeFileSync(yamlLockPath, yaml.dump(lockData, { indent: 2 }));
  console.log(t('commands.genlock.complete', { count: generated, format: 'YAML' }));

  // Для обратной совместимости — сохраняем и JSON
  if (fs.existsSync(jsonLockPath)) {
    fs.writeFileSync(jsonLockPath, JSON.stringify(lockData, null, 2));
    console.log(t('commands.genlock.complete_json'));
  }
}

module.exports = { genlock };