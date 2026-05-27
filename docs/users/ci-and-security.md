# CI & Security (Users)

`mip` поддерживает два ключевых сценария для “продакшн/без сюрпризов”:

- **CI install строго по lockfile**: `mip ci`
- **Поиск уязвимостей**: `mip audit` (и опционально попытка `--fix`)

## `mip ci`

### Базовый сценарий
1. В проекте должен быть `mip-lock.json`
2. В проекте должен быть `mip.json`
3. Затем mip развернёт пакеты в `.mip/` согласно lockfile

Команда:
```bash
mip ci
```

### Frozen lockfile (строгость)
```bash
mip ci --frozen-lockfile
```

Что проверяется:
- зависимости из `mip.json` должны соответствовать версиям в `mip-lock.json`
- если в lockfile есть “лишние” пакеты или `mip.json` требует чего-то, чего нет в lockfile — mip завершится с ошибкой

## `mip audit`

Команда:
```bash
mip audit
```

Что делает:
- читает `mip-lock.json`
- для каждого пакета запрашивает security advisories из npm registry
- сравнивает текущую версию пакета с уязвимыми диапазонами (`semver`)
- печатает список уязвимостей с severity и ссылками

### Авто-попытка фикса: `--fix`
```bash
mip audit --fix
```

Как это работает по реализации:
- если в advisory есть `patched_versions`,
- mip пытается выбрать “подходящую” версию (внутри патч-листа),
- затем запускает `mip install <name>@<fixedVersion>`
- и синхронизирует `mip.json`, обновляя версию зависимости (dependencies или devDependencies)

> Важно: авто-fix сделан как попытка. Если advisory/версии не позволяют безопасно подобрать патч — понадобится ручная корректировка.

## Рекомендуемый workflow

1) Разработчик обновляет зависимости:
```bash
mip install express
mip update
```

2) Зафиксировать результат:
```bash
# в git
git add mip.json mip-lock.json .mip/ (обычно lockfile достаточно)
git commit
```

3) На CI:
```bash
mip ci --frozen-lockfile
```

4) При необходимости:
```bash
mip audit
# или
mip audit --fix
