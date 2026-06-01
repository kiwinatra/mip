# Debugging & local development (Developers)

Эта страница про то, как запускать mip локально и где смотреть логи/ошибки.

## Локальный запуск

Точка входа CLI: `bin/mip.js`.

Полезные варианты:
```bash
node bin/mip.js --help
node bin/mip.js init
node bin/mip.js install express
```

## Тестовый режим

В `init.js` есть специальная ветка для конкуретного запуска тестов:
- при наличии `globalThis.__MIP_TEST_MODE__` команда `mip init` не падает, если `mip.json` уже существует (только убеждается, что структура `.mip/` создана).

Это сделано для надёжности тестов при повторных/параллельных запусках.

## Где смотреть код поведения команды

Правило:
- `mip <cmd>` → файл `lib/commands/<cmd>.js`

Например:
- `mip install` → `lib/commands/install.js`
- `mip run` → `lib/commands/run.js`
- `mip exec` → `lib/commands/exec.js`
- `mip audit` → `lib/commands/audit.js`

## Где смотреть “суть” установки

- Resolver/peer deps: `lib/core/peer-resolver.js`
- Скачивание/metadata: `lib/utils/registry.js` (npm registry + offline fallback)
- Разворачивание `.mip/<name>/<version>/`: `lib/commands/install.js`
- CI развертка из lockfile: `lib/commands/ci.js`

## Важные файлы проекта

- `mip.json` — конфиг проекта
- `mip-lock.json` — lockfile с версиями и tarball resolved URL
- `.mip/` — локальный магазин пакетов
- `node_modules/` — создаются symlink/junction заглушки для удобства запуска

## Логи и отладка

Многие команды выводят сообщения через i18n (`t('...')`), поэтому:
- находите ключи по `t('commands.<cmd>....')` в `lib/commands/*.js`
- переводческие ключи ищите в `lib/i18n/locales/*.json`

Если нужно больше деталей:
- запускайте mip в режиме, когда отображаются stacktraces:
  - через `process.env.DEBUG` (в `bin/mip.js` он выводит `err` при ошибках)
