/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                           │
 * │   https://github.com/kiwinatra/mip                                  │
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

  // Читаем конфиг
  const cfg = config.readConfig();
  if (!cfg) {
    console.log(t('commands.install.no_config'));
    return;
  }

  const pkgPath = config.detectConfig()?.path || path.join(process.cwd(), 'mip.yml');
  const isYaml = pkgPath.endsWith('.yml');

  let packagesToInstall = [];
  if (Array.isArray(packageNames)) {
    packagesToInstall = packageNames;
  } else if (typeof packageNames === 'string' && packageNames.includes(' ')) {
    packagesToInstall = packageNames.split(/\s+/);
  } else if (typeof packageNames === 'string' && packageNames) {
    packagesToInstall = [packageNames];
  }

  // Установка всех зависимостей из конфига
  if (packagesToInstall.length === 0) {
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
    return;
  }

  // Установка нескольких пакетов параллельно
  if (packagesToInstall.length > 1) {
    console.log(t('commands.install.installing_multiple', { count: packagesToInstall.length }));

    const installPromises = packagesToInstall.map(async (pkg) => {
      try {
        await installSinglePackage(pkg, { force, saveDev, noSave }, t);
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
    return;
  }

  // Один пакет
  await installSinglePackage(packagesToInstall[0], { force, saveDev, noSave }, t);
}

async function installSinglePackage(packageName, options = {}, t) {
  const { force = false, saveDev = false, noSave = false } = options;

  let name, versionRange;
  if (packageName.includes('@') && !packageName.startsWith('@')) {
    [name, versionRange] = packageName.split('@');
  } else {
    name = packageName;
    versionRange = 'latest';
  }

  await installPackage(name, versionRange, { force, saveDev });

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

    fs.mkdirSync(TARBALL_CACHE, { recursive: true });
    const safeName = pkgInfo.name.replace('/', '-');
    const tarballPath = path.join(TARBALL_CACHE, `${safeName}-${pkgInfo.version}.tgz`);

    let data;
    if (!force && fs.existsSync(tarballPath)) {
      data = fs.readFileSync(tarballPath);
    } else {
      const response = await axios.get(pkgInfo.tarball, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      data = response.data;
      fs.writeFileSync(tarballPath, data);
    }

    await StreamExtractor.extractToDir(data, installDir);
  }

  loader.addToManifest(pkgInfo.name, pkgInfo.version, installDir);

  // Обновляем lock-файл (YAML)
  updateLockfileYaml(
    pkgInfo.name,
    pkgInfo.version,
    pkgInfo.tarball,
    pkgInfo.dependencies,
    pkgInfo.peerDependencies
  );

  const deps = pkgInfo.dependencies || {};
  if (Object.keys(deps).length > 0) {
    const depPromises = Object.entries(deps).map(async ([depName, depRange]) => {
      const installed = getInstalledVersionYaml(depName);
      if (!installed || !semver.satisfies(installed, depRange)) {
        await installPackage(depName, depRange, { force });
      }
    });
    await Promise.all(depPromises);
  }
}

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

function updateLockfile(name, version, resolved, dependencies, peerDependencies = {}) {
  // Для обратной совместимости — если есть старый JSON-лок
  const lockPath = path.join(process.cwd(), 'mip-lock.json');
  if (fs.existsSync(lockPath)) {
    let lockData = {};
    try {
      lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch {
      lockData = {};
    }
    if (!lockData.packages) lockData.packages = {};
    lockData.packages[`${name}@${version}`] = {
      version,
      resolved,
      dependencies,
      peerDependencies,
      installPath: path.join('.mip', name, version),
    };
    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  }

  // Основной — YAML
  updateLockfileYaml(name, version, resolved, dependencies, peerDependencies);
}

function getInstalledVersion(name) {
  const version = getInstalledVersionYaml(name);
  if (version) return version;

  // fallback на JSON
  const lockPath = path.join(process.cwd(), 'mip-lock.json');
  if (!fs.existsSync(lockPath)) return null;
  try {
    const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    for (const [pkg, info] of Object.entries(lockData.packages || {})) {
      if (pkg.startsWith(`${name}@`)) return info.version;
    }
  } catch {}
  return null;
}

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