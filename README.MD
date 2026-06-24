# mip — package manager that just works

<p align="center">
  <a href="https://github.com/kiwinatra/mip/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/kiwinatra/mip?style=social"></a>
  <a href="https://github.com/kiwinatra/mip/forks"><img alt="Forks" src="https://img.shields.io/github/forks/kiwinatra/mip?style=social"></a>
  <a href="https://github.com/zshx/mip/issues"><img alt="Issues" src="https://img.shields.io/github/issues/kiwinatra/mip"></a>
  <a href="https://github.com/zshx/mip/pulls"><img alt="PRs" src="https://img.shields.io/github/issues-pr/kiwinatra/mip"></a>
  <a href="https://github.com/zshx/mip/blob/master/LICENSE"><img alt="License" src="https://img.shields.io/github/license/kiwinatra/mip"></a>
  <a href="https://www.npmjs.com/package/mip"><img alt="npm" src="https://img.shields.io/npm/v/mip?label=mip"></a>
</p>

---

## Table of contents

- [Quick start](#quick-start)
- [Documentation](#documentation)
- [What is mip](#what-is-mip)
- [How it works](#how-it-works)
- [Why mip (and why not npm/pnpm/yarn)](#why-mip-and-why-not-npmpnpmyarn)
- [Benchmarks](#benchmarks)
- [Commands (high-level)](#commands-high-level)
- [Project layout](#project-layout)
- [CI & Security](#ci--security)
- [Examples](#examples)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Security policy](#security-policy)
- [License](#license)
- [Developer notes](#developer-notes)

---

## Quick start

### This done in 30-60 seconds btw

```bash
git clone https://github.com/zshx/mip
cd mip
npm install
npm run build
```

After build, the builder will ask where to install and will add to `PATH`.

Then, in any folder where you want a project:

```bash
mip init
mip install express
mip run start
```

> `mip run <script>` runs `scripts[script]` from `mip.json` (if present).

---

## Documentation

Full documentation lives in `docs/`:

### Users
- [Quick start](./docs/users/quick-start.md)
- [Commands](./docs/users/commands.md)
- [`mip.json` + `mip-lock.json`](./docs/users/config-and-lockfile.md)
- [Examples](./docs/users/examples.md)
- [CI & Security](./docs/users/ci-and-security.md)
- [Troubleshooting](./docs/users/troubleshooting.md)

### Developers
- [Architecture](./docs/dev/architecture.md)
- [Command system](./docs/dev/commands-system.md)
- [Install flow & `.mip` layout](./docs/dev/install-flow.md)
- [i18n](./docs/dev/i18n.md)
- [Hacking / debugging](./docs/dev/hacking.md)

---

## What is mip

**mip** is a package manager designed for predictable, readable, reproducible installs.

**No:**
- extra “magic” or opaque filesystem tricks
- hidden `node_modules` duplication

**Yes:**
- straightforward `.mip/` layout
- deterministic lockfile workflow
- useful commands for CI, audit, and debugging

---

## How it works

Packages live in:

- `.mip/<name>/<version>/`

No symlink magic. When you run `mip run` or `mip exec`, mip looks up binaries directly inside `.mip`.

Example layout:

```bash
.mip/
├── express/
│   └── 4.18.2/
│       ├── package.json
│       └── ...
├── lodash/
│   └── 4.17.21/
└── ...
```

---

## Why mip (and why not npm/pnpm/yarn)

### Quick comparison

| Feature | npm | pnpm | yarn | mip |
|---|---:|---:|---:|---:|
| No `node_modules` duplication | ❌ | ✅ (global store) | ❌ | ✅ |
| No symlink magic | ❌ | ❌ | ❌ | ✅ |
| Simple package layout | ❌ | ❌ | ❌ | ✅ |
| Source lines of code | 10k+ | 15k+ | 20k+ | 2000 |
| Works offline after first install | ❌ | ✅ | ❌ | ✅ |
| Windows support | ✅ | ✅ | ✅ | ✅ |

### Why not npm?

npm duplicates everything into `node_modules`.

```
project/
├── node_modules/   # 100MB
└── .mip/           # 100MB (if you also keep cache inside project)
```

With mip, you keep only `.mip/` (one physical store), so the disk usage is lower.

### Why not pnpm?

pnpm uses a combination of global store, symlinks, and virtual store structures.
It’s great—until it isn’t (native modules / some CLIs may behave differently).

### Why not yarn?

yarn classic is “npm with extra steps” (same duplication story).
yarn PnP removes `node_modules` entirely—debugging becomes a different kind of challenge.

---

## Benchmarks

Test: `mip install express lodash axios` vs npm/pnpm (cold cache, fresh project)

```txt
npm    : 4.2s  (node_modules: 42MB)
pnpm   : 3.1s  (store + symlinks)
mip    : 2.8s  (.mip: 21MB)

Second run (cached):

npm    : 1.8s
pnpm   : 0.9s
mip    : 0.4s  ← 4.5x faster than npm, 2.2x faster than pnpm
```

Numbers depend on machine/network, but the trend is stable: cold installs are fast, cached runs are very fast.

---

## Commands (high-level)

Full command reference: [Users: Commands](./docs/users/commands.md)

### Core
```bash
mip init                     # create new project
mip install <pkg>            # install package
mip install -g <pkg>        # install globally
mip uninstall <pkg>         # remove package
mip update                   # update everything
mip list                     # show installed packages
```

### Info & Debug
```bash
mip search <query>          # search npm registry
mip info <pkg>              # package details
mip outdated                # show outdated packages
mip why <pkg>               # why is this package here
```

### Security & CI
```bash
mip audit                   # check vulnerabilities
mip ci                      # clean install from lockfile
mip doctor                  # system diagnostics
```

### Development
```bash
mip create <template> <name> # node, react, cli, express
mip run <script>              # run script from mip.json
mip exec <cmd>                # execute local binary
mip link                      # link local package
```

### Cache
```bash
mip cache clean               # clear cache
mip cache size                # show cache size
```

### Monorepo / Workspaces
```bash
mip workspaces list
mip workspaces run <script>
mip workspaces install
```

---

## Project layout

- `.mip/` — local package store
- `mip.json` — project config (dependencies + scripts)
- `mip-lock.json` — pinned versions and resolved URLs

Docs: [Users: `mip.json` + `mip-lock.json`](./docs/users/config-and-lockfile.md)

---

## CI & Security

### CI: deterministic install from lockfile

Typical workflow:

```bash
mip ci
mip ci --frozen-lockfile
```

### Security: audit

```bash
mip audit
mip audit --fix
```

Docs: [Users: CI & Security](./docs/users/ci-and-security.md)

---

## Examples

- [examples/basic-app](./examples/basic-app/)
- [examples/express](./examples/express/)
- [examples/cli-tools](./examples/cli-tools/)

Also see: [Users: Examples](./docs/users/examples.md)

---

## FAQ

### Where is the “traditional node_modules”?

In mip projects, the typical workflow is centered around the `.mip/` store and `mip exec` / `mip run`.
Binary resolution is designed to work directly with the local store instead of relying on pnpm/yarn symlink magic.

### Can I work offline?

After the first installation (depending on cached artifacts and environment), mip can work with fewer/zero additional network calls.
The main benefit is that `mip-lock.json` enables reproducible installs.

### Why is the lockfile so important?

- `mip ci` should install exactly what was pinned
- `mip audit` should scan the exact versions from your lockfile

---

## Troubleshooting

See: [Users: Troubleshooting](./docs/users/troubleshooting.md)

Quick pointers:

- `mip ci`: if `mip-lock.json` is missing, run `mip install` first
- `mip exec`: if a binary is not found, verify the package is installed and the binary exists in the local store
- `mip run`: if script is missing, check `scripts.<name>` in `mip.json`
- `mip audit`: audit may require network access

---

## Security policy

Security issues → [SECURITY](./SECURITY)

---

## License

MIT. Do whatever you want.

---

## Developer notes

- [Install flow & `.mip` layout](./docs/dev/install-flow.md)
- [Architecture](./docs/dev/architecture.md)
- [Hacking / debugging](./docs/dev/hacking.md)
