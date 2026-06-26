---
title: "Extended FAQ"
description: "Answers to complex questions about MIP — architecture, plugins, debugging, performance."
---

# Extended FAQ ❓

Answers to questions that come up for experienced users and developers.

---

## 📦 General questions

### How is MIP different from npm?
MIP does not duplicate packages in `node_modules`. Instead, all packages are stored in the global cache `~/.mip/store/`. This saves space and speeds up installation.

**Comparison:**
| Feature | npm | MIP |
|---------|-----|-----|
| Package duplication | ✅ Yes | ❌ No |
| Global cache | ❌ No | ✅ Yes |
| Offline mode | ❌ No | ✅ Yes (after first install) |
| Plugins | ❌ No | ✅ Yes |
| YAML configs | ❌ No | ✅ Yes |

### Where are packages stored?
In the global cache `~/.mip/store/`:

```
~/.mip/store/
├── lodash/
│   └── 4.17.21/
│       ├── package.json
│       └── index.js
└── express/
    └── 4.18.2/
        ├── package.json
        └── lib/
```

The project only has symlinks in `node_modules/`.

### Can I delete `~/.mip/`?
Yes, but then you'll have to reinstall all packages.

---

## 🔌 Plugins

### How do I create a plugin?

```bash
mip plugin create my-plugin
```

The plugin will appear in `plugins/my-plugin/`.

### Where are compiled plugins stored?
In `~/.mip_cache/plugins/`.

### How do I run a plugin command?

```bash
mip pe my-plugin my-command
```

### Can I pass arguments to a plugin command?
Yes:

```bash
mip pe my-plugin my-command arg1 arg2
```

### What hooks are available in plugins?
All hooks are described in the [Hooks and plugins](/dev/hooks) section. Main ones:

| Hook | When called |
|------|-------------|
| `beforeInstall` | Before installation |
| `afterInstall` | After installation |
| `onError` | On error |

### Can I use the MIP API in plugins?
Yes. In `init()`, the plugin receives an `api` object:

```javascript
init: async ({ api }) => {
  const config = api.getMipJson();
  const version = api.getVersion();
  console.log(`MIP v${version}`);
}
```

---

## 🐛 Debugging and errors

### How do I enable debug mode?

```bash
DEBUG=1 mip install lodash
```

### Where can I see logs?
Logs are printed to the console. For logger plugins, you can write to a file.

### A command is stuck. What should I do?
Press `Ctrl+C`. If stuck on `npm install` in a plugin — check the plugin's `package.json`.

### Why doesn't `mip pe` see my command?
1. Check that the plugin is activated: `mip plugin list`
2. Check that the command is registered in `commands: {}`
3. Recompile the plugin: `mip plugin compile my-plugin`

---

## 🚀 Performance

### Why is MIP faster than npm?
- Parallel downloading (up to 10 packages at once)
- Three-level caching (SuperCache)
- HTTP/2
- Global cache (no need to re-download)

**Benchmarks:**
```
npm:  4.2s  (cold cache)
pnpm: 3.1s
mip:  2.8s  (cold cache)
mip:  0.4s  (warm cache) ← 10x faster than npm
```

### How do I clear the cache?

```bash
# Local cache
mip cache clean

# Global cache
mip cache clean --global
```

### How do I check cache size?

```bash
mip cache size
mip cache size --global
```

---

## 🔧 Configuration

### Where is the MIP config located?
In `mip.yml` in the project root.

### How do I change the language?

```bash
mip language ru
```

### What languages are supported?
`en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

### How do I migrate from old `mip.json`?
On first run, MIP automatically migrates:
- `mip.json` → `mip.yml` (with backup)
- `mip-lock.json` → `mip-lock.yml` (with backup)

---

## 🧪 CI/CD

### How do I use MIP in CI?

```bash
mip ci
```

### What does `mip ci` do?
Installs packages strictly from `mip-lock.yml`, ignoring `mip.yml`.

### What is `frozen-lockfile`?

```bash
mip ci --frozen-lockfile
```

Checks that the lockfile is synced with `mip.yml`. If there are mismatches — exits with an error.

### How do I check security in CI?

```bash
mip audit
```

---

## 🧩 Working with packages

### How do I install a package without saving to `mip.yml`?

```bash
mip install lodash --no-save
```

### How do I install a specific version?

```bash
mip install lodash@4.17.21
```

### How do I update all packages?

```bash
mip update
```

### How do I remove a package?

```bash
mip uninstall lodash
```

### How do I view installed packages?

```bash
mip list
```

### How do I find out why a package is installed?

```bash
mip why lodash
```

---

## 🛠️ Development

### How do I add my own command to MIP?
Two ways:

1. **Built-in command (fork):** modify `bin/mip.js`
2. **Plugin:** via `api.registerCommand()`

See: [Adding commands](/dev/adding-commands).

### How do I test a plugin?

```bash
mip plugin compile my-plugin
mip plugin activate my-plugin
mip pe my-plugin my-command
```

---

## ❓ If you didn't find an answer

Open an issue on GitHub: [https://github.com/kiwinatra/mip/issues](https://github.com/kiwinatra/mip/issues)

---

## Related pages

- [MIP Architecture](/dev/architecture) — project structure
- [Hooks and plugins](/dev/hooks) — extending functionality
- [mip plugin](/commands/plugin) — manage plugins
