---
title: "Adding commands to MIP"
description: "How to create and register a new command in MIP — two ways: built-in command (fork) and plugin."
---

# Adding commands to MIP

There are two ways to add a command to MIP:

1. **Built-in command (fork)** — via `bin/mip.js` (for MIP core)
2. **Plugin command** — via `api.registerCommand()` (recommended for extensions)

---

## Method 1: Built-in command (via fork)

Only suitable for commands that should be part of MIP itself. For example, `install`, `init`, `audit`.

### 1. Create a file in `lib/commands/`

```javascript
// lib/commands/my-command.js
const { loadLangForCwd, getI18n } = require('../i18n');

async function myCommand(arg, options = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  
  console.log(t('commands.my_command.running'));
  console.log(`Arg: ${arg}`);
  
  if (options.verbose) {
    console.log('Verbose mode enabled');
  }
  
  console.log(t('commands.my_command.done'));
}

module.exports = { myCommand };
```

### 2. Add to `bin/mip.js`

Add a new `case` in `switch (command)`:

```javascript
case 'my-command': {
  const { myCommand } = require('../lib/commands/my-command');
  const args = process.argv.slice(3);
  
  await myCommand(args[0], {
    verbose: args.includes('--verbose') || args.includes('-v'),
    force: args.includes('--force') || args.includes('-f'),
  });
  break;
}
```

### 3. Add to help

Add a description in `showHelp()`:

```javascript
console.log(`
Commands:
  init                    Create a new project
  install <pkg>           Install a package
  my-command <arg>        My custom command
  // ...
`);
```

### 4. Add translations (i18n)

In `lib/i18n/locales/en.json`:

```json
{
  "commands": {
    "my_command": {
      "running": "🚀 Running my command...",
      "done": "✅ Done!",
      "usage": "📋 Usage: mip my-command <arg> [--verbose]"
    }
  }
}
```

### 5. Rebuild MIP

```bash
npm run build
mip my-command test --verbose
```

---

## Method 2: Plugin command (recommended)

Suitable for all user-defined commands. Commands are registered dynamically via the plugin API.

### 1. Create a plugin

```bash
mip plugin create my-plugin
```

### 2. Edit `plugins/my-plugin/index.js`

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My plugin with custom commands',

  commands: {
    'my-command': async (args) => {
      const name = args[0] || 'world';
      console.log(`Hello, ${name}! 👋`);
    },
    'my-info': async () => {
      console.log('My plugin v1.0.0');
      console.log('Available commands: my-command <name>, my-info');
    },
  },

  init: async ({ api }) => {
    // Alternative method — dynamic registration
    api.registerCommand('my-dynamic', 'my-plugin', async (args) => {
      console.log('Dynamic command!', args);
    });
    
    console.log('[my-plugin] Initialized');
  },

  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`[my-plugin] Installing ${pkg}@${version}`);
    },
  },

  destroy: async () => {
    console.log('[my-plugin] Destroyed');
  },
};
```

### 3. Compile and activate

```bash
mip plugin compile my-plugin
mip plugin activate my-plugin
```

### 4. Use it

```bash
# Command from commands: {}
mip pe my-plugin my-command
mip pe my-plugin my-command zshx
mip pe my-plugin my-info

# Dynamic command from init()
mip pe my-plugin my-dynamic arg1 arg2
```

---

## Comparison of methods

| Characteristic | Fork (built-in) | Plugin |
|----------------|-----------------|--------|
| **Complexity** | Need to modify MIP code | Works in isolation |
| **Update** | Rebuild MIP | Just recompile plugin |
| **Distribution** | Only via MIP fork | Can be distributed separately |
| **i18n** | Supported | No (plugins manage their own) |
| **Recommendation** | For MIP core | For everything else |

---

## API for plugins

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

---

## Related pages

- [mip plugin](/commands/plugin) — manage plugins
- [mip pe](/commands/pe) — execute plugin commands
- [MIP Architecture](/dev/architecture) — project structure
