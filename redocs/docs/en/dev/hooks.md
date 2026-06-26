---
title: "Hooks and plugins in MIP"
description: "How to extend MIP with hooks and plugins — entry points, API, examples."
---

# Hooks and plugins in MIP

MIP has a built-in hooks and plugins system that allows extending functionality without modifying the core code.

---

## 🧩 What are hooks?

Hooks are places in the MIP code where you can insert your own logic. Plugins subscribe to hooks and execute code at the right moments.

**Example:** a plugin can execute code **before** a package is installed or **after** an audit.

---

## 📋 Full list of hooks

### Installation

| Hook | When called | Arguments |
|------|-------------|-----------|
| `beforeInstall` | Before package installation | `(pkg, version, options)` |
| `afterInstall` | After package installation | `(pkgInfo)` |
| `beforeUninstall` | Before package removal | `(pkg, options)` |
| `afterUninstall` | After package removal | `(pkg)` |
| `beforeUpdate` | Before update | `(pkg, currentVersion, newVersion)` |
| `afterUpdate` | After update | `(pkg, oldVersion, newVersion)` |

### Resolution

| Hook | When called | Arguments |
|------|-------------|-----------|
| `beforeResolve` | Before version resolution | `(pkg, versionRange)` |
| `afterResolve` | After resolution | `(pkgInfo)` |

### Download and extraction

| Hook | When called | Arguments |
|------|-------------|-----------|
| `beforeDownload` | Before tarball download | `(pkg, version, url)` |
| `afterDownload` | After download | `(pkg, version, size, duration)` |
| `beforeExtract` | Before extraction | `(pkg, version, targetDir)` |
| `afterExtract` | After extraction | `(pkg, version, targetDir)` |

### Cache

| Hook | When called | Arguments |
|------|-------------|-----------|
| `beforeCacheRead` | Before cache read | `(pkg, version)` |
| `afterCacheRead` | After cache read | `(pkg, version, data)` |
| `beforeCacheWrite` | Before cache write | `(pkg, version, data)` |
| `afterCacheWrite` | After cache write | `(pkg, version)` |

### Audit and CI

| Hook | When called | Arguments |
|------|-------------|-----------|
| `beforeAudit` | Before audit | `(lockData)` |
| `afterAudit` | After audit | `(results)` |
| `beforeCi` | Before CI installation | `(options)` |
| `afterCi` | After CI installation | `(installedCount)` |

### Errors

| Hook | When called | Arguments |
|------|-------------|-----------|
| `onError` | On error in any command | `(err, context)` |

---

## 🔌 How to use hooks in a plugin

### Example: logger plugin

```javascript
// plugins/logger/index.js
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'logger',
  version: '1.0.0',

  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`[logger] Installing ${pkg}@${version}`);
      this.log(`INSTALL: ${pkg}@${version}`);
    },

    afterInstall: async (pkgInfo) => {
      console.log(`[logger] Installed ${pkgInfo.name}@${pkgInfo.version}`);
      this.log(`INSTALLED: ${pkgInfo.name}@${pkgInfo.version}`);
    },

    onError: async (err) => {
      console.error(`[logger] Error: ${err.message}`);
      this.log(`ERROR: ${err.message}`);
    },
  },

  init: async ({ api }) => {
    this.logFile = path.join(process.cwd(), 'mip-install.log');
    console.log('[logger] Logger plugin initialized');
  },

  log: (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `[${timestamp}] ${message}\n`);
  },
};
```

---

## 🛠️ API for plugins

In `init()`, the plugin receives an `api` object with methods:

| Method | Description |
|-------|----------|
| `api.registerCommand(name, plugin, handler)` | Registers a command |
| `api.getMipJson()` | Reads `mip.yml` |
| `api.updateMipJson(data)` | Updates `mip.yml` |
| `api.getLockfile()` | Reads `mip-lock.yml` |
| `api.updateLockfile(data)` | Updates `mip-lock.yml` |
| `api.getPackageInfo(name, version)` | Gets package information |
| `api.getInstalledPackages()` | List of installed packages |
| `api.log(message, level)` | Logging |
| `api.getVersion()` | MIP version |
| `api.exec(command, options)` | Executes a shell command |

---

## 📦 Example: auditor plugin

```javascript
// plugins/auditor/index.js
module.exports = {
  name: 'auditor',
  version: '1.0.0',

  hooks: {
    beforeAudit: async (lockData) => {
      console.log('[auditor] Starting audit...');
      const total = Object.keys(lockData.packages || {}).length;
      console.log(`[auditor] Scanning ${total} packages`);
    },

    afterAudit: async (results) => {
      const critical = results.filter(r => r.severity === 'critical').length;
      const high = results.filter(r => r.severity === 'high').length;
      
      console.log(`[auditor] Critical: ${critical}, High: ${high}`);
      
      if (critical > 0) {
        console.log('[auditor] ⚠️ Critical vulnerabilities found!');
      }
    },
  },

  init: async ({ api }) => {
    console.log('[auditor] Auditor plugin loaded');
  },
};
```

---

## 🚀 How to create and use a plugin

### 1. Create the plugin

```bash
mip plugin create logger
```

### 2. Paste the code above into `plugins/logger/index.js`

### 3. Compile and activate

```bash
mip plugin compile logger
mip plugin activate logger
```

### 4. Test it

```bash
mip install lodash
```

Output:
```
[logger] Installing lodash@latest
[logger] Installed lodash
```

---

## 📂 Where hooks are located in the code

| Hook | File |
|------|------|
| `beforeInstall` | `lib/commands/install.js` |
| `afterInstall` | `lib/commands/install.js` |
| `beforeResolve` | `lib/core/resolver.js` |
| `afterResolve` | `lib/core/resolver.js` |
| `beforeDownload` | `lib/core/parallel-download.js` |
| `afterDownload` | `lib/core/parallel-download.js` |
| `beforeAudit` | `lib/commands/audit.js` |
| `afterAudit` | `lib/commands/audit.js` |
| `onError` | `lib/commands/*.js` |

---

## 🧪 Testing plugins

```bash
# Create a plugin
mip plugin create test-plugin

# Add hooks to index.js

# Compile
mip plugin compile test-plugin

# Activate
mip plugin activate test-plugin

# Test (install a package)
mip install lodash

# View logs
cat mip-install.log
```

---

## Related pages

- [Adding commands](/dev/adding-commands) — how to create a command
- [MIP Architecture](/dev/architecture) — project structure
- [mip plugin](/commands/plugin) — manage plugins
