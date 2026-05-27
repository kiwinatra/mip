# `mip.json` и `mip-lock.json`

`mip` хранит конфигурацию проекта в `mip.json` и фиксацию версий в `mip-lock.json`.
Это ключ к воспроизводимым установкам и работе команд `ci` и `audit`.

## `mip.json`

Проект создаётся командой `mip init`.
Минимальная форма (из `lib/commands/init.js` и шаблонов):

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "language": "en",
  "dependencies": {},
  "devDependencies": {}
}
```

Что используется по коду:
- `dependencies` — зависимости приложения
- `devDependencies` — зависимости для разработки
- `scripts` — опционально (см. `mip run <script>`)
- `language` — влияет на перевод сообщений CLI (i18n)

Пример с `scripts`:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "language": "en",
  "dependencies": { "express": "latest" },
  "devDependencies": { "nodemon": "latest" },
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  }
}
```

> `mip install` и `mip audit --fix` обновляют `mip.json`:
> - `install` добавляет/перезаписывает пакет в `dependencies` или `devDependencies`
> - `audit --fix` заменяет версию на `fixedVersion` в соответствующем разделе

## Lockfile: `mip-lock.json`

Команда `mip install` записывает `mip-lock.json` в формате:

```json
{
  "packages": {
    "name@version": {
      "version": "version",
      "resolved": "tarball url",
      "dependencies": { "dep": "range" },
      "peerDependencies": { "peer": "range" },
      "installPath": ".mip/name/version"
    }
  }
}
```

Как это используется:
- `mip ci` разворачивает пакеты строго по lockfile (без попыток подобрать новые версии)
- `mip list` сравнивает данные lockfile с фактическим содержимым `.mip`
- `mip audit` сканирует уязвимости по версиям из lockfile

## Как выбирать стратегию

- Хотите воспроизводимый build/CI: используйте `mip-lock.json` + `mip ci`
- Хотите обновления по желанию: используйте `mip update`, затем пересохраняйте lockfile
- Хотите “зафиксировать” консистентность: используйте `mip ci --frozen-lockfile`

## `mip ci --frozen-lockfile`

Когда включён `--frozen-lockfile`, mip проверяет:
- что каждый пакет из `mip.json` присутствует в lockfile
- что в lockfile нет “лишних” пакетов, которых нет в `mip.json`

При несовпадениях процесс завершается с ошибкой.
