/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { getPluginManager } = require('../api/plugin-manager');
const { getApiMethods } = require('../api/api-methods');

// ==========================================
// ПУТИ
// ==========================================

function getPluginCacheDir() {
  const home = os.homedir();
  const cachePath = path.join(home, '.mip_cache', 'plugins');
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
  }
  return cachePath;
}

function getPluginRegistryPath() {
  return path.join(getPluginCacheDir(), 'registry.json');
}

function getProjectPluginsDir() {
  const cwd = process.cwd();
  const pluginsDir = path.join(cwd, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }
  return pluginsDir;
}

// ==========================================
// РАБОТА С РЕЕСТРОМ
// ==========================================

function loadRegistry() {
  const registryPath = getPluginRegistryPath();
  if (!fs.existsSync(registryPath)) {
    return { plugins: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch {
    return { plugins: [] };
  }
}

function saveRegistry(registry) {
  const registryPath = getPluginRegistryPath();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

function addPluginToRegistry(name, version, path) {
  const registry = loadRegistry();
  const existing = registry.plugins.find(p => p.name === name);
  if (existing) {
    existing.version = version;
    existing.path = path;
    existing.installed = Date.now();
  } else {
    registry.plugins.push({
      name,
      version,
      path,
      installed: Date.now(),
      active: false,
    });
  }
  saveRegistry(registry);
}

function removePluginFromRegistry(name) {
  const registry = loadRegistry();
  registry.plugins = registry.plugins.filter(p => p.name !== name);
  saveRegistry(registry);
}

function getPluginFromRegistry(name) {
  const registry = loadRegistry();
  return registry.plugins.find(p => p.name === name) || null;
}

function setPluginActive(name, active) {
  const registry = loadRegistry();
  const plugin = registry.plugins.find(p => p.name === name);
  if (plugin) {
    plugin.active = active;
    saveRegistry(registry);
  }
}

function cleanRegistry() {
  const registryPath = getPluginRegistryPath();
  if (fs.existsSync(registryPath)) {
    fs.unlinkSync(registryPath);
  }
  const cacheDir = getPluginCacheDir();
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
      if (file !== 'registry.json') {
        const fullPath = path.join(cacheDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      }
    }
  }
}

// ==========================================
// СОЗДАНИЕ ПЛАГИНА
// ==========================================

function createPlugin(pluginName) {
  const pluginsDir = getProjectPluginsDir();
  const pluginDir = path.join(pluginsDir, pluginName);

  if (fs.existsSync(pluginDir)) {
    console.log(`❌ Plugin ${pluginName} already exists`);
    return;
  }

  if (process.env.DEBUG) {
    console.log(`[INFO] Creating plugin: ${pluginName}`);
  }

  fs.mkdirSync(pluginDir, { recursive: true });

  const packageJson = {
    name: `mip-plugin-${pluginName}`,
    version: '1.0.0',
    description: `MIP plugin: ${pluginName}`,
    main: 'index.js',
    dependencies: {},
  };
  fs.writeFileSync(
    path.join(pluginDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  const indexContent = `
module.exports = {
  name: '${pluginName}',
  version: '1.0.0',
  description: 'MIP plugin: ${pluginName}',

  commands: {
    hello: async (args) => {
      const name = args[0] || 'world';
      console.log(\`[${pluginName}] Hello, \${name}! 👋\`);
    },
    help: async () => {
      console.log(\`
${pluginName} commands:
  hello <name>  - Say hello
  help          - Show this help
\`);
    },
  },

  hooks: {
    beforeInstall: async (pkg, version, options) => {
      console.log(\`[${pluginName}] Installing \${pkg}@\${version}\`);
    },
    afterInstall: async (pkgInfo) => {
      console.log(\`[${pluginName}] Installed \${pkgInfo.name}\`);
    },
    onError: async (err) => {
      console.error(\`[${pluginName}] Error: \${err.message}\`);
    },
  },

  init: async ({ api }) => {
    api.registerCommand('hello', '${pluginName}', async (args) => {
      const name = args[0] || 'world';
      console.log(\`[${pluginName}] Hello, \${name}! 👋\`);
    });
    api.registerCommand('${pluginName}-info', '${pluginName}', async () => {
      console.log(\`${pluginName} plugin v1.0.0\`);
    });
    if (process.env.DEBUG) {
      console.log(\`[${pluginName}] Commands registered\`);
    }
  },

  destroy: async () => {
    if (process.env.DEBUG) {
      console.log(\`[${pluginName}] Destroyed\`);
    }
  },
};
`;
  fs.writeFileSync(path.join(pluginDir, 'index.js'), indexContent.trim());
  fs.writeFileSync(path.join(pluginDir, 'README.md'), `# ${pluginName}\n\nMIP plugin.`);
  fs.writeFileSync(path.join(pluginDir, '.gitignore'), 'node_modules/\n');

  console.log(`✅ Plugin created: ${pluginName}`);
}

// ==========================================
// КОМПИЛЯЦИЯ ПЛАГИНА
// ==========================================

function compilePlugin(pluginName) {
  const pluginsDir = getProjectPluginsDir();
  const pluginDir = path.join(pluginsDir, pluginName);

  if (!fs.existsSync(pluginDir)) {
    console.log(`❌ Plugin ${pluginName} not found`);
    return;
  }

  if (process.env.DEBUG) {
    console.log(`[INFO] Compiling plugin: ${pluginName}`);
  }

  const pkgPath = path.join(pluginDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.log(`❌ package.json not found`);
    return;
  }

  const indexPath = path.join(pluginDir, 'index.js');
  if (!fs.existsSync(indexPath)) {
    console.log(`❌ index.js not found`);
    return;
  }

  if (process.env.DEBUG) {
    console.log(`[INFO] Installing dependencies...`);
  }

  try {
    execSync('npm install --production --silent', {
      cwd: pluginDir,
      stdio: 'pipe',
    });
    if (process.env.DEBUG) {
      console.log(`[OK] Dependencies installed`);
    }
  } catch (err) {
    if (process.env.DEBUG) {
      console.log(`[WARN] npm install failed: ${err.message}`);
      console.log(`[WARN] Continuing anyway...`);
    }
  }

  const cacheDir = getPluginCacheDir();
  const targetDir = path.join(cacheDir, pluginName);

  if (fs.existsSync(targetDir)) {
    if (process.env.DEBUG) {
      console.log(`[INFO] Removing existing cached plugin`);
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  if (process.env.DEBUG) {
    console.log(`[INFO] Copying plugin to cache: ${targetDir}`);
  }

  fs.cpSync(pluginDir, targetDir, { recursive: true });

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  addPluginToRegistry(pluginName, pkg.version, targetDir);

  console.log(`✅ Plugin compiled: ${pluginName}`);
}

// ==========================================
// АКТИВАЦИЯ ПЛАГИНА
// ==========================================

function activatePlugin(pluginName) {
  if (process.env.DEBUG) {
    console.log(`[INFO] Activating plugin: ${pluginName}`);
  }

  const plugin = getPluginFromRegistry(pluginName);
  if (!plugin) {
    console.log(`❌ Plugin ${pluginName} not found in registry`);
    console.log(`💡 Run "mip plugin compile ${pluginName}" first`);
    return;
  }

  if (!fs.existsSync(plugin.path)) {
    console.log(`❌ Plugin path does not exist: ${plugin.path}`);
    return;
  }

  const indexPath = path.join(plugin.path, 'index.js');
  if (!fs.existsSync(indexPath)) {
    console.log(`❌ index.js not found`);
    return;
  }

  setPluginActive(pluginName, true);

  try {
    if (process.env.DEBUG) {
      console.log(`[INFO] Loading plugin from: ${indexPath}`);
    }

    const pm = getPluginManager();

    delete require.cache[require.resolve(indexPath)];
    const pluginModule = require(indexPath);

    pm.register(pluginModule);

    const api = getApiMethods();
    if (pluginModule.commands) {
      for (const [cmdName, cmdFn] of Object.entries(pluginModule.commands)) {
        api.registerCommand(cmdName, pluginName, cmdFn);
        if (process.env.DEBUG) {
          console.log(`[INFO] Registered command: ${pluginName} ${cmdName}`);
        }
      }
    }

    console.log(`✅ Plugin activated: ${pluginName}`);
  } catch (err) {
    console.log(`❌ Activation failed: ${err.message}`);
    setPluginActive(pluginName, false);
  }
}

// ==========================================
// ДЕАКТИВАЦИЯ
// ==========================================

function deactivatePlugin(pluginName) {
  if (process.env.DEBUG) {
    console.log(`[INFO] Deactivating plugin: ${pluginName}`);
  }

  const plugin = getPluginFromRegistry(pluginName);
  if (!plugin) {
    console.log(`❌ Plugin ${pluginName} not found in registry`);
    return;
  }

  try {
    const pm = getPluginManager();
    pm.unregister(pluginName);
    setPluginActive(pluginName, false);
    console.log(`✅ Plugin deactivated: ${pluginName}`);
  } catch (err) {
    console.log(`❌ Deactivation failed: ${err.message}`);
  }
}

// ==========================================
// ВЫПОЛНЕНИЕ КОМАНДЫ ПЛАГИНА
// ==========================================

async function execPluginCommand(pluginName, commandName, args) {
  if (process.env.DEBUG) {
    console.log(`[PE] Executing ${pluginName} ${commandName} with args:`, args);
  }

  try {
    const pm = getPluginManager();
    const result = await pm.runCommand(pluginName, commandName, args);
    return result;
  } catch (err) {
    console.log(`❌ Failed to execute command: ${err.message}`);
    const plugin = pm.getPlugin(pluginName);
    if (plugin && plugin.commands) {
      console.log(`Available commands for ${pluginName}:`);
      for (const cmd of Object.keys(plugin.commands)) {
        console.log(`  - ${cmd}`);
      }
    }
  }
}

// ==========================================
// СПИСОК
// ==========================================

function listPlugins() {
  const registry = loadRegistry();

  if (registry.plugins.length === 0) {
    console.log(`No plugins installed`);
    return;
  }

  console.log(`Installed plugins (${registry.plugins.length}):`);
  console.log('---');
  for (const p of registry.plugins) {
    const status = p.active ? 'ACTIVE' : 'inactive';
    console.log(`  ${status}  ${p.name}@${p.version}`);
    console.log(`         ${p.path}`);
  }
  console.log('---');
}

// ==========================================
// GET PLUGIN FROM CURRENT DIR
// ==========================================

async function getPluginFromDir(pluginName) {
  const cwd = process.cwd();
  const pluginsDir = getProjectPluginsDir();
  const targetDir = path.join(pluginsDir, pluginName);

  const sourceIndex = path.join(cwd, 'index.js');
  const sourcePackage = path.join(cwd, 'package.json');

  if (!fs.existsSync(sourceIndex)) {
    console.log(`❌ No index.js found in current directory`);
    console.log(`💡 Make sure you are in the plugin folder`);
    return;
  }

  if (fs.existsSync(targetDir)) {
    console.log(`❌ Plugin "${pluginName}" already exists in plugins/`);
    console.log(`💡 Remove it first: mip plugin remove ${pluginName}`);
    return;
  }

  if (process.env.DEBUG) {
    console.log(`[INFO] Copying plugin from current directory to plugins/${pluginName}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(sourceIndex, path.join(targetDir, 'index.js'));

  if (fs.existsSync(sourcePackage)) {
    fs.copyFileSync(sourcePackage, path.join(targetDir, 'package.json'));
  } else {
    const pkg = {
      name: `mip-plugin-${pluginName}`,
      version: '1.0.0',
      description: `MIP plugin: ${pluginName}`,
      main: 'index.js',
      dependencies: {},
    };
    fs.writeFileSync(
      path.join(targetDir, 'package.json'),
      JSON.stringify(pkg, null, 2)
    );
  }

  const files = fs.readdirSync(cwd);
  for (const file of files) {
    if (file === 'index.js' || file === 'package.json' || file === 'node_modules') continue;
    const srcPath = path.join(cwd, file);
    const destPath = path.join(targetDir, file);
    if (fs.statSync(srcPath).isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  if (process.env.DEBUG) {
    console.log(`[INFO] Plugin copied to: ${targetDir}`);
  }

  compilePlugin(pluginName);
  activatePlugin(pluginName);

  console.log(`✅ Plugin "${pluginName}" installed, compiled and activated!`);
}

// ==========================================
// УДАЛЕНИЕ
// ==========================================

function removePlugin(pluginName) {
  if (process.env.DEBUG) {
    console.log(`[INFO] Removing plugin: ${pluginName}`);
  }

  const plugin = getPluginFromRegistry(pluginName);
  if (plugin && plugin.active) {
    deactivatePlugin(pluginName);
  }

  removePluginFromRegistry(pluginName);

  const cacheDir = getPluginCacheDir();
  const targetDir = path.join(cacheDir, pluginName);
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  const projectDir = path.join(getProjectPluginsDir(), pluginName);
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }

  console.log(`✅ Plugin removed: ${pluginName}`);
}

// ==========================================
// CLEAN ALL
// ==========================================

function cleanAll() {
  console.log(`Cleaning all plugins...`);

  cleanRegistry();

  const pluginsDir = getProjectPluginsDir();
  if (fs.existsSync(pluginsDir)) {
    fs.rmSync(pluginsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(pluginsDir, { recursive: true });

  console.log(`✅ Clean complete`);
}

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ
// ==========================================

async function plugin(action, name, args = []) {
  if (!action) {
    console.log(`
Usage: mip plugin <action> [name] [args...]

Actions:
  create <name>                 - Create a new plugin
  compile <name>                - Compile plugin to cache
  get <name>                    - Copy plugin from current directory and install
  activate <name>               - Activate plugin
  deactivate <name>             - Deactivate plugin
  exec <name> <command> [args]  - Execute plugin command
  list                          - List all plugins
  remove <name>                 - Remove plugin
  cleanall                      - Clean everything
`);
    return;
  }

  switch (action) {
    case 'create':
      if (!name) {
        console.log(`Usage: mip plugin create <name>`);
        return;
      }
      createPlugin(name);
      break;

    case 'compile':
    case 'c':
      if (!name) {
        console.log(`Usage: mip plugin compile <name>`);
        return;
      }
      compilePlugin(name);
      break;

    case 'activate':
    case 'a':
      if (!name) {
        console.log(`Usage: mip plugin activate <name>`);
        return;
      }
      activatePlugin(name);
      break;

    case 'deactivate':
    case 'd':
      if (!name) {
        console.log(`Usage: mip plugin deactivate <name>`);
        return;
      }
      deactivatePlugin(name);
      break;

    case 'get':
    case 'g':
      if (!name) {
        console.log(`Usage: mip plugin get <name>`);
        console.log(`Run this command in the folder containing your plugin code`);
        return;
      }
      await getPluginFromDir(name);
      break;

    case 'exec':
    case 'e':
      if (!name) {
        console.log(`Usage: mip plugin exec <plugin> <command> [args...]`);
        return;
      }
      const commandName = args[0];
      const commandArgs = args.slice(1);
      if (!commandName) {
        console.log(`Usage: mip plugin exec <plugin> <command> [args...]`);
        return;
      }
      await execPluginCommand(name, commandName, commandArgs);
      break;

    case 'list':
    case 'l':
      listPlugins();
      break;

    case 'remove':
    case 'rm':
      if (!name) {
        console.log(`Usage: mip plugin remove <name>`);
        return;
      }
      removePlugin(name);
      break;

    case 'cleanall':
      cleanAll();
      break;

    default:
      console.log(`Unknown action: ${action}`);
      console.log(`Available: create, compile, activate, deactivate, exec, list, remove, cleanall`);
  }
}

module.exports = { plugin };