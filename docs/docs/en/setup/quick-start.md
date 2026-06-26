---
title: "Quick Start"
description: "Install MIP and create your first project in 5 minutes."
---

# Quick Start 🚀

Install MIP and create your first project in 5 minutes.

---

## 📦 Installing MIP

### 1. Clone the repository

```bash
git clone https://github.com/kiwinatra/mip
cd mip
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the project

```bash
npm run build
```

### 4. Add to PATH (optional)

The builder will offer to add the binary folder to `PATH`:

```bash
export PATH="$PATH:$(pwd)/bin"
```

Or add to `~/.zshrc` / `~/.bashrc`:

```bash
echo 'export PATH="$PATH:~/Desktop/mip/bin"' >> ~/.zshrc
source ~/.zshrc
```

Now `mip` is available from any folder.

---

## 🏗️ Creating a project

### 1. Create a project folder

```bash
mkdir my-project
cd my-project
```

### 2. Initialize the project

```bash
mip init
```

MIP will create:

```
my-project/
├── mip.yml          # Project configuration in YAML
├── .mip/            # Cache and manifest directory
└── README.md        # Documentation
```

::: tip "💡 What is mip.yml?"
`mip.yml` is the new YAML configuration format. It's easier to read, supports comments, and is more pleasant to edit manually than JSON.
:::

### 3. View `mip.yml`

```yaml
name: my-project
version: 1.0.0
language: en
dependencies: {}
devDependencies: {}
scripts: {}
workspaces: []
```

---

## 📦 Installing packages

### Install Express

```bash
mip install express
```

Output:
```
📦 Installing express...
✅ express installed
```

### Check `mip.yml`

```yaml
dependencies:
  express: ^4.18.0
```

### Install a development package

```bash
mip install nodemon --save-dev
```

### Install everything from `mip.yml`

```bash
mip install
```

---

## 📜 Scripts

### Add scripts to `mip.yml`

```yaml
scripts:
  start: node index.js
  dev: nodemon index.js
```

### Run a script

```bash
mip run start
mip run dev
```

---

## 📂 Project structure

```
my-project/
├── mip.yml          # YAML configuration
├── mip-lock.yml     # Pinned versions
├── .mip/
│   ├── manifest.json # Installed packages manifest
│   ├── cache/        # Download cache
│   └── packages/     # Local packages
└── node_modules/     # Symlinks to global cache
```

---

## 🧪 Verification

### View installed packages

```bash
mip list
```

### Check for outdated packages

```bash
mip outdated
```

### Security audit

```bash
mip audit
```

---

## 🗑️ Cleaning

### Clear cache

```bash
mip cache clean
```

### Clear global cache

```bash
mip cache clean --global
```

### Remove a package

```bash
mip uninstall express
```

---

## 🎉 Done!

You've installed MIP and created your first project. Next:

- [Configuration](/setup/configuration) — configuring `mip.yml`
- [Commands](/commands/install) — all MIP commands
- [Plugins](/commands/plugin) — extending MIP

---

## 🔗 Related pages

- [Installation](/setup) — full installation guide
- [Configuration](/setup/configuration) — project setup
- [mip init](/commands/init) — creating a project
- [mip install](/commands/install) — installing packages
