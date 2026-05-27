# Commands system (Developers)

В mip команды реализованы в виде отдельных файлов:

- `lib/commands/<name>.js`
- вызываются из `bin/mip.js` (switch по `process.argv[2]`)

## CLI entry

`bin/mip.js`:
- парсит `command` (`process.argv[2]`) и `arg` (`process.argv[3]`)
- вызывает соответствующий модуль команды, например:
  - `lib/commands/init.js`
  - `lib/commands/install.js`
  - `lib/commands/run.js`
  - `lib/commands/exec.js`
  - `lib/commands/audit.js`
  - и т.д.

## Lazy-loading (internal exports)

`lib/index.js` использует lazy-loading через `Proxy`:
- `commands.<name>` → `require('./commands/<name>.js')`
- `utils.<name>` → `require('./utils/<name>.js')`
- `core.<name>` → `require('./core/<name>.js')`

Это удобно для читаемости и ускоряет старт без загрузки всего кода.

## Добавление новой команды (практика)

1) Создать файл: `lib/commands/my-command.js`
2) Экспортировать функцию:
   
```js
   module.exports = { myCommand }
   
```
3) Подключить в `bin/mip.js`:
   - добавить `case 'my-command':`
   - вызвать `require('../lib/commands/my-command').myCommand(args...)`

## Как тестировать поведение

Команды тестируются в `test/commands/*` и API/утилитами в `test/api/*`.

Пример:
- `test/commands/init.spec.js`
- `test/commands/run.spec.js`
