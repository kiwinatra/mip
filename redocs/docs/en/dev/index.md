---
title: "For Developers"
description: "Everything a developer needs to know about MIP — architecture, adding commands, testing, and hooks."
---

# For Developers

This section is for people who want to **understand how MIP works** and start contributing changes.

---

## 📚 Contents

| Section | About |
|---------|-------|
| [MIP Architecture](/dev/architecture) | How the project is organized: modules, data flow, and file structure |
| [Adding Commands](/dev/adding-commands) | Two ways to create a command: via fork (built-in) or via a plugin |
| [Hooks & Plugins](/dev/hooks) | How to extend MIP’s functionality |

---

## 🚀 Developer quick start

```bash
# Clone the repository
git clone https://github.com/kiwinatra/mip
cd mip

# Install dependencies
npm install

# Build the project
npm run build

# Run tests (if any)
npm test
```

---

## 🧩 Key components

| Component | File | What it does |
|-----------|------|--------------|
| **CLI** | `bin/mip.js` | Entry point: parses commands and calls handlers |
| **Commands** | `lib/commands/*.js` | Logic of each command (install, audit, ci, etc.) |
| **Core** | `lib/core/*.js` | Main logic: resolving, downloading, caching |
| **Utilities** | `lib/utils/*.js` | Helper functions: registry, configs, extraction |
| **i18n** | `lib/i18n/*.js` | Internationalization: translations and language loading |
| **API** | `lib/api/*.js` | Plugin API: hooks and command registration |

---

## 📁 Project structure

```
mip/
├── bin/
│   └── mip.js                 # Entry point
├── lib/
│   ├── api/                   # Plugin API
│   ├── commands/             # All built-in commands
│   ├── core/                  # Core (resolving, loading, caching)
│   ├── i18n/                  # Translations (10 languages)
│   ├── ui/                    # Progress bars, colored output
│   └── utils/                 # Helper utilities
│   └── index.js               # Proxy exports
├── tests/                     # Tests
├── docs/                      # Documentation
└── package.json
```

---

## 🌍 Internationalization

MIP supports 10 languages: `en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

**How to use it in code:**

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
    running: "🚀 Running my command..."
```

---

## 📦 Adding a command

### Option 1: Built-in command (fork)

This is suitable only for commands that should be part of MIP’s core.

1. Create a file in `lib/commands/`
2. Add it to `bin/mip.js`
3. Add translations in `locales/*.yml`

### Option 2: Plugin command (recommended)

Suitable for all user-defined commands.

1. Create a plugin: `mip plugin create my-plugin`
2. Register the command using `api.registerCommand()` in `init()`
3. Compile and activate

📖 Learn more: [Adding Commands](/dev/adding-commands)

---

## 🔌 Hooks & plugins

Plugins can subscribe to MIP events:

```javascript
module.exports = {
  name: 'my-plugin',
  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`Installing ${pkg}@${version}`);
    },
    afterInstall: async (pkgInfo) => {
      console.log(`Installed ${pkgInfo.name}`);
    },
    onError: async (err) => {
      console.error(`Error: ${err.message}`);
    },
  },
};
```

📖 Learn more: [Hooks & Plugins](/dev/hooks)

---

## 🛠️ Useful development commands

```bash
# Build
npm run build

# Run in development mode
node bin/mip.js <command>

# Debug logs
DEBUG=1 node bin/mip.js <command>

# Clean cache
mip cache clean
```

---

## 📚 Useful links

- [Source code](https://github.com/kiwinatra/mip)
- [Report an issue](https://github.com/kiwinatra/mip/issues)
- [MIT License](https://github.com/kiwinatra/mip/blob/main/LICENSE)

---

## ❓ Questions?

If you have questions about development, open an issue or join the discussions. 🚀

