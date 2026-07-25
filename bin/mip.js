#!/usr/bin/env node

// god save the code

const fs = require('fs');
const path = require('path');
const os = require('os');

// debug? really? who uses that
(({env:{DEBUG_RUN:d}={}}={},f=__filename)=>(d==='1'?console.log.bind(console,'DBR+Running File:',f||'unknown'):()=>{})())()

// update cache coz we nice guys dont hammer network
const UPDATE_CACHE_PATH = path.join(os.homedir(), '.mip', 'update-cache.json');

function getLastUpdateCheck() {
  try {
    if (!fs.existsSync(UPDATE_CACHE_PATH)) return 0;
    const data = JSON.parse(fs.readFileSync(UPDATE_CACHE_PATH, 'utf8'));
    return data.timestamp || 0;
  } catch {
    return 0; // if broken then its feature not bug
  }
}

function saveUpdateCheck() {
  try {
    const dir = path.dirname(UPDATE_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(UPDATE_CACHE_PATH, JSON.stringify({ timestamp: Date.now() }));
  } catch {
    // who cares about write errors really
  }
}

// parsing args like its 1999
const rawInput = process.argv.slice(2).join(' ');
const isSuperFast = process.argv.includes('--super') || process.argv.includes('-s');
const isGenConfig = process.argv.includes('--genconfig');
const isListFeatures = process.argv.includes('--list-features');
const isHelp = process.argv.includes('--help') || process.argv.includes('-h');
const isVersion = process.argv.includes('--version') || process.argv.includes('-v');

// help and version - fast as flash
if (isHelp || isVersion) {
  const lang = require('../lib/i18n').loadLangForCwd(process.cwd());
  const { t } = require('../lib/i18n').getI18n(lang);
  const pkg = require('../package.json');
  
  if (isVersion) {
    console.log(t('cli.version', { version: pkg.version }));
    process.exit(0);
  }
  
  if (isHelp) {
    console.log(t('cli.help.full', { version: pkg.version }));
    process.exit(0);
  }
}

// genconfig - make config or die trying
if (isGenConfig) {
  const features = require('../lib/utils/features');
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
    console.log(`   Documentation: https://mipdocs.fwh.is/features`);
  } else {
    console.log(`❌ Failed to generate config file`);
    process.exit(1);
  }
  process.exit(0);
}

// list features - show what we got
if (isListFeatures) {
  const features = require('../lib/utils/features');
  features.printFeatures(process.cwd());
  process.exit(0);
}

// main load - finally
const { resolveAlias } = require('../lib/commands/alias');
const { handleCommand } = require('./mip-commands');
const { getApiMethods } = require('../lib/api/api-methods');
const loader = require('../lib/loader');
const config = require('../lib/utils/config');
const i18n = require('../lib/i18n');
const features = require('../lib/utils/features');
const motd = require('../lib/utils/motd');

const api = getApiMethods();

const resolved = resolveAlias(rawInput);
const command = resolved.command;
const args = resolved.args || [];
const arg = args[0] || process.argv[3];

const originalArgv = process.argv;
process.argv = [originalArgv[0], originalArgv[1], command, ...args];

const pkg = require('../package.json');
const currentVersion = pkg.version;
const VERSION_CHECK_URL = 'https://kiwinatra.github.io/ver';
let versionChecked = false;

// global loader - if it exists use it if not make it
function ensureGlobalLoader() {
  const loaderPath = path.join(os.homedir(), '.mip', 'loader.js');
  if (fs.existsSync(loaderPath)) return loaderPath;
  
  fs.mkdirSync(path.dirname(loaderPath), { recursive: true });
  const loaderContent = `// ~/.mip/loader.js - global loader for MIP
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
          } catch (err) {}
        }
      }
      return originalRequire.call(this, id);
    };
  } catch (err) {}
}`;
  
  fs.writeFileSync(loaderPath, loaderContent);
  if (process.env.DEBUG) console.log(`✅ Created global loader at ${loaderPath}`);
  return loaderPath;
}

// main function - where magic happens
async function main() {
  // migrate old stuff if it exists
  const hasOldConfig = fs.existsSync('mip.json') || fs.existsSync('package.json');
  const hasOldLock = fs.existsSync('mip-lock.json');
  
  if (hasOldConfig && process.env.DEBUG) {
    const migrated = config.migrateToYaml(process.cwd());
    if (migrated) console.log('[DEBUG] Migrated config to mip.yml');
  }
  
  if (hasOldLock && process.env.DEBUG) {
    const lockMigrated = config.migrateLockfile(process.cwd());
    if (lockMigrated) console.log('[DEBUG] Migrated lockfile to mip-lock.yml');
  }

  // load features if needed
  const mipFeatures = shouldLoadFeatures(command) 
    ? features.loadFeatures(process.cwd()) 
    : {};

  // custom languages from plugins - because why not
  const mipRoot = path.resolve(__dirname, '..');
  const globalPluginsRoot = path.join(mipRoot, 'mip-plugins');
  const globalPluginsDir = path.join(globalPluginsRoot, 'plugins');

  if (fs.existsSync(globalPluginsRoot) && fs.existsSync(globalPluginsDir)) {
    i18n.loadCustomLocales(globalPluginsRoot);
  }

  if (fs.existsSync(path.join(process.cwd(), 'plugins'))) {
    i18n.loadCustomLocales(process.cwd());
  }

  try {
    const langPluginRoot = path.join(mipRoot, 'mip-plugins', 'mip-lang');
    const templatesDir = path.join(langPluginRoot, 'templates');
    if (fs.existsSync(templatesDir)) {
      for (const file of fs.readdirSync(templatesDir)) {
        if (!file.endsWith('.json')) continue;
        const lang = path.basename(file, '.json');
        const content = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
        i18n.customLocales = i18n.customLocales || {};
        i18n.customLanguages = i18n.customLanguages || [];
        i18n.customLocales[lang] = content;
        if (!i18n.customLanguages.includes(lang)) i18n.customLanguages.push(lang);
      }
    }
  } catch (e) {
    // silence is golden
  }

  // global loader - setup or die
  ensureGlobalLoader();
  loader.setupLoader();

  // i18n - just the language we need
  const { loadLangForCwd, getI18n } = require('../lib/i18n');
  const lang = loadLangForCwd(process.cwd());
  const getT = () => getI18n(lang).t;

  // motd - because everyone loves messages
  if (mipFeatures['motd.enabled'] !== false) {
    motd.showMOTD(process.cwd());
  }

  // version check - once per day like vitamins
  const lastCheck = getLastUpdateCheck();
  if (!versionChecked && mipFeatures['update.checkForUpdates'] !== false && 
      (Date.now() - lastCheck > 86400000)) {
    versionChecked = true;
    await checkForUpdates(currentVersion, getT());
    saveUpdateCheck();
  }

  // super fast install - for impatient people
  if ((command === 'install' || command === 'i') && isSuperFast) {
    await superInstall(arg, getT());
    return;
  }

  // options - because flags are life
  const options = {
    saveDev: process.argv.includes('--save-dev') || process.argv.includes('-D'),
    global: process.argv.includes('-g') || process.argv.includes('--global'),
    force: process.argv.includes('--force') || process.argv.includes('-f'),
    noSave: process.argv.includes('--no-save'),
  };

  // execute command - the main event
  const result = await handleCommand(command, arg, args, options, getT);

  // plugins - because we are extensible
  if (result === null) {
    const registeredCommands = api.getRegisteredCommands();
    if (registeredCommands && registeredCommands.has(command)) {
      try {
        await api.runRegisteredCommand(command, process.argv.slice(3));
        return;
      } catch (err) {
        console.error(err.message);
        return;
      }
    }

    const t = getT();
    console.log(t('cli.unknown_command', { command }));
    console.log(t('cli.try_help'));
  }
}

// do we really need features? lets think about it
function shouldLoadFeatures(command) {
  const skipFeatures = [
    '--help', '-h', '--version', '-v', 
    'init', 'hello', 'h', 'feel',
    'alias', 'config', 'registry'
  ];
  return !skipFeatures.includes(command);
}

// super install - fast and furious style
async function superInstall(packageName, t) {
  console.log(t('super.mode_start'));
  const startTime = Date.now();
  const { getPackageInfo } = require('../lib/utils/registry');
  const axios = require('axios');

  async function fastDownload(name, version) {
    const info = await getPackageInfo(name, version);
    const response = await axios.get(info.tarball, { responseType: 'arraybuffer' });
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
    await Promise.all(packages.map(([name, version]) => fastDownload(name, version)));
  } else {
    const [name, version] = packageName.includes('@') ? packageName.split('@') : [packageName, 'latest'];
    await fastDownload(name, version);
  }

  console.log(t('super.done', { ms: Date.now() - startTime }));
}

// check updates - dont bother user too much
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
      console.log('\n' + t('cli.update_available', { current: currentVersion, latest: latestVersion }));
    }
  } catch (err) {}
}

// run it or die trying
main().catch(err => {
  const { loadLangForCwd, getI18n } = require('../lib/i18n');
  const pkg = require('../package.json');
  const t = getI18n(loadLangForCwd(process.cwd())).t;
  console.error(t('cli.error', { message: err.message, version: pkg.version }));
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});