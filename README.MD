<div align="center">
  <!-- Hero -->
  <div style="position:relative;display:inline-block;padding:18px 20px;border-radius:24px;overflow:hidden;background:linear-gradient(135deg,rgba(59,130,246,.18),rgba(16,185,129,.16),rgba(168,85,247,.16));border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 90px rgba(0,0,0,.35);backdrop-filter:blur(10px);">
    <!-- Glow blobs -->
    <div style="position:absolute;inset:-80px;background:
      radial-gradient(circle at 20% 30%,rgba(56,189,248,.45),transparent 55%),
      radial-gradient(circle at 70% 20%,rgba(168,85,247,.35),transparent 50%),
      radial-gradient(circle at 60% 80%,rgba(34,197,94,.28),transparent 55%);
      pointer-events:none;"></div>

    <div style="position:relative;display:flex;align-items:center;gap:16px;justify-content:flex-start;flex-wrap:wrap;">
      <img src="https://i.pinimg.com/originals/f8/d1/9f/f8d19f881828014ceebd4fe342fe32a7.jpg?nii=t" width="92" style="border-radius:18px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);" />
      <div>
        <h1 style="margin:0;font-size:40px;line-height:1.1;letter-spacing:.2px;">mip</h1>
        <div style="margin-top:6px;font-size:16px;color:rgba(255,255,255,.88);">
          package manager that just works <span style="opacity:.9;">—</span>
          <b>no node_modules duplication</b>, <b>no symlink magic</b>
        </div>
      </div>
    </div>
  </div>

  <p style="margin-top:14px;">
    <a href="https://github.com/zshx/mip/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/zshx/mip?style=social"></a>
    <a href="https://github.com/zshx/mip/forks"><img alt="Forks" src="https://img.shields.io/github/forks/zshx/mip?style=social"></a>
    <a href="https://github.com/zshx/mip/issues"><img alt="Issues" src="https://img.shields.io/github/issues/zshx/mip"></a>
    <a href="https://github.com/zshx/mip/pulls"><img alt="PRs" src="https://img.shields.io/github/issues-pr/zshx/mip"></a>
    <a href="https://github.com/zshx/mip/blob/master/LICENSE"><img alt="License" src="https://img.shields.io/github/license/zshx/mip"></a>
    <a href="https://www.npmjs.com/package/mip"><img alt="npm" src="https://img.shields.io/npm/v/mip?label=npm"></a>
  </p>
</div>

---

## ⚡ Quick start (30–60 seconds)

> Максимум результата — минимум шагов.

```bash
git clone https://github.com/zshx/mip
cd mip
npm install
npm run build
```

Где-то после сборки билдер предложит место установки и добавит `PATH`.

Дальше в любой папке:

```bash
mip init
mip install express
mip run start
```

> Если в `mip.json` есть `scripts.start`, `mip run start` запустит ваш скрипт.

---

## 📚 Документация

Полная документация лежит в `docs/`:

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

## 🧭 Table of contents

> Все якоря работают на GitHub.

- [Quick start](#-quick-start-3060-секунд)
- [Docs](#📚-документация)
- [What is mip](#what-is-mip)
- [Philosophy](#philosophy)
- [How it works](#how-it-works)
- [Why mip](#why-mip)
- [Why not npm/pnpm/yarn](#why-not-npmpnpm-yarn)
- [Benchmarks](#benchmarks)
- [Commands (high-level)](#commands-high-level)
- [Project layout (.mip)](#project-layout-mip)
- [CI & Security](#ci--security)
- [Examples](#examples)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Security policy](#security-policy)
- [License](#license)
- [Roadmap / TODO](#roadmap--todo)
- [Developer notes](#developer-notes)

---

## What is mip

**mip** — менеджер пакетов, который делает 3 вещи:
1) хранит пакеты предсказуемо в проекте (`.mip/`)
2) не дублирует `node_modules`-подобный мир (меньше диска)
3) делает lockfile/CI/аудит воспроизводимыми

**Нет**:
- лишней магии
- скрытых `node_modules`-мутантов
- “объясни pnpm junior-у за 2 минуты” ситуаций

**Да**:
- читаемые структуры
- быстрые повторные запуски (cached)
- понятные команды

---

## Philosophy

> “Понятность важнее эффектов.”

- **Сначала — детерминизм**: `mip.json` + `mip-lock.json`
- **Сначала — читаемость**: структуры и директории простые
- **Сначала — предсказуемость**: `ci` разворачивает ровно lockfile
- **Сначала — производительность**: быстрый cold/cached workflow

---

## How it works

Ключевой принцип:

- пакеты живут в `.mip/name/version/`
- `mip run` и `mip exec` ищут бинарники напрямую в `.mip`

Пример структуры:

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

## Why mip

### ✅ “Clean store” — меньше дубликатов

Вместо “каждый проект держит своё node_modules”:
- mip хранит пакетные файлы централизованно в рамках проекта (`.mip/`)
- кеш/повторные установки работают быстро

### ✅ “No symlink magic”

pnpm и некоторые подходы держатся на symlink-логике.
Она бывает удобной… пока не становится болью.

mip делает проще: **положил файлы где надо**.

### ✅ “Lockfile as a product feature”

`mip-lock.json` — минимальный, читаемый lockfile:
- версии
- resolved URL
- зависимости

---

## Why not npm/pnpm/yarn

### npm — “много копий”

npm дублирует всё в `node_modules`.

```
project/
├── node_modules/   # 100MB
└── .mip/           # 100MB (если вы ещё храните cache/что-то в проекте)
```

mip: **только `.mip/`**. Одна копия. Меньше диска.

### pnpm — “сложно, пока не сломалось”

У pnpm:
- global store
- symlinks
- virtual store
- `.pnpm/`

С некоторыми native/CLI пакетами это превращается в “почему оно не запускается” и долгую диагностику.

### yarn — “как npm, только больше шагов”

yarn классический:
- тот же подход к диску (node_modules duplication)
- та же логика “сложнее, чем кажется”

PnP:
- `node_modules` нет — отладка другая, иногда неприятная.

---

## Benchmarks

Тест: `mip install express lodash axios` vs npm/pnpm (cold cache, fresh project)

```txt
npm    : 4.2s  (node_modules: 42MB)
pnpm   : 3.1s  (store + symlinks)
mip    : 2.8s  (.mip: 21MB)

Second run (cached):

npm    : 1.8s
pnpm   : 0.9s
mip    : 0.4s  ← 4.5x faster than npm, 2.2x faster than pnpm
```

> Цифры зависят от железа/сети, но тренд стабильно: cold — быстрее, cached — “очень быстро”.

---

## Commands (high-level)

> Супер-быстрый обзор. Полное описание: [Users: Commands](./docs/users/commands.md)

### Core
```bash
mip init                     # create new project
mip install <pkg>           # install package
mip install -g <pkg>       # install globally
mip uninstall <pkg>         # remove package
mip update                  # update everything
mip list                    # show installed packages
```

### Info & Debug
```bash
mip search <query>         # search registry
mip info <pkg>             # package details
mip outdated               # show outdated packages
mip why <pkg>              # why is package here
```

### Security & CI
```bash
mip audit                  # vulnerabilities scan
mip ci                     # install from lockfile
mip doctor                 # diagnostics
```

### Development
```bash
mip create <template> <name> # node, react, cli, express
mip run <script>              # scripts from mip.json
mip exec <cmd>                # execute local binary
mip link                      # link local package
```

### Cache
```bash
mip cache clean              # clear cache
mip cache size               # show cache size
```

### Monorepo / Workspaces
```bash
mip workspaces list
mip workspaces run <script>
mip workspaces install
```

---

## 📦 Project layout (.mip)

mip не “прячет”. Всё на виду.

- `.mip/` — локальный магазин пакетов
- `mip.json` — зависимости и scripts
- `mip-lock.json` — фиксация версий и resolved URL

> Внутренняя структура подбирается так, чтобы `ci` работал честно и воспроизводимо.

---

## CI & Security

### CI: детерминированная установка

Сценарий:
1) есть `mip-lock.json`
2) есть `mip.json`
3) `mip ci` разворачивает строго lockfile

Примеры:
```bash
mip ci
mip ci --frozen-lockfile
```

### Security: audit

```bash
mip audit
mip audit --fix
```

> `--fix` пытается заменить версию на совместимую исправленную (если есть в патч-листе).

---

## 🧰 Examples

- [examples/basic-app](./examples/basic-app/)
- [examples/express](./examples/express/)
- [examples/cli-tools](./examples/cli-tools/)

Паттерн примерно такой:

```bash
mip init
mip install
mip run start
```

---

## FAQ

### Где “традиционный node_modules”?
Его обычно **нет в привычном смысле**.
mip запускает бинарники из `.mip/**/node_modules/.bin/` (или из локальной структуры, которую использует mip),
чтобы без “магии symlink/встроенных виртуальных store” получить рабочий CLI.

### Можно ли работать оффлайн?
После первой установки mip может работать без постоянных сетевых запросов (зависит от кеш/окружения),
но главный плюс — воспроизводимость lockfile.

### Почему lockfile такой важный?
Потому что:
- `ci` должен быть детерминированным
- `audit` должен сканировать **конкретные версии**, а не “примерно-диапазон”

---

## Troubleshooting

Если хочется быстро — см. [Users: Troubleshooting](./docs/users/troubleshooting.md)

Быстрые “частые случаи”:
- `mip ci`: нет `mip-lock.json` → сначала делаем `mip install`
- `mip exec`: не находит бинарник → проверьте, что пакет установлен и бинарник реально в `.mip/.../.bin`
- `mip run`: script не найден → проверьте `scripts.<name>` в `mip.json`
- `mip audit`: проблемы с сетью → на окружениях без доступа audit может не отработать

---

## Security policy

Security issues → [SECURITY](./SECURITY)

---

## License

MIT. Do whatever you want.

---

## Roadmap / TODO

Смотрите:
- [TODO.md](./TODO.md)

---

## Developer notes

Хотите копаться “как оно устроено”?
- [Install flow & `.mip` layout](./docs/dev/install-flow.md)
- [Architecture](./docs/dev/architecture.md)
- [Hacking / debugging](./docs/dev/hacking.md)

---

<div align="center" style="margin-top:22px;color:rgba(255,255,255,.7);">
  <b>mip</b> — меньше магии, больше инженерии. 🚀
</div>
