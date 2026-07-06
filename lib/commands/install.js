/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const semver = require('semver');
const { getPackageInfo } = require('../utils/registry');
const { PeerResolver } = require('../core/peer-resolver');
const { StreamExtractor } = require('../utils/stream-extract');
const { loadLangForCwd, getI18n } = require('../i18n');
const { writeProgressLine, newLine } = require('../ui/cli');
const store = require('../utils/store');
const loader = require('../loader');
const config = require('../utils/config');

const TARBALL_CACHE = path.join(process.cwd(), '.mip', 'cache', 'tarballs');

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ УСТАНОВКИ
// ==========================================

async function install(packageNames, options = {}) {
  const { saveDev = false, force = false, global = false, noSave = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  if (global) {
    await installGlobal(packageNames);
    return;
  }

  // Проверяем/мигрируем конфиг
  const existingConfig = config.detectConfig();
  if (!existingConfig) {
    const { init } = require('./init');
    await init();
  }

  const cfg = config.readConfig();
  if (!cfg) {
    console.log(t('commands.install.no_config'));
    return;
  }

  const packagesToInstall = normalizePackageNames(packageNames);

  if (packagesToInstall.length === 0) {
    await installAllFromConfig(cfg, { force, t });
    return;
  }

  if (packagesToInstall.length > 1) {
    await installMultiplePackages(packagesToInstall, { force, saveDev, noSave, t });
    return;
  }

  await installSinglePackage(packagesToInstall[0], { force, saveDev, noSave, t });
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

function normalizePackageNames(packageNames) {
  if (Array.isArray(packageNames)) return packageNames;
  if (typeof packageNames === 'string' && packageNames.includes(' ')) {
    return packageNames.split(/\s+/);
  }
  if (typeof packageNames === 'string' && packageNames) {
    return [packageNames];
  }
  return [];
}

function parsePackageSpec(spec) {
  if (spec.includes('@') && !spec.startsWith('@')) {
    const [name, versionRange] = spec.split('@');
    return { name, versionRange };
  }
  return { name: spec, versionRange: 'latest' };
}

// ==========================================
// УСТАНОВКА ВСЕХ ЗАВИСИМОСТЕЙ ИЗ КОНФИГА
// ==========================================

async function installAllFromConfig(cfg, { force, t }) {
  const deps = { ...cfg.dependencies, ...cfg.devDependencies };
  const packages = Object.entries(deps);

  if (packages.length === 0) {
    console.log(t('commands.install.no_dependencies'));
    return;
  }

  console.log(t('commands.install.installing_all', { count: packages.length }));

  let installed = 0;
  const startTime = Date.now();
  const total = packages.length;

  for (const [name, versionRange] of packages) {
    try {
      await installPackage(name, versionRange, { force });
      installed++;
      const percent = ((installed / total) * 100).toFixed(1);
      writeProgressLine({
        label: 'Installing',
        percent,
        postfix: `${installed}/${total}`,
      });
    } catch (err) {
      console.log(t('commands.install.failed', { name, message: err.message }));
    }
  }

  const duration = Date.now() - startTime;
  newLine();
  console.log(
    t('commands.install.all_installed', {
      installed,
      seconds: (duration / 1000).toFixed(1),
    })
  );
}

// ==========================================
// УСТАНОВКА НЕСКОЛЬКИХ ПАКЕТОВ ПАРАЛЛЕЛЬНО
// ==========================================

async function installMultiplePackages(packagesToInstall, { force, saveDev, noSave, t }) {
  console.log(t('commands.install.installing_multiple', { count: packagesToInstall.length }));

  const installPromises = packagesToInstall.map(async (pkg) => {
    try {
      await installSinglePackage(pkg, { force, saveDev, noSave, t });
      return { name: pkg, success: true };
    } catch (err) {
      return { name: pkg, success: false, error: err.message };
    }
  });

  const results = await Promise.all(installPromises);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);

  if (failed.length > 0) {
    failed.forEach(f => console.log(t('commands.install.failed', { name: f.name, message: f.error })));
  }

  console.log(t('commands.install.multiple_installed', { installed: successful, total: packagesToInstall.length }));
}

// ==========================================
// УСТАНОВКА ОДНОГО ПАКЕТА
// ==========================================

async function installSinglePackage(packageName, options = {}) {
  const { force = false, saveDev = false, noSave = false, t } = options;

  const { name, versionRange } = parsePackageSpec(packageName);

  await installPackage(name, versionRange, { force });

  if (!noSave) {
    const cfg = config.readConfig();
    if (cfg) {
      const depType = saveDev ? 'devDependencies' : 'dependencies';
      if (!cfg[depType]) cfg[depType] = {};
      cfg[depType][name] = versionRange;
      config.writeConfig(cfg);
    }
  }

  console.log(t('commands.install.installed_one', { name }));
}

// ==========================================
// ЯДРО УСТАНОВКИ ПАКЕТА
// ==========================================

async function installPackage(name, versionRange, options = {}) {
  const { force = false } = options;
  const pkgInfo = await getPackageInfo(name, versionRange);

  const peerResolver = new PeerResolver(process.cwd());
  const shouldContinue = await peerResolver.resolveAndInstall(pkgInfo, async info => {
    await actuallyInstallPackage(info, { force });
  });

  if (!shouldContinue) {
    throw new Error(`Peer dependency conflict for ${name}`);
  }
}

// ==========================================
// ФИЗИЧЕСКАЯ УСТАНОВКА ПАКЕТА В ХРАНИЛИЩЕ
// ==========================================

async function actuallyInstallPackage(pkgInfo, options = {}) {
  const { force = false } = options;

  const globalStorePath = store.getPackageStorePath(pkgInfo.name, pkgInfo.version);
  const isInGlobalStore = store.isPackageInStore(pkgInfo.name, pkgInfo.version);

  let installDir;
  if (isInGlobalStore && !force) {
    installDir = globalStorePath;
  } else {
    installDir = globalStorePath;
    fs.mkdirSync(installDir, { recursive: true });

    const tarballData = await downloadTarball(pkgInfo, force);
    await StreamExtractor.extractToDir(tarballData, installDir);
  }

  loader.addToManifest(pkgInfo.name, pkgInfo.version, installDir);

  updateLockfileYaml(
    pkgInfo.name,
    pkgInfo.version,
    pkgInfo.tarball,
    pkgInfo.dependencies,
    pkgInfo.peerDependencies
  );

  await installDependencies(pkgInfo, { force });
}

// ==========================================
// ЗАГРУЗКА ТАРБОЛЛА
// ==========================================

async function downloadTarball(pkgInfo, force) {
  fs.mkdirSync(TARBALL_CACHE, { recursive: true });
  const safeName = pkgInfo.name.replace('/', '-');
  const tarballPath = path.join(TARBALL_CACHE, `${safeName}-${pkgInfo.version}.tgz`);

  if (!force && fs.existsSync(tarballPath)) {
    return fs.readFileSync(tarballPath);
  }

  const response = await axios.get(pkgInfo.tarball, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  fs.writeFileSync(tarballPath, response.data);
  return response.data;
}

// ==========================================
// УСТАНОВКА ЗАВИСИМОСТЕЙ ПАКЕТА
// ==========================================

async function installDependencies(pkgInfo, { force }) {
  const deps = pkgInfo.dependencies || {};
  if (Object.keys(deps).length === 0) return;

  const depPromises = Object.entries(deps).map(async ([depName, depRange]) => {
    const installed = getInstalledVersionYaml(depName);
    if (!installed || !semver.satisfies(installed, depRange)) {
      await installPackage(depName, depRange, { force });
    }
  });

  await Promise.all(depPromises);
}

// ==========================================
// РАБОТА С LOCKFILE
// ==========================================

function updateLockfileYaml(name, version, resolved, dependencies, peerDependencies = {}) {
  const lockPath = path.join(process.cwd(), 'mip-lock.yml');
  let lockData = {};

  if (fs.existsSync(lockPath)) {
    try {
      const yaml = require('js-yaml');
      lockData = yaml.load(fs.readFileSync(lockPath, 'utf8'));
    } catch {
      lockData = {};
    }
  }

  if (!lockData.packages) lockData.packages = {};
  if (!lockData.version) lockData.version = '1.0';

  lockData.packages[`${name}@${version}`] = {
    version,
    resolved,
    dependencies,
    peerDependencies,
    installPath: path.join('.mip', name, version),
  };

  const yaml = require('js-yaml');
  fs.writeFileSync(lockPath, yaml.dump(lockData, { indent: 2 }));
}

function getInstalledVersionYaml(name) {
  const lockPath = path.join(process.cwd(), 'mip-lock.yml');
  if (!fs.existsSync(lockPath)) return null;

  try {
    const yaml = require('js-yaml');
    const lockData = yaml.load(fs.readFileSync(lockPath, 'utf8'));
    for (const [pkg, info] of Object.entries(lockData.packages || {})) {
      if (pkg.startsWith(`${name}@`)) return info.version;
    }
  } catch {}
  return null;
}

// ==========================================
// ГЛОБАЛЬНАЯ УСТАНОВКА
// ==========================================

async function installGlobal(packageName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  const globalDir = path.join(require('os').homedir(), '.mip', 'global');
  const originalCwd = process.cwd();

  console.log(t('commands.install.global.installing', { package: packageName }));

  fs.mkdirSync(globalDir, { recursive: true });
  process.chdir(globalDir);

  const cfg = config.detectConfig();
  if (!cfg) {
    const { init } = require('./init');
    await init();
  }

  await install(packageName, { global: false });
  process.chdir(originalCwd);

  console.log(t('commands.install.global.installed', { package: packageName }));
}

module.exports = { install };