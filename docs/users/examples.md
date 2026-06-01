# Examples (Users)

В репозитории есть готовые примеры проектов в папке `examples/`.

## `examples/basic-app`

Файлы:
- `examples/basic-app/mip.json`
- `examples/basic-app/index.js`

Типичный сценарий:
```bash
cp -R examples/basic-app ./my-app
cd my-app

mip install
mip run start
```

Если в `mip.json` уже описаны `scripts`, то `mip run <script>` запустит соответствующую команду.

## `examples/express`

Файлы:
- `examples/express/mip.json`
- `examples/express/server.js`

Старт:
```bash
cp -R examples/express ./my-express
cd my-express

mip install
mip run start
```

## `examples/cli-tools`

Файлы:
- `examples/cli-tools/mip.json`
- `examples/cli-tools/cli.js`

Команды из `mip exec`:
```bash
cp -R examples/cli-tools ./my-cli
cd my-cli

mip install
mip exec <command>
```

> Примечание: `mip exec <command>` ищет бинарники в `.mip/**/.bin` и `.mip/**/node_modules/.bin`.
