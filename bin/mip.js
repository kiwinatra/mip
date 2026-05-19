#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Определяем режим супер-установки
const isSuperFast = process.argv.includes('--super') || process.argv.includes('-s');
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  const { loadLangForCwd, getI18n } = require('../lib/i18n');
  const pkg = require('../package.json');
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  // СУПЕР-БЫСТРЫЙ РЕЖИМ
  if ((command === 'install' || command === 'i') && isSuperFast) {
    await superInstall(arg);
    return;
  }

  // Обычные команды
  switch (command) {
    case 'init':
      await init();
      break;

    case 'language':
      // mip language <lang>
      await require('../lib/commands/language').language(arg);
      break;

    case 'install':
    case 'i':
      await install(arg, {
        saveDev: process.argv.includes('--save-dev') || process.argv.includes('-D'),
        global: process.argv.includes('-g') || process.argv.includes('--global'),
        force: process.argv.includes('--force') || process.argv.includes('-f')
      });
      break;

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

    case 'audit':
      await audit();
      break;

    case 'ci':
      await ci();
      break;

    case 'run':
      await runScript(arg);
      break;

    case 'create':
      await createProject(arg, process.argv[4]);
      break;

    case 'cache':
      await cacheCommand(arg);
      break;

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

    case '--help':
    case '-h':
      showHelp(t, pkg.version);
      break;

    case '--version':
    case '-v':
      console.log(t('cli.version', { version: pkg.version }));
      break;
    
    case 'dedupe':
      const { dedupe } = require('../lib/commands/dedupe');
      await dedupe({
      full: process.argv.includes('--full') || process.argv.includes('-f')
  });
  break;

  case 'genlock':
  const { genlock } = require('../lib/commands/genlock');
  await genlock();
  break;

  case 'exports':
  const { exports } = require('../lib/commands/exports');
  await exports(arg);
  break;

    default:
      console.log(t('cli.unknown_command', { command }));
      console.log(t('cli.try_help'));
  }
}

// СУПЕР-БЫСТРАЯ УСТАНОВКА (встроенная, без лишних зависимостей)
async function superInstall(packageName) {
  console.log(t('super.mode_start'));
  
  const startTime = Date.now();
  const { getPackageInfo } = require('../lib/utils/registry');
  const { execSync } = require('child_process');
  const axios = require('axios');
  
  // Функция быстрого скачивания
  async function fastDownload(name, version) {
    const info = await getPackageInfo(name, version);
    const url = info.tarball;
    
    console.log(t('super.downloading', { name, version: info.version }));
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    const cacheDir = path.join(process.cwd(), '.mip', name, info.version);
    fs.mkdirSync(cacheDir, { recursive: true });
    
    // Распаковка на лету
    execSync(`tar -xzf - -C "${cacheDir}" --strip-components=1`, {
      input: response.data,
      stdio: 'pipe'
    });
    
    // Симлинк
    const installPath = path.join(process.cwd(), 'node_modules', name);
    if (fs.existsSync(installPath)) fs.rmSync(installPath, { recursive: true, force: true });
    fs.symlinkSync(cacheDir, installPath, 'junction');
    
    return info;
  }
  
  if (!packageName) {
    // Установка всех из mip.json
    const config = JSON.parse(fs.readFileSync('mip.json', 'utf8'));
    const deps = { ...config.dependencies, ...config.devDependencies };
    const packages = Object.entries(deps);
    
    console.log(t('super.installing_all', { count: packages.length }));
    
    // Параллельная загрузка
    const promises = packages.map(([name, version]) => fastDownload(name, version));
    await Promise.all(promises);
    
  } else {
    // Установка одного пакета
    const [name, version] = packageName.includes('@') ? packageName.split('@') : [packageName, 'latest'];
    await fastDownload(name, version);
    
    // Обновляем mip.json
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

// Импорт остальных команд
async function init() { return require('../lib/commands/init').init(); }
async function install(pkg, opts) { return require('../lib/commands/install').install(pkg, opts); }
async function uninstall(pkg) { return require('../lib/commands/uninstall').uninstall(pkg); }
async function list() { return require('../lib/commands/list').list(); }
async function update() { return require('../lib/commands/update').update(); }
async function search(q) { return require('../lib/commands/search').search(q); }
async function info(pkg) { return require('../lib/commands/info').info(pkg); }
async function outdated() { return require('../lib/commands/outdated').outdated(); }
async function audit() { return require('../lib/commands/audit').audit(); }
async function ci() { return require('../lib/commands/ci').ci(); }
async function runScript(s) { return require('../lib/commands/run').run(s); }
async function createProject(t, n) { return require('../lib/commands/create').create(t, n); }
async function cacheCommand(a) { return require('../lib/commands/cache').cache(a); }
async function doctor() { return require('../lib/commands/doctor').doctor(); }
async function why(pkg) { return require('../lib/commands/why').why(pkg); }
async function execCommand(cmd) { return require('../lib/commands/exec').exec(cmd); }
async function workspacesCommand(a, b) { return require('../lib/commands/workspaces').workspaces(a, b); }

function showHelp(t, version) {
  console.log(t('cli.help.full', { version }));
}

main().catch(err => {
  const { loadLangForCwd, getI18n } = require('../lib/i18n');
  const pkg = require('../package.json');
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  console.error(t('cli.error', { message: err.message, version: pkg.version }));
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});
