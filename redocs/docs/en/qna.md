---
title: "Quick Q&A (Q&A)"
description: "The most common questions about MIP — installation, configuration, comparison with npm, troubleshooting."
---

# 📌 Quick Questions & Answers (Q&A)

Short and to the point. Expand any section to see the answer.

::: callout tip "💡 Didn’t find an answer?"
Check the [full FAQ](/other/faq) or the [troubleshooting section](/troubleshooting).
:::

---

## 🚀 Installation & configuration

::: collapsible "How do I install MIP?"
Clone the repository and build the project:

```bash
git clone https://github.com/zshx/mip
cd mip
npm install
npm run build
```

The builder will suggest adding the binaries folder (`./bin`) to `PATH`. Accept it so you can use `mip` from any folder.

📖 More: [Quick start](/setup/quick-start)
:::

::: collapsible "How do I create a new project?"
Run this in an empty folder:

```bash
mip init
```

MIP will create:
- `mip.json` — project configuration
- `.mip/` — local package storage
- `README.md` with hints

After that, you can install packages:

```bash
mip install express
mip run start
```

📖 [Project configuration](/setup)
:::

::: collapsible "Where are installed packages stored?"
All packages are stored in `.mip/<name>/<version>/`. No duplicates in `node_modules` — only one copy of each version.

Example:

```
.mip/
├── express/
│   └── 4.18.2/
│       ├── package.json
│       └── ...
└── lodash/
    └── 4.17.21/
```

📖 [Project structure](/dev/architecture)
:::

---

## ⚡ Speed & performance

::: collapsible "Why is MIP so fast?"
MIP uses:
- **Parallel downloads** — up to 10 packages at the same time.
- **HTTP/2** — request multiplexing.
- **Aggressive caching** — after the first time, packages are stored locally.
- **No duplication** — each package version is stored only once in `.mip/`.

**Benchmarks** (cold cache, install `express lodash axios`):
```
npm    : 4.2s  (node_modules: 42MB)
pnpm   : 3.1s  (store + symlinks)
mip    : 2.8s  (.mip: 21MB)
```

Second run (warm cache):
```
npm    : 1.8s
pnpm   : 0.9s
mip    : 0.4s  ← 4.5x faster than npm!
```

📖 [Benchmarks](/pro-users/performance)
:::

::: collapsible "How does MIP save disk space?"
Unlike npm (which duplicates packages in every project), MIP stores each package version **only once** in `.mip/`. If you have 10 projects using `express@4.18.2`, it will be downloaded and extracted only once.

Comparison:
- npm: `node_modules/` takes 42 MB per project.
- MIP: `.mip/` takes 21 MB for all projects (in current versions it may be local; future global caching is possible).

📖 [Cache management](/commands/cache)
:::

---

## 🔧 Using commands

::: collapsible "What’s the difference between `mip run` and `mip exec`?"
- `mip run <script>` — runs a script from the `scripts` section in `mip.json`. This is similar to `npm run`.
- `mip exec <command>` — executes any binary from installed packages, even if it’s not listed in scripts. For example: `mip exec jest` will run Jest if it’s installed.

📖 [Commands](/commands/run) and [exec](/commands/exec)
:::

::: collapsible "How do I install a package globally?"
```bash
mip install -g <package>
# or
mip global install <package>
```

Global packages are placed in `~/.mip/global/` and added to `PATH`. MIP will automatically add the path to `.bashrc` / `.zshrc`.

📖 [Global packages](/commands/global)
:::

::: collapsible "How can I see why a specific package is installed?"
```bash
mip why <package>
```

This command shows which packages depend on the one you specified. It helps you understand why it’s needed and whether you can remove it.

📖 [Dependency analysis](/commands/why)
:::

---

## 🛡️ CI/CD & security

::: collapsible "How do I use MIP in CI?"
```bash
mip ci
```

This command installs dependencies strictly according to `mip-lock.json`, ignoring `mip.json`. This guarantees a reproducible build.

For extra strictness:
```bash
mip ci --frozen-lockfile
```

It checks that the lockfile matches `mip.json` — if not, it exits with an error.

📖 [CI](/commands/ci)
:::

::: collapsible "How do I check dependency security?"
```bash
mip audit
```

It scans all packages from the lockfile for known vulnerabilities (data from the GitHub Advisory Database). It reports severity and suggests fixes:

```bash
mip audit --fix   # automatically updates vulnerable packages to safe versions
```

📖 [Security audit](/commands/audit)
:::

---

## ❓ General questions

::: collapsible "Where is `node_modules`?"
With MIP, there is no traditional `node_modules` folder. Instead, everything lives in `.mip/`. Binaries are run through `mip exec` or `mip run`, which look them up inside `.mip/`.

::: callout info "Why this way?"
It eliminates duplication, keeps the structure simple, and makes installs predictable.
:::
:::

::: collapsible "Can I work offline?"
Yes, if packages were installed at least once already (they are stored in `.mip/`), MIP can use them without network access. The lockfile also lets you reproduce the exact structure.

📖 [Working offline](/troubleshooting/network)
:::

::: collapsible "How is MIP better than npm/pnpm/yarn?"
| Feature | npm | pnpm | yarn | **mip** |
|---------|-----|------|------|---------|
| No duplicates in `node_modules` | ❌ | ✅ | ❌ | ✅ |
| No symlink magic | ❌ | ❌ | ❌ | ✅ |
| Simple package structure | ❌ | ❌ | ❌ | ✅ |
| Code lines | 10k+ | 15k+ | 20k+ | **~2000** |
| Offline support | ❌ | ✅ | ❌ | ✅ |
| Windows support | ✅ | ✅ | ✅ | ✅ |

MIP is about **simplicity** and **speed** without unnecessary complexity.

📖 [Comparison](/pro-users/comparison)
:::

::: collapsible "How do I update MIP itself?"
```bash
git pull
npm install
npm run build
```

The builder will update the binaries. If MIP is already in your `PATH`, the new binaries will overwrite automatically.
:::

---

## 🐛 Common errors & fixes

::: collapsible "mip ci: lockfile not found"
**Error:** `mip-lock.json` is missing.

**Fix:** Run `mip install` locally to create the lockfile and commit it. In CI, a lockfile should always exist.

📖 [CI troubleshooting](/troubleshooting/ci)
:::

::: collapsible "mip exec: command not found"
**Cause:** The binary is not found in `.mip/` or the package isn’t installed.

**Fix:** Make sure the package is installed: `mip list | grep <package>`. If it’s missing, install it: `mip install <package>`.

📖 [Troubleshooting exec](/troubleshooting/exec)
:::

::: collapsible "mip audit: connection error"
**Cause:** Network issues or the registry isn’t reachable.

**Fix:** Check your internet connection, try again later, or use another registry via `--registry`.

📖 [Network & registries](/troubleshooting/network)
:::

---

## 📚 Where else can I get help?

- [Full FAQ](/other/faq) — detailed answers.
- [Troubleshooting](/troubleshooting) — step-by-step instructions.
- [Developer documentation](/dev) — for understanding internals.

::: callout success "💬 Community"
If you still can’t find an answer, open a [GitHub issue](https://github.com/zshx/mip/issues). The author responds quickly!
:::

