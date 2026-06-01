# mip documentation

Документация разбита на два направления:

- **Users** — как пользоваться `mip` (установка, `mip.json`, команды, lockfile, примеры).
- **Developers** — как устроен код и где что находится.

## Quick links

- [Users: Quick start](./users/quick-start.md)
- [Users: Project config (`mip.json`) + lockfile (`mip-lock.json`)](./users/config-and-lockfile.md)
- [Users: Commands](./users/commands.md)
- [Users: Examples](./users/examples.md)
- [Users: CI & Security](./users/ci-and-security.md)
- [Users: Troubleshooting](./users/troubleshooting.md)

- [Developers: Architecture overview](./dev/architecture.md)
- [Developers: Commands system](./dev/commands-system.md)
- [Developers: Install flow & `.mip` layout](./dev/install-flow.md)
- [Developers: i18n](./dev/i18n.md)
- [Developers: Debugging & local development](./dev/hacking.md)

## Про заметки к коду

`mip` намеренно “читаемый”. Если вы хотите разобраться в деталях поведения:
- ищите реализацию команды в `lib/commands/<command>.js`
- ищите внутренние механизмы установки/кэша в `lib/core/*` и `lib/utils/*`
