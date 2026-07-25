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
const features = require('../utils/features');

const TARBALL_CACHE = path.join(process.cwd(), '.mip', 'cache', 'tarballs');

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ УСТАНОВКИ
// ==========================================

async function install(packageNames, options = {}) {
  const { saveDev = false, force = false, global = false, noSave = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка DRY RUN
  if (mipFeatures['install.dryRun']) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    if (packageNames && packageNames.length > 0) {
      console.log(`   Would install: ${packageNames.join(', ')}`);
    } else {
      console.log('   Would install all dependencies from config');
    }
    return;
  }

  // Проверка интерактивного режима
  if (mipFeatures['interactive.promptOnInstall'] && packageNames && packageNames.length > 0) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`📦 Install ${packageNames.join(', ')}? (y/N) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Installation cancelled');
      return;
    }
  }

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

  // Устанавливаем переменные окружения для игнорирования
  if (mipFeatures['install.ignoreScripts']) {
    process.env.MIP_IGNORE_SCRIPTS = 'true';
  }
  if (mipFeatures['install.ignoreOptional']) {
    process.env.MIP_IGNORE_OPTIONAL = 'true';
  }
  if (mipFeatures['install.ignoreEngines']) {
    process.env.MIP_IGNORE_ENGINES = 'true';
  }
  if (mipFeatures['install.ignorePlatform']) {
    process.env.MIP_IGNORE_PLATFORM = 'true';
  }

  const packagesToInstall = normalizePackageNames(packageNames);

  if (packagesToInstall.length === 0) {
    await installAllFromConfig(cfg, { force, t, mipFeatures });
    return;
  }

  if (packagesToInstall.length > 1) {
    await installMultiplePackages(packagesToInstall, { force, saveDev, noSave, t, mipFeatures });
    return;
  }

  await installSinglePackage(packagesToInstall[0], { force, saveDev, noSave, t, mipFeatures });
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

async function installAllFromConfig(cfg, { force, t, mipFeatures }) {
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

  // Проверяем параллельную установку
  const useParallel = mipFeatures['install.parallel'] !== false;
  const parallelCount = mipFeatures['performance.parallelDownloads'] || 5;

  if (useParallel && total > 1) {
    const chunks = [];
    for (let i = 0; i < packages.length; i += parallelCount) {
      chunks.push(packages.slice(i, i + parallelCount));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async ([name, versionRange]) => {
        try {
          await installPackage(name, versionRange, { force, mipFeatures });
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
      });
      await Promise.all(promises);
    }
  } else {
    for (const [name, versionRange] of packages) {
      try {
        await installPackage(name, versionRange, { force, mipFeatures });
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
  }

  const duration = Date.now() - startTime;
  newLine();
  console.log(
    t('commands.install.all_installed', {
      installed,
      seconds: (duration / 1000).toFixed(1),
    })
  );

  // 🥚 EASTER EGG: "42 — Ответ на всё"
  checkFortyTwoEasterEgg();
}

// ==========================================
// 🥚 EASTER EGG: "42 — Ответ на всё"
// ==========================================

function checkFortyTwoEasterEgg() {
  try {
    const manifest = loader.loadManifest(process.cwd());
    const pkgCount = Object.keys(manifest).length;

    if (pkgCount === 42) {
      const colors = ['\x1b[36m', '\x1b[35m', '\x1b[33m', '\x1b[32m', '\x1b[34m', '\x1b[31m'];
      const reset = '\x1b[0m';
      const bold = '\x1b[1m';
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const art = `
${randomColor}${bold}
   ██████╗ ██████╗ 
  ██╔════╝██╔════╝ 
  ██║     ██║      
  ██║     ██║      
  ╚██████╗╚██████╗ 
   ╚═════╝ ╚═════╝ 
${reset}
${bold}${randomColor}⚡ The Answer to the Ultimate Question of Life,
   The Universe, and Everything is...${reset}
${bold}\x1b[33m   42 PACKAGES!${reset}
${randomColor}   ✨ The universe is in balance. ✨${reset}
`;
      console.log(art);

      // small firework effect
      const fireworks = ['✨', '🎆', '🎇', '🌟', '💫', '✨'];
      setTimeout(() => {
        const line = fireworks.map(f => `${randomColor}${f}${reset}`).join(' ');
        console.log(`   ${line}`);
      }, 100);
    }
  } catch (e) {
    // silently ignore - easter egg shouldn't break anything
  }
}

// ==========================================
// УСТАНОВКА НЕСКОЛЬКИХ ПАКЕТОВ ПАРАЛЛЕЛЬНО
// ==========================================

async function installMultiplePackages(packagesToInstall, { force, saveDev, noSave, t, mipFeatures }) {
  console.log(t('commands.install.installing_multiple', { count: packagesToInstall.length }));

  const installPromises = packagesToInstall.map(async (pkg) => {
    try {
      await installSinglePackage(pkg, { force, saveDev, noSave, t, mipFeatures });
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
  const { force = false, saveDev = false, noSave = false, t, mipFeatures } = options;

  const { name, versionRange } = parsePackageSpec(packageName);

  // Проверка на pre-release
  if (versionRange.includes('-') && !mipFeatures['update.prerelease']) {
    console.log(`⚠️ Pre-release version ${versionRange} detected`);
    console.log('   Enable update.prerelease to allow pre-release versions');
    return;
  }

  await installPackage(name, versionRange, { force, mipFeatures });

  if (!noSave) {
    const cfg = config.readConfig();
    if (cfg) {
      const depType = saveDev ? 'devDependencies' : 'dependencies';
      if (!cfg[depType]) cfg[depType] = {};
      
      // Проверка saveExact
      if (mipFeatures['install.saveExact']) {
        const installedVersion = getInstalledVersionYaml(name);
        if (installedVersion) {
          cfg[depType][name] = installedVersion;
        } else {
          cfg[depType][name] = versionRange;
        }
      } else {
        cfg[depType][name] = versionRange;
      }
      config.writeConfig(cfg);
    }
  }

  console.log(t('commands.install.installed_one', { name }));
}

// ==========================================
// ЯДРО УСТАНОВКИ ПАКЕТА
// ==========================================

async function installPackage(name, versionRange, options = {}) {
  const { force = false, mipFeatures = {} } = options;
  const pkgInfo = await getPackageInfo(name, versionRange);

  const peerResolver = new PeerResolver(process.cwd());
  const shouldContinue = await peerResolver.resolveAndInstall(pkgInfo, async info => {
    await actuallyInstallPackage(info, { force, mipFeatures });
  });

  if (!shouldContinue) {
    throw new Error(`Peer dependency conflict for ${name}`);
  }
}

// ==========================================
// ФИЗИЧЕСКАЯ УСТАНОВКА ПАКЕТА В ХРАНИЛИЩЕ
// ==========================================

async function actuallyInstallPackage(pkgInfo, options = {}) {
  const { force = false, mipFeatures = {} } = options;

  const globalStorePath = store.getPackageStorePath(pkgInfo.name, pkgInfo.version);
  const isInGlobalStore = store.isPackageInStore(pkgInfo.name, pkgInfo.version);

  // Проверка forceReinstall
  const shouldForceReinstall = force || mipFeatures['install.forceReinstall'];

  let installDir;
  if (isInGlobalStore && !shouldForceReinstall) {
    installDir = globalStorePath;
  } else {
    installDir = globalStorePath;
    fs.mkdirSync(installDir, { recursive: true });

    const tarballData = await downloadTarball(pkgInfo, force, mipFeatures);
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

  await installDependencies(pkgInfo, { force, mipFeatures });
}

// ==========================================
// ЗАГРУЗКА ТАРБОЛЛА
// ==========================================

async function downloadTarball(pkgInfo, force, mipFeatures) {
  fs.mkdirSync(TARBALL_CACHE, { recursive: true });
  const safeName = pkgInfo.name.replace('/', '-');
  const tarballPath = path.join(TARBALL_CACHE, `${safeName}-${pkgInfo.version}.tgz`);

  if (!force && fs.existsSync(tarballPath)) {
    return fs.readFileSync(tarballPath);
  }

  const response = await axios.get(pkgInfo.tarball, {
    responseType: 'arraybuffer',
    timeout: mipFeatures['registry.timeout'] || 30000,
  });

  fs.writeFileSync(tarballPath, response.data);
  return response.data;
}

// ==========================================
// УСТАНОВКА ЗАВИСИМОСТЕЙ ПАКЕТА
// ==========================================

async function installDependencies(pkgInfo, { force, mipFeatures }) {
  const deps = pkgInfo.dependencies || {};
  if (Object.keys(deps).length === 0) return;

  const depPromises = Object.entries(deps).map(async ([depName, depRange]) => {
    const installed = getInstalledVersionYaml(depName);
    if (!installed || !semver.satisfies(installed, depRange)) {
      await installPackage(depName, depRange, { force, mipFeatures });
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