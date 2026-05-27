# Install flow & `.mip` layout (Developers)

Понимание установки важно, чтобы:
- объяснить “почему mip такой быстрый”
- дебажить проблемы пакетов
- понимать, где лежит кеш и как устроен lockfile

## Схема хранения

Установленные пакеты кладутся в проект:
- `.mip/<name>/<version>/`

При установке также создаётся запись для использования из кода:
- `node_modules/<name>` → symlink/junction на `.mip/<name>/<version>`

Также есть директории:
- `.mip/packages/` (создаётся `mip init`, используется как заготовка структуры)
- `.mip/cache/` (заготовка)
- `.mip/temp/` (заготовка)

## Локальная установка (`mip install`)

По `lib/commands/install.js`:

1) Разбор аргументов:
   - `mip install <pkg>` → локальная установка в проект
   - `-g/--global` → установка в `~/.mip/global` (отдельный сценарий)

2) Определение версии и metadata:
   - `getPackageInfo(name, versionRange)` из `lib/utils/registry.js`
   - получаем `tarball`, `version`, `dependencies`, `peerDependencies`

3) Скачивание и распаковка:
   - качает `tarball` по `axios.get(... responseType: 'arraybuffer')`
   - распаковывает `tar -xzf -` в директорию:
     - `.mip/<name>/<version>/`

4) Запись lockfile:
   - обновляется `mip-lock.json`
   - ключ пакета в lockfile: `"name@version"`
   - содержимое включает:
     - `version`, `resolved` (tarball url)
     - `dependencies`, `peerDependencies`
     - `installPath: ".mip/name/version"`

5) Связывание в `node_modules`:
   - создаётся ссылка `node_modules/<name>` → `.mip/<name>/<version>`
   - используется:
     - `fs.symlinkSync(..., 'junction')` (Windows-friendly)
     - fallback: `fs.cpSync(...)` если symlink не вышел

6) Установка зависимостей рекурсивно:
   - для каждого `dependencies[depName]`:
     - проверяется `mip-lock.json` (есть ли уже установленная версия)
     - если не удовлетворяет semver — устанавливается

## CI установка (`mip ci`)

`lib/commands/ci.js` делает иначе:

- читает `mip-lock.json`
- разворачивает **строго** указанные версии в `.mip/`
- опционально проверяет `--frozen-lockfile` (соответствие `mip.json` и lockfile)

## Почему `.mip` вместо `node_modules`

По философии проекта:
- один раз кладём пакеты в `.mip`
- используем их напрямую/через ссылки
- меньше дублирования на диске и проще “читать” файлы
