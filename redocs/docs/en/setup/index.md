---
title: "MIP Setup and Configuration"
description: "How to install MIP and configure it for your project."
---

# MIP Setup and Configuration ⚙️

This section will help you install MIP and set up your first project.

---

## 📚 Contents

| Section | Description |
|---------|-------------|
| [Quick start](/setup/quick-start) | Install and create your first project in 5 minutes |
| [Configuration](/setup/configuration) | All `mip.yml` settings |

---

## 🚀 Quick start

### 1. Install MIP

```bash
git clone https://github.com/kiwinatra/mip
cd mip
npm install
npm run build
```

### 2. Create a project

```bash
mip init
```

MIP will create:
- `mip.yml` — project configuration in YAML
- `.mip/` — directory for cache and manifest
- `README.md` — instructions

### 3. Install dependencies

```bash
mip install express
```

### 4. Run the project

```bash
mip run start
```

---

## 📁 Project structure

After `mip init`, you will see:

```
my-project/
├── mip.yml          # Project configuration (YAML)
├── mip-lock.yml     # Locked package versions (YAML)
├── .mip/
│   ├── manifest.json # Installed packages manifest
│   ├── cache/        # Download cache
│   └── packages/     # Local packages
└── node_modules/     # Symlinks to the global cache
```

---

## 🔧 Main commands

```bash
# Initialization
mip init

# Install packages
mip install <package>

# Run scripts
mip run <script>

# List packages
mip list

# Update packages
mip update

# Remove packages
mip uninstall <package>

# Security audit
mip audit
```

---

## 🌍 Switching language

```bash
mip language ru
```

Available languages: `en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

---

## 🔗 Related pages

- [Quick start](/setup/quick-start)
- [Configuration](/setup/configuration)
- [Commands](/commands/install)

