---
title: "MIP Configuration"
description: "Configuring mip.yml: dependencies, scripts, language, workspaces."
---

# MIP Configuration ⚙️

MIP uses the `mip.yml` file to store project configuration. Here is a complete reference for all fields.

---

## 📁 The `mip.yml` file

Created automatically with `mip init`. Can be edited manually.

### Full example

```yaml
name: my-project
version: 1.0.0
language: en

dependencies:
  express: ^4.18.0
  lodash: ^4.17.21

devDependencies:
  jest: ^29.7.0
  eslint: ^8.56.0

scripts:
  start: node index.js
  dev: nodemon index.js
  test: jest
  build: webpack --mode production

workspaces:
  - packages/*
  - apps/*

plugins:
  logger:
    enabled: true
    logFile: mip.log
  notifier:
    enabled: false
    webhook: https://example.com/webhook
```

---

## 📋 Fields

### `name` — project name

**Type:** string  
**Required:** yes  
**Example:** `my-project`

The project name. Used in README and when creating plugins.

---

### `version` — project version

**Type:** string  
**Required:** yes  
**Example:** `1.0.0`

Project version in semver format.

---

### `language` — interface language

**Type:** string  
**Required:** no (default: `en`)  
**Example:** `ru`

The language for MIP messages. Available values: `en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

```bash
mip language ru
```

---

### `dependencies` — production dependencies

**Type:** object  
**Required:** no  
**Example:** `express: ^4.18.0`

Packages required for the application to run.

---

### `devDependencies` — development dependencies

**Type:** object  
**Required:** no  
**Example:** `jest: ^29.7.0`

Packages only needed for development (tests, linters, builds).

---

### `scripts` — scripts

**Type:** object  
**Required:** no  
**Example:** `start: node index.js`

Custom scripts. Run via `mip run <name>`.

**Common scripts:**
- `start` — start the application
- `dev` — development mode (with reload)
- `test` — run tests
- `build` — build the project
- `lint` — lint the code

---

### `workspaces` — monorepositories

**Type:** array of strings  
**Required:** no  
**Example:** `["packages/*", "apps/*"]`

A list of patterns for finding workspaces (monorepositories). Supports `*`.

See: [mip workspaces](/commands/workspaces).

---

### `plugins` — plugin configuration

**Type:** object  
**Required:** no  
**Example:** `logger: { enabled: true, logFile: "mip.log" }`

Configuration for MIP plugins. Each key is the plugin name, the value is its settings.

**Standard fields:**
- `enabled` — whether the plugin is enabled
- Other fields — specific to each plugin

---

## 🔧 Adding dependencies

### Manually

Add to `mip.yml`:

```yaml
dependencies:
  axios: ^1.6.0
```

### Via CLI

```bash
mip install axios
```

### Save to devDependencies

```bash
mip install jest --save-dev
```

### Without saving

```bash
mip install nodemon --no-save
```

---

## 📜 Adding scripts

### Manually

```yaml
scripts:
  start: node index.js
  dev: nodemon index.js
```

### Run

```bash
mip run start
mip run dev
```

---

## 🌍 Changing language

### Via CLI

```bash
mip language ru
```

### Manually

```yaml
language: ru
```

### Available languages

| Code | Language |
|------|----------|
| `en` | English |
| `ru` | Русский |
| `es` | Español |
| `fr` | Français |
| `de` | Deutsch |
| `it` | Italiano |
| `pt` | Português |
| `zh` | 中文 |
| `ja` | 日本語 |
| `ko` | 한국어 |

---

## 🧩 Workspace configuration

### Adding

```yaml
workspaces:
  - packages/*
  - apps/*
  - libs/shared
```

### Supported patterns

| Pattern | Description |
|---------|-------------|
| `packages/*` | All folders inside `packages/` |
| `apps/*` | All folders inside `apps/` |
| `libs/shared` | A specific folder |

### Commands

```bash
mip workspaces list
mip workspaces run test
mip workspaces install
```

---

## 🔌 Plugin configuration

### Adding config

```yaml
plugins:
  logger:
    enabled: true
    logFile: mip.log
  notifier:
    enabled: false
    webhook: https://example.com/webhook
```

### Enable/disable

```bash
mip plugin enable logger
mip plugin disable notifier
```

---

## 🔄 Migration from `mip.json` or `package.json`

On first run, MIP automatically migrates old configs:

```bash
# Before
mip.json
mip-lock.json

# After
mip.yml          # with mip.json.backup
mip-lock.yml     # with mip-lock.json.backup
```

Old files are saved as `.backup` for rollback. (Feature is in beta)

---

## 💡 Best practices

1. **Always commit `mip-lock.yml`** — ensures reproducibility
2. **Use `--save-dev`** — for development tools
3. **Don't commit `.mip/`** — add it to `.gitignore`
4. **Use specific versions** in `mip-lock.yml`
5. **Update `language`** — if you need translations
6. **Add comments in `mip.yml`** — YAML allows it!

---

## 🔗 Related pages

- [mip init](/commands/init) — creating `mip.yml`
- [mip install](/commands/install) — adding dependencies
- [mip run](/commands/run) — running scripts
- [mip workspaces](/commands/workspaces) — monorepositories
- [mip language](/commands/language) — changing language
