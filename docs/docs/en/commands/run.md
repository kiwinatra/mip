---
title: "mip run — run custom scripts"
description: "The run command executes scripts defined in the scripts section of mip.yml, with support for all installed packages in PATH."
---

# mip run

::: callout info "What is this?" icon:play
`mip run` is a command for executing custom scripts from `mip.yml` (or `package.json` for compatibility). It automatically adds all binaries from installed packages (via the manifest) to `PATH`, allowing you to use them in scripts without global installation. This is useful for running tests, building projects, linters, and any other tasks related to your project.
:::

## Syntax

```bash
mip run <script-name>
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `script-name` | string | ✅ | Script name from the `scripts` section in `mip.yml` |

## How it works

1. **Read config** — the command loads `mip.yml` (or `package.json` for compatibility) from the current directory.

2. **Find script** — looks for the specified script in the `scripts` section.

3. **Collect binary paths** — scans the `.mip/manifest.json` manifest and collects all `.bin` folders from installed packages.

4. **Update `PATH`** — all found binary folders are added to the `PATH` environment variable (with priority over system paths).

5. **Run script** — executes the command through the system shell:
   - **Windows:** `cmd.exe /d /s /c <script>`
   - **Unix:** `sh -c <script>`

6. **Handle exit** — the script's exit code is passed as the `mip run` exit code.

## Examples

::: tabs
== tab "Run script from mip.yml"
```bash
mip run test
```

**Example `mip.yml`:**
```yaml
scripts:
  test: jest --coverage
  start: node index.js
  build: webpack --mode production
```

**Output:**
```
🏃 Running "test" script...
> jest --coverage

 PASS  src/utils.test.js
 PASS  src/api.test.js
...
```
:::
== tab "Script not found"
```bash
mip run unknown
```

**Output:**
```
❌ Script "unknown" not found

📋 Available scripts:
  • test
  • start
  • build
```
:::
== tab "No scripts in mip.yml"
```bash
mip run start
```

**Output:**
```
❌ Script "start" not found

💡 Add scripts to mip.yml:
  scripts:
    start: node index.js
    dev: nodemon index.js
```
:::

## Common errors

::: callout warning "❌ No mip.yml found" icon:alert-triangle
**Cause:** You are not in the root of a MIP project.

**Solution:**
1. Navigate to the project folder: `cd /path/to/project`
2. Make sure `mip.yml` exists there.
3. If not — create it: `mip init`
:::

::: callout warning "❌ Script not found" icon:alert-circle
**Cause:** The specified script is missing from the `scripts` section.

**Solution:**
1. Add the script to `mip.yml`:
   ```yaml
   scripts:
     my-script: node my-script.js
   ```
2. Use `mip run` with the correct name.
:::

::: callout warning "⚠️ Command not found (even with mip run)" icon:alert-triangle
**Cause:** The tool is not installed locally.

**Solution:**
1. Install the required package locally: `mip install <package>`
2. Check that the binary is available: `mip exec <command>`
3. Run the script again.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip run` is the equivalent of `npm run` or `yarn run`, but with MIP-specific improvements:

- **Automatic `PATH`** — no need to install packages globally.
- **Cross-platform** — works correctly on Windows and Unix.
- **Simplicity** — just specify the script name.

**Example scripts:**
```yaml
scripts:
  start: node index.js
  dev: nodemon index.js
  test: jest --coverage
  build: webpack --mode production
  lint: eslint src/
  format: prettier --write src/
```
:::

## Related commands

- [mip exec](/commands/exec) — run a specific binary without a script.
- [mip install](/commands/install) — install packages whose binaries become available.
- [mip init](/commands/init) — create `mip.yml` with a `scripts` section.

::: collapsible "🧠 How does automatic PATH work?"
When you run `mip run`, the command:

1. **Scans the manifest** — reads `.mip/manifest.json`, which stores paths to all installed packages.
2. **Collects `.bin` folders** — for each package, checks:
   - `node_modules/.bin/`
   - `.bin/` (in the package root)

3. **Builds `PATH`**:
   ```
   PATH = <all .bin folders> + <system PATH>
   ```

4. **Runs the script** — all binaries from the global cache become available without global installation.

**Advantage:** no need to install packages globally — everything works from the project.
:::
