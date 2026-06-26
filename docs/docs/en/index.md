---
title: "MIP — a fast and modern package manager"
description: "MIP is a lightweight and fast package manager for Node.js written in JavaScript. Easy to use, works without node_modules, and supports YAML configuration."
---

# Welcome to MIP! 🚀

**MIP** (MInimal Package Manager) is a lightweight and fast package manager for Node.js, written in clean JavaScript.

::: callout info "What is MIP?" icon:info
MIP is an alternative to npm, pnpm, and yarn. It’s faster, simpler, and requires fewer resources. Unlike other package managers, MIP uses a **global cache**, does not create `node_modules/`, and supports **plugins**.
:::

## 🎯 Key features

- **🚀 Speed** — installs packages several times faster thanks to parallel downloads, HTTP/2, and a three-level cache.
- **📦 Global cache** — packages are stored once in `~/.mip/store/` and used by all projects. Saves space and speeds up installs.
- **🔌 Plugins** — extend MIP functionality with plugins. Create your own commands, subscribe to events, and integrate with external services.
- **📝 YAML configuration** — instead of `mip.json`, use `mip.yml` and `mip-lock.yml`. Human-readable, supports comments, and is pleasant for manual editing.
- **🔒 Security** — built-in dependency auditing and vulnerability checks.
- **🌍 Multilingual UI** — supports 10 interface languages.
- **📁 Monorepos** — built-in workspaces support.
- **🔧 Flexibility** — works with both global and local packages, supports `package.json` for npm compatibility.
- **🧩 Your own registry** — publish and install packages from your own registry.

## ⚡ Quick start

```bash
# Install MIP
git clone https://github.com/kiwinatra/mip
cd mip
npm install
npm run build

# Create a new project
mip init
mip install express
mip run start
```

::: tip "💡 Tip"
After building, MIP will suggest adding itself to `PATH` so you can run it from any folder.
:::

## 🧩 How it works

MIP uses a **global cache** (`~/.mip/store/`) where it stores all package versions. This enables:
- Installing packages without duplication.
- Instantly switching between versions.
- Working without the internet if the package is already in the cache.
- Saving up to 90% of disk space.

**No `node_modules/`** — instead, MIP uses symlinks to the global cache and a `.mip/manifest.json` manifest to track installed packages.

For more details, see [Architecture](/dev/architecture).

## 📚 Commands

MIP includes all the commands you need to work with packages:

| Command | Description |
|---------|-------------|
| `mip init` | Initialize a new project |
| `mip install` | Install dependencies |
| `mip update` | Update packages |
| `mip uninstall` | Remove packages |
| `mip list` | List installed packages |
| `mip outdated` | Check outdated packages |
| `mip audit` | Security audit |
| `mip run` | Run scripts |
| `mip exec` | Execute binaries |
| `mip global` | Manage global packages |
| `mip workspaces` | Monorepo workspaces |
| `mip plugin` | Manage plugins |
| `mip pe` | Execute plugin commands |

For the full list of commands and descriptions, see [Commands](/commands/install).

## 📁 Project structure

```
my-project/
├── mip.yml             # Project configuration (YAML)
├── mip-lock.yml       # Locked package versions (YAML)
├── .mip/
│   ├── manifest.json  # Installed packages manifest
│   ├── cache/         # Download cache
│   └── packages/      # Local packages (if any)
└── node_modules/      # Symlinks to the global cache
```

## 🌍 Multilingual support

MIP supports 10 interface languages. To switch language:

```bash
mip language ru   # Russian
mip language en   # English
mip language de   # German
mip language zh   # Chinese
```

## 🔌 Plugins

MIP has a built-in plugin system. Plugins allow you to extend functionality without changing the core code.

```bash
# Create a plugin
mip plugin create my-plugin

# Compile and activate
mip plugin compile my-plugin
mip plugin activate my-plugin

# Run the plugin command
mip pe my-plugin my-command
```

Learn more: [Plugins](/commands/plugin).

## ❓ Frequently asked questions

**How is MIP different from npm?**
MIP is faster, simpler, and doesn’t require complex setup. It uses a global cache, doesn’t create `node_modules/`, supports plugins, and uses YAML configuration.

**Can I use MIP in CI/CD?**
Yes. There is a `mip ci` command designed for automated builds and supporting `--frozen-lockfile`.

**How do I update MIP?**
Rebuild the project from the repository and reinstall.

**Does MIP support `package.json`?**
Yes. MIP is fully compatible with `package.json`. You can use MIP in any npm-based project.

**How do I migrate from an old `mip.json`?**
On the first run, MIP automatically migrates `mip.json` to `mip.yml` and creates a backup.

## 🔗 Useful links

- [Source code](https://github.com/kiwinatra/mip)
- [Report an issue](https://github.com/kiwinatra/mip/issues)
- [MIT License](/LICENSE)

---

::: callout tip "💡 Ready to start?"
Go to [Setup](/setup) and create your first project with MIP!
:::

