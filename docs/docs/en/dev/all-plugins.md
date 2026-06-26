---
title: "All about plugins in MIP"
description: "Complete guide to plugins: structure, hooks, API, commands, examples and best practices."
---

# All about plugins in MIP 🧩

Plugins are a way to extend MIP without modifying the core code. They can:

- Register their own commands
- Subscribe to events (hooks)
- Read and modify project configuration
- Work with installed packages
- Use the MIP API
- Log actions
- And much more

---

## 📁 Plugin structure

A minimal plugin is a folder with two files:

```
plugins/my-plugin/
├── index.js       # Plugin code
└── package.json   # Metadata (optional)
```

### package.json (optional)

```json
{
  "name": "mip-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "main": "index.js",
  "dependencies": {}
}
```

### index.js — full structure

```javascript
module.exports = {
  // ==========================================
  // REQUIRED
  // ==========================================
  name: 'my-plugin',           // Unique name
  version: '1.0.0',            // Version

  // ==========================================
  // COMMANDS (available via mip pe)
  // ==========================================
  commands: {
    mycommand: async (args) => {
      console.log('My command executed!');
    },
    help: async () => {
      console.log('Available commands: mycommand');
    },
  },

  // ==========================================
  // HOOKS (subscribe to MIP events)
  // ==========================================
  hooks: {
    beforeInstall: async (pkg, version, options) => {
      console.log(`[my-plugin] Installing ${pkg}@${version}`);
    },
    afterInstall: async (pkgInfo) => {
      console.log(`[my-plugin] Installed ${pkgInfo.name}@${pkgInfo.version}`);
    },
    beforeUninstall: async (pkg, options) => {
      console.log(`[my-plugin] Removing ${pkg}`);
    },
    afterUninstall: async (pkg) => {
      console.log(`[my-plugin] Removed ${pkg}`);
    },
    beforeUpdate: async (pkg, currentVersion, newVersion) => {
      console.log(`[my-plugin] Updating ${pkg} ${currentVersion} -> ${newVersion}`);
    },
    afterUpdate: async (pkg, oldVersion, newVersion) => {
      console.log(`[my-plugin] Updated ${pkg} ${oldVersion} -> ${newVersion}`);
    },
    beforeResolve: async (pkg, versionRange) => {
      console.log(`[my-plugin] Resolving ${pkg}@${versionRange}`);
    },
    afterResolve: async (pkgInfo) => {
      console.log(`[my-plugin] Resolved ${pkgInfo.name}@${pkgInfo.version}`);
    },
    beforeDownload: async (pkg, version, url) => {
      console.log(`[my-plugin] Downloading ${pkg}@${version}`);
    },
    afterDownload: async (pkg, version, size, duration) => {
      console.log(`[my-plugin] Downloaded ${pkg}@${version} (${size} bytes, ${duration}ms)`);
    },
    beforeExtract: async (pkg, version, targetDir) => {
      console.log(`[my-plugin] Extracting ${pkg}@${version} to ${targetDir}`);
    },
    afterExtract: async (pkg, version, targetDir) => {
      console.log(`[my-plugin] Extracted ${pkg}@${version}`);
    },
    beforeCacheRead: async (pkg, version) => {
      console.log(`[my-plugin] Reading cache for ${pkg}@${version}`);
    },
    afterCacheRead: async (pkg, version, data) => {
      console.log(`[my-plugin] Cache read for ${pkg}@${version}`);
    },
    beforeCacheWrite: async (pkg, version, data) => {
      console.log(`[my-plugin] Writing cache for ${pkg}@${version}`);
    },
    afterCacheWrite: async (pkg, version) => {
      console.log(`[my-plugin] Cache written for ${pkg}@${version}`);
    },
    beforeAudit: async (lockData) => {
      console.log(`[my-plugin] Auditing ${Object.keys(lockData.packages || {}).length} packages`);
    },
    afterAudit: async (results) => {
      console.log(`[my-plugin] Found ${results.length} vulnerabilities`);
    },
    beforeCi: async (options) => {
      console.log(`[my-plugin] Running CI install`);
    },
    afterCi: async (installedCount) => {
      console.log(`[my-plugin] CI install complete: ${installedCount} packages`);
    },
    onError: async (err, context) => {
      console.error(`[my-plugin] Error: ${err.message}`);
    },
  },

  // ==========================================
  // INITIALIZATION
  // ==========================================
  init: async ({ api }) => {
    // Dynamic command registration
    api.registerCommand('dynamic', 'my-plugin', async (args) => {
      console.log('Dynamic command!', args);
    });

    // API access
    const version = api.getVersion();
    const cwd = api.getCwd();
    console.log(`[my-plugin] Initialized in ${cwd}, MIP v${version}`);
  },

  // ==========================================
  // DESTRUCTION (on deactivation)
  // ==========================================
  destroy: async () => {
    console.log('[my-plugin] Destroyed');
  },
};
```

---

## 🛠️ API: what's available to plugins

In `init()` and `hooks`, the plugin receives an `api` object with methods:

| Method | Description | Example |
|-------|----------|--------|
| `api.registerCommand(name, plugin, handler)` | Registers a command | `api.registerCommand('hello', 'my', async () => { ... })` |
| `api.getMipJson()` | Reads `mip.yml` | `const config = api.getMipJson()` |
| `api.updateMipJson(data)` | Updates `mip.yml` | `api.updateMipJson({ ...config, version: '2.0.0' })` |
| `api.getLockfile()` | Reads `mip-lock.yml` | `const lock = api.getLockfile()` |
| `api.updateLockfile(data)` | Updates `mip-lock.yml` | `api.updateLockfile({ ...lock, packages: {} })` |
| `api.getPackageInfo(name, version)` | Package information | `const info = await api.getPackageInfo('lodash', 'latest')` |
| `api.getInstalledPackages()` | List of installed packages | `const pkgs = api.getInstalledPackages()` |
| `api.isPackageInstalled(name, version)` | Check if installed | `if (api.isPackageInstalled('lodash')) { ... }` |
| `api.addDependency(name, version, dev)` | Adds a dependency | `api.addDependency('lodash', '^4.17.0', false)` |
| `api.removeDependency(name)` | Removes a dependency | `api.removeDependency('lodash')` |
| `api.runCommand(command, args)` | Runs a MIP command | `api.runCommand('install', ['lodash'])` |
| `api.exec(command, options)` | Runs a shell command | `api.exec('echo "Hello"')` |
| `api.getCacheSize()` | Cache size | `const size = api.getCacheSize()` |
| `api.clearCache()` | Clears cache | `api.clearCache()` |
| `api.getCwd()` | Current directory | `const cwd = api.getCwd()` |
| `api.getVersion()` | MIP version | `const version = api.getVersion()` |
| `api.log(message, level)` | Logging | `api.log('Hello', 'info')` |

---

## 📦 Plugin examples

### 1. Calculator plugin

```javascript
module.exports = {
  name: 'calc',
  version: '1.0.0',

  commands: {
    calc: async (args) => {
      const a = parseFloat(args[0]);
      const op = args[1];
      const b = parseFloat(args[2]);

      if (isNaN(a) || isNaN(b)) {
        console.log('Please enter numbers');
        return;
      }

      const operations = {
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '*': (a, b) => a * b,
        '/': (a, b) => a / b,
      };

      if (!operations[op]) {
        console.log(`Unknown operation: ${op}`);
        return;
      }

      if (op === '/' && b === 0) {
        console.log('Cannot divide by zero!');
        return;
      }

      console.log(`${a} ${op} ${b} = ${operations[op](a, b)}`);
    },
    help: async () => {
      console.log('Usage: mip pe calc <number> <operation> <number>');
      console.log('Operations: + - * /');
    },
  },

  init: async ({ api }) => {
    console.log('[calc] Calculator loaded!');
  },
};
```

### 2. Logger plugin

```javascript
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'logger',
  version: '1.0.0',

  hooks: {
    beforeInstall: async (pkg, version) => {
      this.log(`INSTALL: ${pkg}@${version}`);
    },
    afterInstall: async (pkgInfo) => {
      this.log(`INSTALLED: ${pkgInfo.name}@${pkgInfo.version}`);
    },
    onError: async (err) => {
      this.log(`ERROR: ${err.message}`);
    },
  },

  init: async ({ api }) => {
    this.logFile = path.join(api.getCwd(), 'mip.log');
    this.log('LOG: Plugin initialized');
    console.log('[logger] Logging to mip.log');
  },

  log: (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `[${timestamp}] ${message}\n`);
  },
};
```

### 3. Auditor plugin

```javascript
module.exports = {
  name: 'auditor',
  version: '1.0.0',

  hooks: {
    beforeAudit: async (lockData) => {
      const total = Object.keys(lockData.packages || {}).length;
      this.totalPackages = total;
      console.log(`[auditor] Scanning ${total} packages...`);
    },
    afterAudit: async (results) => {
      const critical = results.filter(r => r.severity === 'critical').length;
      const high = results.filter(r => r.severity === 'high').length;

      console.log(`[auditor] Critical: ${critical}, High: ${high}`);

      if (critical > 0 || high > 0) {
        console.log('[auditor] Vulnerabilities found!');
      }
    },
  },

  init: async ({ api }) => {
    console.log('[auditor] Auditor loaded');
  },
};
```

### 4. Exporter plugin

```javascript
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'exporter',
  version: '1.0.0',

  commands: {
    export: async (args) => {
      const api = this.api;
      const lock = api.getLockfile();
      const mip = api.getMipJson();

      const data = {
        project: mip.name,
        version: mip.version,
        dependencies: Object.keys(lock?.packages || {}).length,
        packages: lock?.packages || {},
      };

      const outputFile = args[0] || 'export.json';
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`Exported to ${outputFile}`);
    },
  },

  init: async ({ api }) => {
    this.api = api;
    console.log('[exporter] Plugin loaded');
  },
};
```

### 5. Cache cleaner plugin

```javascript
module.exports = {
  name: 'cleaner',
  version: '1.0.0',

  commands: {
    clean: async (args) => {
      const api = this.api;
      const size = api.getCacheSize();
      console.log(`Cache size: ${(size / 1024 / 1024).toFixed(2)} MB`);

      if (args.includes('--force')) {
        api.clearCache();
        console.log('Cache cleared');
      } else {
        console.log('Use --force to clear');
      }
    },
  },

  init: async ({ api }) => {
    this.api = api;
    console.log('[cleaner] Plugin loaded');
  },
};
```

---

## 🚀 Plugin management commands

```bash
# Create a plugin
mip plugin create my-plugin

# Compile
mip plugin compile my-plugin

# Activate
mip plugin activate my-plugin

# List plugins
mip plugin list

# Deactivate
mip plugin deactivate my-plugin

# Remove
mip plugin remove my-plugin

# Clean everything
mip plugin cleanall

# Execute plugin command
mip pe my-plugin my-command arg1 arg2

# Execute plugin command (short)
mip pe my-plugin my-command
```

---

## 🧪 Testing plugins

### Isolated testing

```javascript
// tests/plugin.test.js
const plugin = require('../plugins/my-plugin/index');

describe('my-plugin', () => {
  test('plugin has name', () => {
    expect(plugin.name).toBe('my-plugin');
  });

  test('plugin has commands', () => {
    expect(plugin.commands).toBeDefined();
  });

  test('command works', async () => {
    const spy = jest.spyOn(console, 'log');
    await plugin.commands.mycommand(['test']);
    expect(spy).toHaveBeenCalledWith('My command executed!');
    spy.mockRestore();
  });
});
```

### Integration test

```javascript
// tests/integration/plugin.test.js
const { getPluginManager } = require('../lib/api/plugin-manager');

describe('plugin integration', () => {
  test('plugin loaded correctly', () => {
    const pm = getPluginManager();
    const plugin = pm.getPlugin('my-plugin');
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('my-plugin');
  });
});
```

---

## 📊 Comparison: built-in command vs plugin

| Characteristic | Built-in command (fork) | Plugin |
|----------------|-------------------------|--------|
| **Complexity** | Modify `bin/mip.js` | Just create a file |
| **Update** | Rebuild MIP | Recompile plugin |
| **Distribution** | Only via fork | Can be distributed separately |
| **i18n** | ✅ Supported | ❌ No (own translations) |
| **Hooks** | ❌ No | ✅ Yes (hooks) |
| **API** | ❌ No | ✅ Yes (api methods) |
| **Isolation** | In MIP code | Separate folder |
| **Errors** | Break MIP | Only break plugin |

---

## 📚 Related pages

- [mip plugin](/commands/plugin) — manage plugins
- [mip pe](/commands/pe) — execute plugin commands
- [Hooks and plugins](/dev/hooks) — extending functionality
- [Adding commands](/dev/adding-commands) — two ways to add a command
