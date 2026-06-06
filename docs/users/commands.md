# Commands (Users)

All commands are executed via `mip <command> [args...]`.

> Ниже — документирование CLI **согласно** `bin/mip.js` и реализациям в `lib/commands/*`.

---

## Help / version

### `mip --help` / `mip -h`
Печатает справку по командам.

### `mip --version` / `mip -v`
Печатает версию mip.

---

## Global CLI commands (aliases)

Команды имеют алиасы (см. `bin/mip.js`):

- `mip i` → `mip install`
- `mip rm` → `mip uninstall`
- `mip ls` → `mip list`
- `mip up` → `mip update`
- `mip dedupe` — без алиаса (но есть флаг `--full` и `-f`)
- `mip workspaces <...>` — подкоманды внутри команды

---

## Core

### `mip init`
Создаёт новый проект в текущей директории.

Создаёт:
- `mip.json`
- структуру кэша `.mip/` (папки кэширования/временных файлов)

Поведение при наличии `mip.json`:
- команда ожидает, что `mip.json` не существует; иначе возникает ошибка (кроме тестового режима).

Пример:
```bash
mip init
```

---

### `mip install <pkg> [versionRange]`
Устанавливает пакет в проект.

По коду `lib/commands/install.js`:
- скачивает/извлекает пакет в `.mip/<pkg>/<version>/`
- создаёт ссылку/copy в `node_modules/<pkg>`
- обновляет `mip-lock.json`
- при `--save-dev`/без него обновляет `mip.json`

#### Алиасы
- `mip i <...>`

#### Флаги
- `-g`, `--global` — установить глобально (в глобальную директорию mip)
- `-D`, `--save-dev` — записывать как `devDependencies` в `mip.json`
- `-f`, `--force` — принудительно переизвлечь/переустановить пакет (игнорирует кэш `.mip`)

> Внутри кода есть опция `noSave` (не документируется как публичный флаг), чтобы запретить запись в `mip.json`.

#### Если `<pkg>` не указан
- устанавливает все зависимости из `mip.json` (`dependencies + devDependencies`).

Примеры:
```bash
mip install react
mip install express ^4.18.0
mip install lodash -D
mip install left-pad@1.3.0 --force
mip install --global typescript
mip install
```

---

### `mip uninstall <pkg>`
Удаляет пакет из проекта.

Что делает по `lib/commands/uninstall.js`:
- удаляет `.mip/<pkg>/*` (все версии)
- удаляет соответствующие записи из `mip-lock.json`
- при отсутствии `noSave` удаляет запись из `mip.json` (`removeDependency`)

#### Алиасы
- `mip rm <pkg>`

Пример:
```bash
mip uninstall react
```

---

### `mip update`
Проверяет актуальность зависимостей из `mip.json` (`dependencies + devDependencies`).

По `lib/commands/update.js`:
- для каждого пакета запрашивает `latest`
- печатает список доступных обновлений
- запрашивает подтверждение в консоли (`y`)
- обновляет через установку с `force: true`

#### Алиасы
- `mip up`

Пример:
```bash
mip update
```

---

### `mip list`
Показывает установленные пакеты.

По `lib/commands/list.js`:
- ожидает `mip.json`
- сравнивает:
  - пакеты из `.mip/`
  - пакеты из `mip-lock.json` (предупреждения, если в lock есть, но в `.mip` нет)
- показывает итоговое число зависимостей из `mip.json`

#### Алиасы
- `mip ls`

Пример:
```bash
mip list
```

---

## Info / search

### `mip search <query>`
Ищет пакеты в npm registry.

По `lib/commands/search.js`:
- требуются `query`
- возвращает до 20 результатов

Пример:
```bash
mip search react
```

---

### `mip info <pkg>`
Показывает информацию о пакете.

По `lib/commands/info.js`:
- запрашивает `latest` (версия и метаданные)
- отдельно получает список версий
- печатает описание/author/homepage/количество версий и список последних (до 5)

Пример:
```bash
mip info react
```

---

### `mip why <pkg>`
Поясняет, почему пакет присутствует в проекте.

По `lib/commands/why.js`:
- использует `mip-lock.json`
- выводит:
  - версию пакета в lock
  - от кого зависит (`dependencies` в записях lock)

Пример:
```bash
mip why lodash
```

---

### `mip outdated`
Показывает, какие зависимости устарели.

По `lib/commands/outdated.js`:
- читает `mip.json`
- для каждой зависимости запрашивает `latest`
- если указано `--json`, выводит **только JSON** (полезно для CI)
- если найдены устаревшие — выставляет `process.exitCode = 1`

Флаги:
- `--json` — вывести JSON payload.

Пример:
```bash
mip outdated
mip outdated --json
```

---

## Security & CI

### `mip audit [--fix]`
Сканирует `mip-lock.json` на уязвимости.

По `lib/commands/audit.js`:
- для каждого пакета запрашивает advisory via npm security advisories endpoint
- печатает найденные уязвимости, группирует по `severity` (critical/high/moderate/low)
- с `--fix` пытается автоматически поставить совместимую заплатку:
  - выбирает `patched_versions`
  - запускает `mip install <name>@<fixedVersion>`
  - синхронизирует `mip.json` (вписывает fixedVersion)

Примеры:
```bash
mip audit
mip audit --fix
```

---

### `mip ci [--frozen-lockfile]`
Устанавливает зависимости строго по `mip-lock.json`.

По `lib/commands/ci.js`:
- требует наличие `mip-lock.json` и `mip.json`
- устанавливает пакеты в `.mip/` без резолва версий (скачивание tarball по `resolved`)

Флаги:
- `--frozen-lockfile` — проверяет соответствие `mip.json` и lock:
  - если есть mismatch — команда завершится с ошибкой

Примеры:
```bash
mip ci
mip ci --frozen-lockfile
```

---

## Development utilities

### `mip create <template> <name>`
Создаёт проект из шаблона.

Поддерживаемые шаблоны (из `lib/commands/create.js`):
- `node`
- `react`
- `cli`
- `express`

Создаёт файлы и (если указано в шаблоне) ставит зависимости.

Пример:
```bash
mip create node my-app
mip create express api
mip create cli my-tool
```

---

### `mip run <script>`
Запускает скрипт из `mip.json` в секции `scripts`.

По `lib/commands/run.js`:
- берёт `config.scripts?.[scriptName]`
- запускает команду **как строку через оболочку**:
  - Linux/macOS: `sh -c <script>`
  - Windows: `cmd.exe /d /s /c <script>`
- перед запуском формирует `PATH` из `.mip/*/*/node_modules/.bin` и `.mip/*/*/.bin`

Пример:
```json
{
  "scripts": {
    "start": "node app.js"
  }
}
```
```bash
mip run start
```

---

### `mip exec <command> [args...]`
Запускает локальный бинарь из `.mip`.

По `lib/commands/exec.js`:
- ищет `command` в:
  - `.mip/<pkg>/<version>/node_modules/.bin/<command>`
  - `.mip/<pkg>/<version>/.bin/<command>`
- если найдено — выполняет найденный файл
- если не найдено — выполняет системную команду `command`

Пример:
```bash
mip exec jest
```

---

## Cache & diagnostics

### `mip cache clean|size`
Управляет размером/очисткой кэша.

По `lib/commands/cache.js`:
- локальный кэш: `<project>/.mip`
- глобальный кэш: `~/.mip/packages`

Подкоманды:
- `clean` — очищает оба кэша
- `size` — печатает общий размер

Примеры:
```bash
mip cache size
mip cache clean
```

---

### `mip doctor`
Диагностика окружения.

Проверяет:
- Node.js version
- версию mip
- существование `~/.mip`
- глобальный bin в `PATH`
- наличие `git`
- доступность сети (пинг npm регистри через `curl`)
- возможность записи на диск (tmp файл)

Пример:
```bash
mip doctor
```

---

## Monorepo (workspaces)

### `mip workspaces <action> [arg]`
Команда работает с массивом `workspaces` внутри `mip.json`.

По `lib/commands/workspaces.js` поддерживаются `action`:
- `list`
- `install`
- `run <scriptName>`
- `exec <command>`

Примеры:
```bash
mip workspaces list
mip workspaces install
mip workspaces run test
mip workspaces exec npm test
```

---

## Repo browser (GitHub)

### `mip repo <username>/<repository> [--branch <main|master>] [--path <dir>]`
Открывает интерактивный просмотрщик репозитория на GitHub.

По `lib/commands/repo.js`:
- использует GitHub Contents API
- дефолтные опции:
  - `--branch`: `main`
  - `--path`: `download` (скачиваемый путь, относительно текущей папки)
- команды внутри UI:
  - `cd <folder>` / `cd ..`
  - `ls`
  - `readme` или `cat` — показать README (или похожий md), полноэкранно
  - `get <filename>` — скачать файл в `--path`
  - `help`
  - `exit` (или `q` внутри fullscreen README)

Примеры:
```bash
mip repo kiwinatra/mip
mip repo kiwinatra/mip --branch master --path downloads
```

---

## Extra commands

### `mip language <lang>`
Устанавливает язык сообщений.

Поддерживаемые языки берутся из `lib/i18n/languages.js`.

Пример:
```bash
mip language ru
mip language en
```

---

### `mip legacy <action> [packageName]`
Вспомогательная команда для “legacy fallback” механики.

По `lib/commands/legacy.js` поддерживаются действия:
- `list` — показать legacy пакеты (по структуре `.mip` + правилам LegacyFallback)
- `fix <packageName>` — эмулировать зависимости для пакета
- `clean` — очистить эмуляции

Примеры:
```bash
mip legacy list
mip legacy fix react
mip legacy clean
```

---

### `mip dedupe [--full]` (и `-f`)
Анализирует и устраняет дубликаты пакетов.

По `lib/commands/dedupe.js`:
- сначала анализирует (`Deduplicator.analyze()`)
- выводит отчёт
- просит подтверждение (`y`)
- `--full` включает полную дедупликацию, иначе — быстрый режим

Примеры:
```bash
mip dedupe
mip dedupe --full
mip dedupe -f
```

---

### `mip genlock`
Генерирует/пересобирает `mip-lock.json` на основе `mip.json`.

По `lib/commands/genlock.js`:
- читает `dependencies + devDependencies`
- для каждого пакета получает `latest` в рамках заданного `versionRange`
- заполняет `packages` в lock:
  - `version`, `resolved`, `dependencies`, `peerDependencies`, `installPath`

Пример:
```bash
mip genlock
```

---

### `mip exports <pkg>`
Показывает экспортируемые пути (exports) пакета.

По `lib/commands/exports.js`:
- использует `ExportsResolver`
- выводит список путей, иконкой отмечает наличие

Пример:
```bash
mip exports react
```

---

### Super-fast mode (не отдельная команда)
`bin/mip.js` поддерживает “супер-режим” для установки через флаги:
- `mip install ... --super` или `-s`
- в этом режиме задействуется `superInstall` (ускоренная загрузка/extract с параллельной установкой)

Пример:
```bash
mip install react --super
mip install --super
```

