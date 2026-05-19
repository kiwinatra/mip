const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const semver = require('semver');
const { getPackageInfo } = require('../utils/registry');
const { PeerResolver } = require('../core/peer-resolver');

const { loadLangForCwd, getI18n } = require('../i18n');
const { writeProgressLine, newLine } = require('../ui/cli');

async function install(packageName, options = {}) {
  const { saveDev = false, force = false, global = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const pkgPath = path.join(process.cwd(), 'mip.json');

  if (global) {
    await installGlobal(packageName);
    return;
  }

  if (!fs.existsSync(pkgPath) && !packageName) {
    console.log(t('commands.install.run_init_first'));
    return;
  }

  // Установка всех зависимостей
  if (!packageName) {
    const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...config.dependencies, ...config.devDependencies };
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
        const percent = (installed / total * 100).toFixed(1);
        writeProgressLine({
          label: 'Installing',
          percent,
          postfix: `${installed}/${total}`
        });
      } catch (err) {
        console.log(t('commands.install.failed', { name, message: err.message }));
      }
    }

    const duration = Date.now() - startTime;
    newLine();
    console.log(t('commands.install.all_installed', {
      installed,
      seconds: (duration / 1000).toFixed(1)
    }));
    return;
  }

  // Установка одного пакета
  let name, versionRange;
  if (packageName.includes('@') && !packageName.startsWith('@')) {
    [name, versionRange] = packageName.split('@');
  } else {
    name = packageName;
    versionRange = 'latest';
  }

  await installPackage(name, versionRange, { force, saveDev });

  const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const depType = saveDev ? 'devDependencies' : 'dependencies';
  if (!config[depType]) config[depType] = {};
  config[depType][name] = versionRange;
  fs.writeFileSync(pkgPath, JSON.stringify(config, null, 2));

  console.log(t('commands.install.installed_one', { name }));
}

async function installPackage(name, versionRange, options = {}) {
  const { force = false, saveDev = false } = options;
  const pkgInfo = await getPackageInfo(name, versionRange);

  // 🔥 НОВОЕ: проверяем peer dependencies перед установкой
  const peerResolver = new PeerResolver(process.cwd());
  const shouldContinue = await peerResolver.resolveAndInstall(pkgInfo, async (info) => {
    await actuallyInstallPackage(info, { force, saveDev });
  });
  
  if (!shouldContinue) {
    throw new Error(`Peer dependency conflict for ${name}`);
  }
}

async function actuallyInstallPackage(pkgInfo, options = {}) {
  const { force = false } = options;

  // ТОЛЬКО .mip — никакого node_modules
  const installDir = path.join(process.cwd(), '.mip', pkgInfo.name, pkgInfo.version);

  fs.mkdirSync(installDir, { recursive: true });

  const isCached = fs.existsSync(path.join(installDir, 'package.json'));

  if (!isCached || force) {
    const response = await axios.get(pkgInfo.tarball, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    execSync(`tar -xzf - -C "${installDir}" --strip-components=1`, {
      input: response.data,
      stdio: 'pipe'
    });
  }

  // Обновляем lockfile с peerDependencies
  updateLockfile(
    pkgInfo.name, 
    pkgInfo.version, 
    pkgInfo.tarball, 
    pkgInfo.dependencies,
    pkgInfo.peerDependencies
  );

  // Устанавливаем зависимости
  const deps = pkgInfo.dependencies || {};
  for (const [depName, depRange] of Object.entries(deps)) {
    const installed = getInstalledVersion(depName);
    if (!installed || !semver.satisfies(installed, depRange)) {
      await installPackage(depName, depRange, options);
    }
  }
}

function updateLockfile(name, version, resolved, dependencies, peerDependencies = {}) {
  const lockPath = path.join(process.cwd(), 'mip-lock.json');
  let lockData = {};

  if (fs.existsSync(lockPath)) {
    lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  }

  if (!lockData.packages) lockData.packages = {};

  lockData.packages[`${name}@${version}`] = {
    version,
    resolved,
    dependencies,
    peerDependencies,
    installPath: path.join('.mip', name, version)
  };

  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
}

function getInstalledVersion(name) {
  const lockPath = path.join(process.cwd(), 'mip-lock.json');
  if (!fs.existsSync(lockPath)) return null;

  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  for (const [pkg, info] of Object.entries(lockData.packages || {})) {
    if (pkg.startsWith(`${name}@`)) return info.version;
  }
  return null;
}

async function installGlobal(packageName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  const globalDir = path.join(require('os').homedir(), '.mip', 'global');
  const originalCwd = process.cwd();

  console.log(t('commands.install.global.installing', { package: packageName }));

  fs.mkdirSync(globalDir, { recursive: true });
  process.chdir(globalDir);

  if (!fs.existsSync('mip.json')) {
    execSync('mip init', { stdio: 'pipe' });
  }

  await install(packageName, { global: false });
  process.chdir(originalCwd);

  console.log(t('commands.install.global.installed', { package: packageName }));
}

module.exports = { install };