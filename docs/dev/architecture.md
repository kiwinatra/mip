# Architecture overview (Developers)

Проект разбит на 3 слоя:

- **CLI / entrypoint**
  - `bin/mip.js` — точка входа команд
  - `lib/ui/cli.js` — UI helpers (цвета, прогресс-бар)

- **Commands**
  - `lib/commands/*.js` — реализации команд `mip <command> ...`
  - каждая команда отвечает за I/O и бизнес-логику своего кейса

- **Core / utilities**
  - `lib/core/*` — внутренние механизмы (resolver, кэш/аудит, работа с workspace и т.п.)
  - `lib/utils/*` — вспомогательные штуки (реестр, registry queries, mipignore и т.д.)

## Command loading style

У `lib/index.js` есть lazy-loading через Proxy:
- `lib/index.js` динамически подгружает `lib/commands/<name>.js`
- `lib/index.js` динамически подгружает `lib/utils/<name>.js`
- `lib/index.js` динамически подгружает `lib/core/<name>.js`

Это позволяет не тянуть всё сразу и держит код компактным.
