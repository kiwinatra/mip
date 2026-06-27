#!/usr/bin/env node
/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// Hey! Im doing refactor of code, so if anything looks bad open up an issue!

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getApiMethods } = require('../lib/api/api-methods');
const loader = require('../lib/loader');
const config = require('../lib/utils/config');
const i18n = require('../lib/i18n');
const features = require('../lib/utils/features');

// ОДИН ЭКЗЕМПЛЯР API НА ВЕСЬ ПРОЦЕСС
const api = getApiMethods();

// getting super install mode
const isSuperFast = process.argv.includes('--super') || process.argv.includes('-s');
const command = process.argv[2];
const arg = process.argv[3];

const pkg = require('../package.json');
const currentVersion = pkg.version;
const VERSION_CHECK_URL = 'https://kiwinatra.github.io/ver';
let versionChecked = false;

// ==========================================
// ПРОВЕРЯЕМ И СОЗДАЁМ ГЛОБАЛЬНЫЙ ЛОАДЕР
// ==========================================
function ensureGlobalLoader() {
  const loaderPath = path.join(os.homedir(), '.mip', 'loader.js');
  
  if (fs.existsSync(loaderPath)) {
    return loaderPath;
  }
  
  fs.mkdirSync(path.dirname(loaderPath), { recursive: true });
  
  const loaderContent = `// ~/.mip/loader.js — глобальный лоадер для MIP
const fs = require('fs');
const path = require('path');
const Module = require('module');

function findManifest(startDir) {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;
  while (currentDir !== root) {
    const manifestPath = path.join(currentDir, '.mip', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      return manifestPath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

const manifestPath = findManifest(process.cwd());

if (manifestPath) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
      if (manifest[id]) {
        const pkgPath = manifest[id].path;
        if (fs.existsSync(pkgPath)) {
          try {
            return originalRequire.call(this, pkgPath);
          } catch (err) {
            // fallback
          }
        }
      }
      return originalRequire.call(this, id);
    };
  } catch (err) {
    // Молча игнорируем ошибки
  }
}`;
  
  fs.writeFileSync(loaderPath, loaderContent);
  
  // Показываем только если DEBUG
  if (process.env.DEBUG) {
    console.log(`✅ Created global loader at ${loaderPath}`);
  }
  
  return loaderPath;
}

// ==========================================
// ОБРАБОТКА --genconfig
// ==========================================
function handleGenConfig() {
  const force = process.argv.includes('--force');
  const configPath = path.join(process.cwd(), 'mip.config.yml');
  
  if (fs.existsSync(configPath) && !force) {
    console.log(`⚠️ Config file already exists: ${configPath}`);
    console.log('   Use --force to overwrite');
    process.exit(0);
  }
  
  const result = features.generateConfigFile(process.cwd());
  if (result) {
    console.log(`✅ Generated MIP features config: ${result}`);
    console.log(`   Edit this file to enable/disable features`);
    console.log(`   Documentation: https://mipdocs.fwh.is/features`);
  } else {
    console.log(`❌ Failed to generate config file`);
    process.exit(1);
  }
  process.exit(0);
}

// ==========================================
// ОБРАБОТКА --list-features
// ==========================================
function handleListFeatures() {
  features.printFeatures(process.cwd());
  process.exit(0);
}

async function main() {
  // ==========================================
  // ОБРАБОТКА СПЕЦИАЛЬНЫХ ФЛАГОВ
  // ==========================================
  if (process.argv.includes('--genconfig')) {
    handleGenConfig();
    return;
  }
  
  if (process.argv.includes('--list-features')) {
    handleListFeatures();
    return;
  }

  // ==========================================
  // АВТОМАТИЧЕСКАЯ МИГРАЦИЯ СТАРЫХ ПРОЕКТОВ
  // ==========================================
  const migrated = config.migrateToYaml(process.cwd());
  if (migrated && process.env.DEBUG) {
    console.log(`[DEBUG] Yml server finished: file already migrated`);
  }
  
  const lockMigrated = config.migrateLockfile(process.cwd());
  if (lockMigrated && process.env.DEBUG) {
    console.log(`[DEBUG] Yml server finished: lockfile already migrated`);
  }

  // ==========================================
  // ЗАГРУЖАЕМ ФИЧИ
  // ==========================================
  const mipFeatures = features.loadFeatures(process.cwd());

  // ==========================================
  // ЗАГРУЖАЕМ КАСТОМНЫЕ ЯЗЫКИ ИЗ ПЛАГИНОВ
  // ==========================================
  i18n.loadCustomLocales(process.cwd());

  // ==========================================
  // СОЗДАЁМ ГЛОБАЛЬНЫЙ ЛОАДЕР (ЕСЛИ НЕТ)
  // ==========================================
  ensureGlobalLoader();

  // ==========================================
  // ВКЛЮЧАЕМ ХУК ДЛЯ require() СРАЗУ
  // ==========================================
  loader.setupLoader();

  const { loadLangForCwd, getI18n } = require('../lib/i18n');
  const getT = () => getI18n(loadLangForCwd(process.cwd())).t;

  // ==========================================
  // ПРОВЕРКА ВЕРСИИ (если включена)
  // ==========================================
  if (!versionChecked && mipFeatures['update.checkForUpdates'] !== false) {
    versionChecked = true;
    await checkForUpdates(currentVersion, getT());
  }

  // fast
  if ((command === 'install' || command === 'i') && isSuperFast) {
    await superInstall(arg, getT());
    return;
  }

  // simple commands
  switch (command) {
    case 'init':
      await init();
      break;

    case 'language':
      await require('../lib/commands/language').language(arg);
      break;

    case 'install':
    case 'i': {
      const args = process.argv.slice(3);
      const options = {
        saveDev: process.argv.includes('--save-dev') || process.argv.includes('-D'),
        global: process.argv.includes('-g') || process.argv.includes('--global'),
        force: process.argv.includes('--force') || process.argv.includes('-f'),
        noSave: process.argv.includes('--no-save'),
      };
      
      const packageNames = args.filter(a => !a.startsWith('-'));
      
      await install(packageNames.length > 0 ? packageNames : undefined, options);
      break;
    }

    case 'uninstall':
    case 'rm':
      await uninstall(arg);
      break;

    case 'list':
    case 'ls':
      await list();
      break;

    case 'update':
    case 'up':
      await update();
      break;

    case 'search':
      await search(arg);
      break;

    case 'info':
      await info(arg);
      break;

    case 'outdated':
      await outdated();
      break;

    case 'audit': {
      const { audit } = require('../lib/commands/audit');
      await audit({
        fix: process.argv.includes('--fix'),
      });
      break;
    }

    case 'legacy': {
      const { legacy } = require('../lib/commands/legacy');
      await legacy(arg, process.argv[4]);
      break;
    }

    case 'ci': {
      const { ci } = require('../lib/commands/ci');
      await ci({
        frozenLockfile: process.argv.includes('--frozen-lockfile'),
      });
      break;
    }

    case 'run':
      await runScript(arg);
      break;

    case 'create':
      await createProject(arg, process.argv[4]);
      break;

    case 'cache': {
      const args = process.argv.slice(3);
      const options = {
        global: args.includes('--global') || args.includes('-g'),
      };
      await cacheCommand(arg, options);
      break;
    }

    case 'doctor':
      await doctor();
      break;

    case 'why':
      await why(arg);
      break;

    case 'exec':
      await execCommand(arg);
      break;

    case 'workspaces':
      await workspacesCommand(arg, process.argv[4]);
      break;

    case 'repo': {
      const { repo } = require('../lib/commands/repo');
      const branchIndex = process.argv.indexOf('--branch');
      const branch = branchIndex !== -1 ? process.argv[branchIndex + 1] : 'main';
      const pathIndex = process.argv.indexOf('--path');
      const downloadPath = pathIndex !== -1 ? process.argv[pathIndex + 1] : 'download';
      await repo(arg, {
        branch: branch || 'main',
        downloadPath: downloadPath || 'download',
      });
      break;
    }

    case 'oldrepo': {
      const { repo } = require('../lib/commands/oldrepo');
      const branchIndex = process.argv.indexOf('--branch');
      const branch = branchIndex !== -1 ? process.argv[branchIndex + 1] : 'main';
      const pathIndex = process.argv.indexOf('--path');
      const downloadPath = pathIndex !== -1 ? process.argv[pathIndex + 1] : 'download';
      await repo(arg, {
        branch: branch || 'main',
        downloadPath: downloadPath || 'download',
      });
      break;
    }

    case '--help':
    case '-h':
      showHelp(getT(), pkg.version);
      break;

    case '--version':
    case '-v':
      console.log(getT()('cli.version', { version: pkg.version }));
      break;

    case 'dedupe': {
      const { dedupe } = require('../lib/commands/dedupe');
      await dedupe({
        full: process.argv.includes('--full') || process.argv.includes('-f'),
      });
      break;
    }

    case 'plugin': {
      const { plugin } = require('../lib/commands/plugin');
      const action = process.argv[3];
      const name = process.argv[4];
      await plugin(action, name);
      break;
    }

    case 'registry': {
      const { registry } = require('../lib/commands/registry');
      const argv = process.argv.slice(3);
      registry(argv);
      break;
    }

    case 'pe': {
      const { pe } = require('../lib/commands/pe');
      const pluginName = process.argv[3];
      const commandName = process.argv[4];
      const args = process.argv.slice(5);
      await pe(pluginName, commandName, args);
      break;
    }

    case 'config': {
      const { config } = require('../lib/commands/config');
      const argv = process.argv.slice(3);
      config(argv);
      break;
    }

    case 'server': {
      const { server } = require('../lib/commands/server');
      const argv = process.argv.slice(3);
      server(argv);
      break;
    }

    case 'publish': {
      const { publish } = require('../lib/commands/publish');
      const argv = process.argv.slice(3);
      publish(argv);
      break;
    }

    case 'genlock': {
      const { genlock } = require('../lib/commands/genlock');
      await genlock();
      break;
    }

    case 'exports': {
      const { exports } = require('../lib/commands/exports');
      await exports(arg);
      break;
    }

    default: {
      // Проверяем команды плагинов через ЕДИНЫЙ экземпляр api
      const registeredCommands = api.getRegisteredCommands();
      
      if (registeredCommands && registeredCommands.has(command)) {
        const args = process.argv.slice(3);
        try {
          await api.runRegisteredCommand(command, args);
          break;
        } catch (err) {
          console.error(err.message);
          break;
        }
      }

      const t = getT();
      console.log(t('cli.unknown_command', { command }));
      console.log(t('cli.try_help'));
      break;
    }
  }
}

// ==========================================
// fast install
// ==========================================
async function superInstall(packageName, t) {
  console.log(t('super.mode_start'));

  const startTime = Date.now();
  const { getPackageInfo } = require('../lib/utils/registry');
  const axios = require('axios');

  async function fastDownload(name, version) {
    const info = await getPackageInfo(name, version);
    const url = info.tarball;

    console.log(t('super.downloading', { name, version: info.version }));
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    const cacheDir = path.join(process.cwd(), '.mip', name, info.version);
    fs.mkdirSync(cacheDir, { recursive: true });

    const { StreamExtractor } = require('../lib/utils/stream-extract');
    await StreamExtractor.extractToDir(response.data, cacheDir);

    const installPath = path.join(process.cwd(), 'node_modules', name);
    if (fs.existsSync(installPath)) fs.rmSync(installPath, { recursive: true, force: true });
    fs.symlinkSync(cacheDir, installPath, 'junction');

    return info;
  }

  if (!packageName) {
    const config = JSON.parse(fs.readFileSync('mip.json', 'utf8'));
    const deps = { ...config.dependencies, ...config.devDependencies };
    const packages = Object.entries(deps);

    console.log(t('super.installing_all', { count: packages.length }));

    const promises = packages.map(([name, version]) => fastDownload(name, version));
    await Promise.all(promises);
  } else {
    const [name, version] = packageName.includes('@')
      ? packageName.split('@')
      : [packageName, 'latest'];
    await fastDownload(name, version);

    const pkgPath = 'mip.json';
    if (fs.existsSync(pkgPath)) {
      const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const depType = process.argv.includes('--save-dev') ? 'devDependencies' : 'dependencies';
      if (!config[depType]) config[depType] = {};
      config[depType][name] = version;
      fs.writeFileSync(pkgPath, JSON.stringify(config, null, 2));
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(t('super.done', { ms: totalTime }));
}

// ==========================================
// Команды
// ==========================================
async function init() {
  return require('../lib/commands/init').init();
}
async function install(pkg, opts) {
  return require('../lib/commands/install').install(pkg, opts);
}
async function uninstall(pkg) {
  return require('../lib/commands/uninstall').uninstall(pkg);
}
async function list() {
  return require('../lib/commands/list').list();
}
async function update() {
  return require('../lib/commands/update').update();
}
async function search(q) {
  return require('../lib/commands/search').search(q);
}
async function info(pkg) {
  return require('../lib/commands/info').info(pkg);
}
async function outdated() {
  return require('../lib/commands/outdated').outdated();
}
async function runScript(s) {
  return require('../lib/commands/run').run(s);
}
async function createProject(t, n) {
  return require('../lib/commands/create').create(t, n);
}
async function cacheCommand(a, opts) {
  return require('../lib/commands/cache').cache(a, opts);
}
async function doctor() {
  return require('../lib/commands/doctor').doctor();
}
async function why(pkg) {
  return require('../lib/commands/why').why(pkg);
}
async function execCommand(cmd) {
  return require('../lib/commands/exec').exec(cmd);
}
async function workspacesCommand(a, b) {
  return require('../lib/commands/workspaces').workspaces(a, b);
}

function showHelp(t, version) {
  console.log(t('cli.help.full', { version }));
}

// ==========================================
// Проверка обновлений
// ==========================================
async function checkForUpdates(currentVersion, t) {
  try {
    const axios = require('axios');
    const response = await axios.get(VERSION_CHECK_URL, {
      timeout: 2000,
      transformResponse: [data => data]
    });

    const lines = response.data.split('\n');
    let latestVersion = null;

    for (const line of lines) {
      if (line.startsWith('MIP_LATEST=')) {
        latestVersion = line.split('=')[1].trim();
        break;
      }
    }

    if (latestVersion && latestVersion !== currentVersion) {
      console.log('\n' + t('cli.update_available', {
        current: currentVersion,
        latest: latestVersion
      }));
    }
  } catch (err) {
    // Молча игнорируем ошибки сети
  }
}

// ==========================================
// Запуск
// ==========================================
main().catch(err => {
  const { loadLangForCwd, getI18n } = require('../lib/i18n');
  const pkg = require('../package.json');
  const t = getI18n(loadLangForCwd(process.cwd())).t;
  console.error(t('cli.error', { message: err.message, version: pkg.version }));
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});