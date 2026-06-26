---
title: "mip plugin — manage plugins"
description: "Plugin management in MIP: creation, compilation, activation, command execution."
---

# mip plugin

MIP has a built-in plugin system. Plugins allow you to extend MIP's functionality without modifying the core code.

---

## Plugin structure

A minimal plugin looks like this:

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My plugin',

  // Plugin commands
  commands: {
    hello: async (args) => {
      console.log('Hello, world!');
    },
  },

  // Hooks
  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`[my-plugin] Installing ${pkg}@${version}`);
    },
  },

  // Initialization
  init: async ({ api }) => {
    console.log('[my-plugin] Initialized');
  },

  // Destruction
  destroy: async () => {
    console.log('[my-plugin] Destroyed');
  },
};
```

---

## Commands

### `mip plugin create <name>`

Creates a new plugin in the `plugins/` folder:

```bash
mip plugin create my-plugin
```

**Structure:**
```
plugins/my-plugin/
├── index.js       # Plugin code
├── package.json   # Dependencies
├── README.md      # Documentation
└── .gitignore     # Ignored files
```

---

### `mip plugin compile <name>`

Compiles the plugin and saves it to the MIP cache:

```bash
mip plugin compile my-plugin
```

The plugin is saved to `~/.mip_cache/plugins/my-plugin/`.

---

### `mip plugin activate <name>`

Activates the plugin. The plugin is loaded and becomes available:

```bash
mip plugin activate my-plugin
```

Activated plugins are loaded on every MIP startup.

---

### `mip plugin deactivate <name>`

Deactivates the plugin:

```bash
mip plugin deactivate my-plugin
```

---

### `mip plugin list`

Shows all installed plugins and their status:

```bash
mip plugin list
```

Example output:
```
[INFO] Installed plugins (2):
---
  ACTIVE  hello@1.0.0
         /home/user/.mip_cache/plugins/hello
  inactive  my-plugin@1.0.0
         /home/user/.mip_cache/plugins/my-plugin
---
```

---

### `mip plugin remove <name>`

Removes the plugin (from cache and project):

```bash
mip plugin remove my-plugin
```

---

### `mip plugin cleanall`

Completely cleans everything: cache, registry, `plugins/` folder:

```bash
mip plugin cleanall
```

---

## Executing plugin commands

### `mip pe <plugin> <command> [args...]`

Executes a plugin command:

```bash
# Execute the hello command from the hello plugin
mip pe hello hello

# With arguments
mip pe hello hello world
```

---

## Creating a plugin from scratch

### 1. Create the plugin

```bash
mip plugin create hello
```

### 2. Edit `plugins/hello/index.js`

```javascript
module.exports = {
  name: 'hello',
  version: '1.0.0',

  commands: {
    hello: async (args) => {
      const name = args[0] || 'world';
      console.log(`Hello, ${name}! 👋`);
    },
    help: async () => {
      console.log(`
hello commands:
  hello <name>  - Say hello
  help          - Show this help
`);
    },
  },

  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`[hello] Installing ${pkg}@${version}`);
    },
    afterInstall: async (pkgInfo) => {
      console.log(`[hello] Installed ${pkgInfo.name}`);
    },
    onError: async (err) => {
      console.error(`[hello] Error: ${err.message}`);
    },
  },

  init: async ({ api }) => {
    console.log('[hello] Initialized');
  },

  destroy: async () => {
    console.log('[hello] Destroyed');
  },
};
```

### 3. Compile and activate

```bash
mip plugin compile hello
mip plugin activate hello
```

### 4. Test it

```bash
mip pe hello hello
# Hello, world! 👋

mip pe hello hello zshx
# Hello, zshx! 👋

mip pe hello help
# Shows help
```

---

## Hooks

Plugins can subscribe to MIP events:

| Hook | When called |
|------|-------------|
| `beforeInstall` | Before package installation |
| `afterInstall` | After package installation |
| `beforeUninstall` | Before package removal |
| `afterUninstall` | After package removal |
| `beforeUpdate` | Before package update |
| `afterUpdate` | After package update |
| `beforeResolve` | Before dependency resolution |
| `afterResolve` | After resolution |
| `beforeDownload` | Before tarball download |
| `afterDownload` | After download |
| `beforeExtract` | Before extraction |
| `afterExtract` | After extraction |
| `beforeCacheRead` | Before cache read |
| `afterCacheRead` | After cache read |
| `beforeCacheWrite` | Before cache write |
| `afterCacheWrite` | After cache write |
| `beforeAudit` | Before audit |
| `afterAudit` | After audit |
| `beforeCi` | Before CI installation |
| `afterCi` | After CI installation |
| `onError` | On error |

---

## Related commands

- [mip plugin](/commands/plugin) — manage plugins
- [mip pe](/commands/pe) — execute plugin commands
