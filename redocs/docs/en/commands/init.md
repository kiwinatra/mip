---
title: "mip init — initialize a new project"
description: "The init command creates the structure of a new MIP project: mip.yml, the .mip folder with subdirectories, and README.md with instructions."
---

# mip init

::: callout info "What is this?" icon:rocket
`mip init` is the first command you run to create a new MIP project. It creates the `mip.yml` file, sets up the folder structure, and generates a README file with usage instructions. Everything you need to get started — in one command!
:::

## Syntax

```bash
mip init
```

## What is created

```
my-project/
├── mip.yml          # Project configuration in YAML
├── .mip/
│   ├── manifest.json # Installed packages manifest
│   ├── cache/        # Download cache
│   └── packages/     # Local packages
└── README.md        # Documentation
```

## Example mip.yml

```yaml
name: my-project
version: 1.0.0
language: en
dependencies: {}
devDependencies: {}
scripts: {}
workspaces: []
```

## How it works

1. **Check if `mip.yml` exists** — if the file already exists, the command exits with an error.

2. **Check for old configs** — if `mip.json` or `package.json` exists, MIP automatically migrates them to `mip.yml`.

3. **Create `mip.yml`** — a minimal configuration is automatically generated in YAML format:
   ```yaml
   name: folder-name
   version: 1.0.0
   language: en
   dependencies: {}
   devDependencies: {}
   scripts: {}
   workspaces: []
   ```

4. **Create `.mip` directory** — structure for storing cache and manifest:
   ```
   .mip/
   ├── manifest.json   # Installed packages manifest
   ├── cache/          # Download cache
   └── packages/       # Local packages
   ```

5. **Check system compatibility**:
   - Node.js version (recommended: v18+).
   - Write permissions to the `.mip` folder.

6. **Generate README.md** — if the file doesn't exist, it is created with basic instructions.

7. **Display final report** — shows the project structure and suggests next steps.

## Migration from old formats

If you have `mip.json` or `package.json`, MIP automatically migrates them on first run:

```bash
# Before
mip.json
mip-lock.json

# After
mip.yml          # with mip.json.backup
mip-lock.yml     # with mip-lock.json.backup
```

::: callout tip "💡 Why YAML?"
YAML is easier to read, supports comments, and is more convenient for manual editing. You can add comments directly in `mip.yml`:
```yaml
# This is my project
name: my-project
# Project version
version: 1.0.0
```
:::

## Examples

::: tabs
== tab "Initialize a new project"
```bash
mip init
```

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║                    🚀 MIP INIT STARTED 🚀                  ║
╚═══════════════════════════════════════════════════════════╝

📋 Step 1/4: Creating mip.yml...
  ✅ mip.yml created
     📄 Path: /home/user/my-project/mip.yml
     📦 Name: my-project
     🔢 Version: 1.0.0

📂 Step 2/4: Creating .mip directory...
  ✅ .mip directory created
     📁 Path: /home/user/my-project/.mip

🔧 Step 3/4: Setting up directory structure...
  ✅ Manifest: .mip/manifest.json
  ✅ Cache directory: .mip/cache/
  ✅ Temp directory: .mip/temp/

🔐 Step 4/4: Checking system compatibility...
  ✅ Node.js version: v20.11.0
  ✅ Write permissions: OK

╔═══════════════════════════════════════════════════════════╗
║              ✅ MIP PROJECT INITIALIZED! ✅                ║
╚═══════════════════════════════════════════════════════════╝

📊 Summary:
   📁 Project: my-project
   📂 Location: /home/user/my-project
   🗂️  Structure: .mip/ (cache + packages + temp)
   📄 Config: mip.yml
   📋 Manifest: .mip/manifest.json

💡 Next steps:
   1️⃣  Install packages:  mip install express
   2️⃣  Run scripts:       mip run start
   3️⃣  List packages:     mip list
```
:::
== tab "Repeated run"
```bash
mip init
```

**Output:**
```
⚠️  mip.yml already exists
```
:::

## Common errors

::: callout warning "⚠️ mip.yml already exists" icon:alert-triangle
**Cause:** The project is already initialized.

**Solution:**
1. If you want to recreate the project — delete `mip.yml` and `.mip/` manually, then run `mip init` again.
2. If you just want to start working — use other commands: `mip install`, `mip list`, etc.
:::

::: callout warning "⚠️ Node.js version too old" icon:alert-triangle
**Cause:** An outdated version of Node.js is installed (below v14).

**Solution:**
1. Update Node.js to version 18 or higher.
2. Use [nvm](https://github.com/nvm-sh/nvm) to manage versions.
:::

::: callout tip "💡 Tip" icon:lightbulb
After `mip init` you can immediately:
- Install dependencies: `mip install express`
- Add scripts to `mip.yml`:
  ```yaml
  scripts:
    start: node index.js
    dev: nodemon index.js
  ```
- Run a script: `mip run start`
:::

## Related commands

- [mip create](/commands/create) — creates a project from a template (node, react, cli, express)
- [mip install](/commands/install) — installs packages in the created project
- [mip doctor](/commands/doctor) — diagnoses the environment after initialization
