# Quick start (Users)

`mip` is a minimal package manager:
- no `node_modules` duplication (packages are stored in `.mip/`)
- binaries are discovered from `.mip/` when running scripts/exec

## 1) Install mip

```bash
git clone https://github.com/zshx/mip
cd mip
npm install
npm run build
```

The builder will ask where to install and update `PATH`.

## 2) Create a project

In an empty folder:

```bash
mip init
```

This creates:
- `mip.json`
- `.mip/` with:
  - `.mip/packages/`
  - `.mip/cache/`
  - `.mip/temp/`

## 3) Install dependencies

```bash
mip install express
```

Dev dependency:

```bash
mip install -D nodemon
```

Globally:

```bash
mip install -g eslint
```

## 4) Run scripts from `mip.json`

Edit `mip.json`:

```json
{
  "scripts": {
    "start": "node app.js"
  }
}
```

Run:

```bash
mip run start
```

## 5) Install from lockfile (CI)

```bash
mip ci
```

Optional strict mode:

```bash
mip ci --frozen-lockfile
```

## 6) Security

```bash
mip audit
```

Try automatic fixes (when possible):

```bash
mip audit --fix
```

## 7) Execute local binaries directly

```bash
mip exec jest
```

`mip exec` searches `.mip/**/.bin` and runs the first matching executable. If nothing is found, it runs the system command.
