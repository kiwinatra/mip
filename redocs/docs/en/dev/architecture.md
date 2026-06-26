---
title: "MIP Architecture"
description: "How MIP works internally: modules, data flow, file structure, the core, and the plugin API."
---

# MIP Architecture

MIP is a minimal package manager with a modular architecture. Everything is designed for simplicity and extensibility.

---

## 📁 Project structure

```
mip/
├── bin/
│   └── mip.js                 # Entry point. Parses process.argv and calls commands
├── lib/
│   ├── api/                   # Plugin API
│   │   ├── api-methods.js     # Methods available to plugins
│   │   ├── config-handler.js  # Working with plugin configs
│   │   ├── hooks.js           # Hook system
│   │   └── plugin-manager.js  # Plugin management
│   ├── commands/              # All built-in commands
│   │   ├── install.js
│   │   ├── init.js
│   │   ├── audit.js
│   │   └── ...
│   ├── core/                  # Main logic
│   │   ├── resolver.js        # Dependency resolution
│   │   ├── parallel-download.js # Parallel download
│   │   ├── super-cache.js     # Caching
│   │   ├── dedupe.js          # Deduplication
│   │   ├── peer-resolver.js   # Peer dependencies
│   │   ├── auditor.js         # Security audit
│   │   ├── workspace.js       # Monorepos / workspaces
│   │   └── ...
│   ├── i18n/                  # Internationalization
│   │   ├── index.js
│   │   ├── languages.js
│   │   └── locales/           # en.yml, ru.yml, ...
│   ├── ui/
│   │   └── cli.js             # Progress bars, colored output
│   └── utils/                 # Helper utilities
│       ├── config.js          # Work with mip.yml and lockfiles
│       ├── registry.js        # Interactions with the npm registry
│       ├── store.js           # Global cache (~/.mip/store/)
│       ├── http2-agent.js     # HTTP/2 client
│       ├── stream-extract.js  # Tarball extraction
│       └── ...
└── package.json
```

---

## 🔄 Data flow: installing a package

```
1. User: mip install express
2. bin/mip.js → commands/install.js
3. install.js → utils/registry.js (get package information)
4. install.js → core/resolver.js (build the dependency tree)
5. install.js → utils/store.js (check the global cache)
6. install.js → core/parallel-download.js (download packages)
7. install.js → core/super-cache.js (check/store in cache)
8. install.js → utils/stream-extract.js (extract into ~/.mip/store/)
9. install.js → utils/config.js (update mip-lock.yml)
10. install.js → update .mip/manifest.json
11. install.js → create a symlink in node_modules/
12. Done! ✅
```

---

## 🧩 Key components

### `utils/config.js` — configuration handling

A universal loader that supports `mip.yml`, `mip.json`, and `package.json`.

```javascript
const config = require('../utils/config');

// Auto-detect format
const cfg = config.detectConfig();
const conf = config.readConfig();

// Save as YAML
config.writeConfig({ name: 'my-project' });
```

### `utils/store.js` — global cache

Manages package storage in `~/.mip/store/`.

```javascript
const store = require('../utils/store');

// Check if a package exists in the store
if (store.isPackageInStore('lodash', '4.17.21')) {
  // Use from cache
}

// Path to the stored package
const path = store.getPackageStorePath('lodash', '4.17.21');
```

### `core/resolver.js` — dependency resolution

Builds the dependency tree and caches results.

```javascript
const resolver = new DependencyResolver();
const tree = await resolver.resolveVersion('express', 'latest');
// Returns: { name, version, dependencies: { ... } }
```

### `core/parallel-download.js` — parallel download

Downloads up to 10 packages at the same time. Uses HTTP/2.

```javascript
const downloader = new ParallelDownloader();
const packages = await downloader.downloadPackages(tree);
```

### `core/super-cache.js` — 3-level cache

1. In-memory (LRU, 1000 items)
2. Disk (`.mip/cache/`)
3. In-flight (deduplication of parallel requests)

### `core/peer-resolver.js` — peer dependencies

By default, it skips peer warnings. With `--show-peer-warnings`, it shows warnings and asks.

---

## 🌍 Internationalization (i18n)

MIP supports 10 languages: `en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

**How to use in code:**

```javascript
const { loadLangForCwd, getI18n } = require('../i18n');

async function myCommand() {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  console.log(t('commands.my_command.running'));
}
```

**How to add a translation:**

In `lib/i18n/locales/ru.yml`:

```yaml
commands:
  my_command:
    running: "🚀 Launching..."
```

---

## 🔌 Plugins and API

### Plugin system

Plugins live in `plugins/` and are compiled into `~/.mip_cache/plugins/`.

**Plugin structure:**

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',

  commands: {
    hello: async (args) => console.log('Hello!'),
  },

  hooks: {
    beforeInstall: async (pkg) => console.log(`Installing ${pkg}`),
  },

  init: async ({ api }) => {
    console.log('Plugin initialized');
  },
};
```

### Plugin API methods

| Method | Description |
|-------|-------------|
| `api.registerCommand(name, plugin, handler)` | Register a command |
| `api.getMipJson()` | Reads `mip.yml` |
| `api.updateMipJson(data)` | Updates `mip.yml` |
| `api.getLockfile()` | Reads `mip-lock.yml` |
| `api.getPackageInfo(name, version)` | Package information |
| `api.getInstalledPackages()` | List installed packages |
| `api.log(message, level)` | Logging |

---

## 📂 File system

```
~/.mip/
├── store/                 # Global cache
│   ├── lodash/
│   │   └── 4.17.21/
│   │       ├── package.json
│   │       └── index.js
│   └── express/
│       └── 4.18.2/
│           ├── package.json
│           └── lib/
└── global/                # Global packages

project/
├── mip.yml                # Configuration (YAML)
├── mip-lock.yml           # Lockfile (YAML)
├── .mip/
│   ├── manifest.json      # Manifest of installed packages
│   ├── cache/             # Download cache
│   └── packages/          # Local packages (if any)
└── node_modules/          # Symlinks to the global cache
```

---

## 🛠️ Utilities (utils/)

| File | Purpose |
|------|---------|
| `config.js` | Work with `mip.yml`, `mip-lock.yml`, migrations |
| `store.js` | Global cache (`~/.mip/store/`) |
| `registry.js` | Requests to the npm registry |
| `http2-agent.js` | HTTP/2 client |
| `stream-extract.js` | Tarball extraction |
| `parallel.js` | Parallel task execution |

---

## 🔧 Commands

Each command is a separate file in `lib/commands/` exporting an async function.

**Standard template:**

```javascript
const { loadLangForCwd, getI18n } = require('../i18n');
const config = require('../utils/config');

async function myCommand(options = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const conf = config.readConfig();
  console.log(t('commands.my_command.running'));
}

module.exports = { myCommand };
```

**Registration in `bin/mip.js`:**

```javascript
case 'my-command': {
  const { myCommand } = require('../lib/commands/my-command');
  await myCommand({
    verbose: process.argv.includes('--verbose'),
  });
  break;
}
```

---

## 🧪 How everything connects

```
bin/mip.js
    ↓
commands/*.js
    ↓
core/*.js  ← → utils/*.js
    ↓
i18n/  ui/  api/
```

**Plugins** connect via `api/plugin-manager.js` and can:
- Register their own commands
- Attach hooks to MIP events
- Use API methods

---

## Related pages

- [Adding commands](/ru/dev/adding-commands) — how to create a command
- [Hooks & plugins](/ru/dev/hooks) — extending functionality

