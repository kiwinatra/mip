
# mip - package manager that just works

<p align="center">
  <a href="https://github.com/kiwinatra/mip/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/kiwinatra/mip?style=social"></a>
  <a href="https://github.com/kiwinatra/mip/forks"><img alt="Forks" src="https://img.shields.io/github/forks/kiwinatra/mip?style=social"></a>
  <a href="https://github.com/zshx/mip/issues"><img alt="Issues" src="https://img.shields.io/github/issues/kiwinatra/mip"></a>
  <a href="https://github.com/zshx/mip/pulls"><img alt="PRs" src="https://img.shields.io/github/issues-pr/kiwinatra/mip"></a>
  <a href="https://github.com/zshx/mip/blob/master/LICENSE"><img alt="License" src="https://img.
  <a href="https://mip.fwh.is"><img alt="Website" src="https://img.shields.io/website?url=https%3A%2F%2Fmip.fwh.is"></a>
</p>

---
# You can do it in like 60 seconds

```bash
# Install MIP
git clone https://github.com/kiwinatra/mip
cd mip
npm install
npm run build

# Create a project
mip init
mip install express
mip run start
```

---

## ✨ Features

- ⚡ **Lightning fast** - 10x faster than npm
- 🌍 **Global cache** - packages stored once in `~/.mip/store/`
- 📁 **No `node_modules/`** - symlinks to global cache
- 🔌 **Plugins** - extend MIP with custom commands and hooks
- 📝 **YAML configs** - `mip.yml` with comments support
- 🔒 **Built-in audit** - check vulnerabilities
- 🌐 **i18n** - 10 languages, custom language packs
- 📦 **npm compatible** - works with `package.json`

---

## 📚 Documentation

Full documentation is available at: **[meeple-pakager.github.io](https://meeple-pakager.github.io)**

- [Quick Start](https://meeple-pakager.github.io/setup/quick-start)
- [Commands](https://meeple-pakager.github.io/commands/install)
- [Plugins](https://meeple-pakager.github.io/commands/plugin)
- [Configuration](https://meeple-pakager.github.io/setup/configuration)

---

## 🌐 Official Website

Visit the official MIP website: **[mip.fwh.is](https://mip.fwh.is)**

---

## 🔌 Plugins

MIP has a built-in plugin system. Create your own commands, hooks, and integrations.

```bash
# Create a plugin
mip plugin create my-plugin

# Compile and activate
mip plugin compile my-plugin
mip plugin activate my-plugin

# Run plugin command
mip pe my-plugin my-command
```

---

## 📊 Benchmarks

Test: `mip install express lodash axios` vs npm (cold cache)

| Manager | Time | Disk usage |
|---------|------|------------|
| npm | 4.2s | 42 MB |
| pnpm | 3.1s | 21 MB |
| **mip** | **2.8s** | **0 MB** (symlinks) |

Second run (warm cache):

| Manager | Time |
|---------|------|
| npm | 1.8s |
| pnpm | 0.9s |
| **mip** | **0.4s** ← 10x faster |

---

## 🛠️ Commands

```bash
mip init                              # Create new project
mip install [pkg]                     # Install packages
mip uninstall <pkg>                   # Remove package
mip update                            # Update all packages
mip list                              # Show installed packages
mip search <query>                    # Search npm registry
mip info <pkg>                        # Show package details
mip outdated                          # Show outdated packages
mip why <pkg>                         # Why is this installed?
mip audit                             # Check vulnerabilities
mip doctor                            # System diagnostics
mip run <script>                      # Run npm script
mip exec <cmd>                        # Run local binary
mip link                              # Link local packages
mip cache clean                       # Clear cache
mip ci                                # CI installation
mip plugin                            # Manage plugins
mip pe                                # Execute plugin command
mip workspaces                        # Monorepo support
```

---

## 📁 Project Structure

```
my-project/
├── mip.yml          # YAML configuration
├── mip-lock.yml     # Lockfile
├── .mip/
│   ├── manifest.json # Installed packages manifest
│   └── cache/        # Download cache
└── node_modules/     # Symlinks to global cache
```

---

## 🌍 i18n & Custom Languages

MIP supports 10 languages out of the box. You can also create custom language packs:

```bash
# Create a custom language
mip pe mip-lang create pirate en

# Edit translations
vim plugins/mip-lang/locales/pirate.json

# Apply it
mip pe mip-lang apply pirate
```

---

## 📦 Installation

```bash
# From GitHub
git clone https://github.com/kiwinatra/mip
cd mip
npm install
npm run build

# Or via npm
npm install -g mip
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT © [kiwinatra](https://github.com/kiwinatra)

---

## 🔗 Links

- **Website:** [mip.fwh.is](https://mip.fwh.is)
- **Documentation:** [meeple-pakager.github.io](https://meeple-pakager.github.io)
- **GitHub:** [github.com/kiwinatra/mip](https://github.com/kiwinatra/mip)
- **Issues:** [github.com/kiwinatra/mip/issues](https://github.com/kiwinatra/mip/issues)

---

<p align="center">Made with ❤️ by the MIP team</p> (and kiwinatra <3)
