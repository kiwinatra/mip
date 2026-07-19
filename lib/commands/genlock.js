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
const features = require('../utils/features');

async function genlock() {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['genlock.enabled'] === false) {
    console.log('ℹ️ Genlock command is disabled (genlock.enabled: false)');
    return;
  }

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

  // Параллельное разрешение зависимостей
  const useParallel = mipFeatures['genlock.parallel'] !== false;
  const parallelCount = mipFeatures['performance.parallelDownloads'] || 5;

  if (useParallel && total > 1) {
    const chunks = [];
    for (let i = 0; i < packages.length; i += parallelCount) {
      chunks.push(packages.slice(i, i + parallelCount));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async ([name, versionRange]) => {
        try {
          const pkgInfo = await getPackageInfo(name, versionRange);
          const mipPath = path.join('.mip', name, pkgInfo.version);

          return {
            key: `${name}@${pkgInfo.version}`,
            data: {
              version: pkgInfo.version,
              resolved: pkgInfo.tarball,
              dependencies: pkgInfo.dependencies || {},
              peerDependencies: pkgInfo.peerDependencies || {},
              installPath: mipPath,
            },
            success: true,
            name,
          };
        } catch (err) {
          return {
            success: false,
            name,
            error: err.message,
          };
        }
      });
      
      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (result.success) {
          lockData.packages[result.key] = result.data;
          generated++;
        } else {
          console.log(`\n  ${t('commands.genlock.failed', { name: result.name, message: result.error })}`);
        }
      }
      
      process.stdout.write(`\r  ${t('commands.genlock.progress')} ${generated}/${total}`);
    }
  } else {
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
  }

  console.log('');

  // Сохраняем в YAML (или JSON в зависимости от фичи)
  const useYaml = mipFeatures['genlock.useYaml'] !== false;
  
  if (useYaml) {
    fs.writeFileSync(yamlLockPath, yaml.dump(lockData, { indent: 2 }));
    console.log(t('commands.genlock.complete', { count: generated, format: 'YAML' }));
  } else {
    fs.writeFileSync(jsonLockPath, JSON.stringify(lockData, null, 2));
    console.log(t('commands.genlock.complete', { count: generated, format: 'JSON' }));
  }

  // Для обратной совместимости - сохраняем и JSON если включено
  if (mipFeatures['genlock.saveJson'] !== false && useYaml) {
    fs.writeFileSync(jsonLockPath, JSON.stringify(lockData, null, 2));
    console.log(t('commands.genlock.complete_json'));
  }

  // Проверка целостности (если включено)
  if (mipFeatures['genlock.verify'] !== false) {
    console.log('🔍 Verifying lockfile integrity...');
    let verified = 0;
    for (const [key, info] of Object.entries(lockData.packages)) {
      const installPath = path.join(process.cwd(), info.installPath);
      if (fs.existsSync(installPath)) {
        verified++;
      }
    }
    console.log(`✅ Verified ${verified}/${generated} packages are installed`);
  }
}

module.exports = { genlock };