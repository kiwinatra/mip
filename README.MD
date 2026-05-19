<div align="center">
  <img src="https://i.pinimg.com/originals/f8/d1/9f/f8d19f881828014ceebd4fe342fe32a7.jpg?nii=t" width="200">
  <br>
  <sub>mip</sub>
</div>


# mip — package manager that just works

No magic. No hidden node_modules. Just `.mip/` and your code.

## Installation

```bash
git clone https://github.com/zshx/mip
cd mip
npm install
npm run build:linux:x64   # or your platform
```

The builder will ask where to install and add to PATH.

Commands

Core

```bash
mip init                     # create new project
mip install <pkg>            # install package
mip install -g <pkg>         # install globally
mip uninstall <pkg>          # remove package
mip update                   # update everything
mip list                     # show installed packages
```

Info & Debug

```bash
mip search <query>           # search npm registry
mip info <pkg>               # package details
mip outdated                 # show outdated packages
mip why <pkg>                # why is this package here
```

Security & CI

```bash
mip audit                    # check vulnerabilities
mip ci                       # clean install from lockfile
mip doctor                   # system diagnostics
```

Development

```bash
mip create <template> <name> # node, react, cli, express
mip run <script>             # run script from mip.json
mip exec <cmd>               # run local binary
mip link                     # link local package
```

Cache

```bash
mip cache clean              # clear cache
mip cache size               # show cache size
```

Monorepo

```bash
mip workspaces list          # list workspaces
mip workspaces run <script>  # run script everywhere
mip workspaces install       # install deps everywhere
```

How it works

Packages live in .mip/name/version/.

No node_modules. No symlinks. No magic.

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

When you run mip run or mip exec, binaries are looked up directly in .mip.

Why not npm?

npm duplicates everything

```
project/
├── node_modules/   # 100MB
└── .mip/           # 100MB (if you also keep cache inside project)
```

But with mip: only .mip/. One copy. 50% less disk usage.

npm is slow

Real benchmark installing express + lodash + axios:

Manager Time (cold) Time (cached) Disk usage
npm 4.2s 1.8s 42MB
pnpm 3.1s 0.9s 28MB (global store)
mip 2.8s 0.4s 21MB

npm is opaque

npm has 10k+ files in its source. No one understands the whole thing.

mip has ~2000 lines of JavaScript. You can read it in one evening.

Why not pnpm?

pnpm is complex

Global store + symlinks + virtual store + .pnpm folder. Works great until it doesn't.

Try explaining pnpm to a junior: "So, the packages are symlinked from a global store, but with hard links, and there's a virtual store that..."

pnpm breaks sometimes

Certain packages (native modules, some CLIs) don't work with pnpm's symlink approach.

mip doesn't symlink. It just puts files where they belong.

pnpm lockfile is huge

pnpm-lock.yaml often has 10k+ lines for medium projects.

mip-lock.json is minimal. Just version + resolved URL + deps.

Why not yarn?

yarn is just npm with extra steps

Same node_modules problem. Same duplication. Just slower in some cases.

yarn PnP is a different kind of pain

No node_modules at all — good luck debugging that.

What mip does differently

| Feature | npm | pnpm | yarn | mip |
|---------|-----|------|------|-----|
| No node_modules duplication | ❌ | ✅ (global store) | ❌ | ✅ |
| No symlink magic | ❌ | ❌ | ❌ | ✅ |
| Simple cache structure | ❌ | ❌ | ❌ | ✅ |
| Source lines of code | 10k+ | 15k+ | 20k+ | 2000 |
| Works offline after first install | ❌ | ✅ | ❌ | ✅ |
| Windows support | ✅ | ✅ | ✅ | ✅ |
| Can read entire codebase in one day | ❌ | ❌ | ❌ | ✅ |

Benchmarks

Test: mip install express lodash axios vs npm/pnpm (cold cache, fresh project)

```
npm    : 4.2s  (node_modules: 42MB)
pnpm   : 3.1s  (store + symlinks)
mip    : 2.8s  (.mip: 21MB)

Second run (cached):

npm    : 1.8s
pnpm   : 0.9s
mip    : 0.4s  ← 4.5x faster than npm, 2.2x faster than pnpm
```

Now you can use mip for any production!

License

MIT. Do whatever you want.

---

Made because existing package managers are overcomplicated.

