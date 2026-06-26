---
title: "mip run — запуск пользовательских скриптов"
description: "Команда run выполняет скрипты, определённые в секции scripts файла mip.yml, с поддержкой всех установленных пакетов в PATH."
---

# mip run

::: callout info "Что это?" icon:play
`mip run` — это команда для выполнения пользовательских скриптов из `mip.yml` (или `package.json` для совместимости). Она автоматически добавляет в `PATH` все бинарники из установленных пакетов (через манифест), позволяя использовать их в скриптах без глобальной установки. Это удобно для запуска тестов, сборки проекта, линтеров и любых других задач, связанных с вашим проектом.
:::

## Синтаксис

```bash
mip run <script-name>
```

## Аргументы

| Имя | Тип | Обязательный | Описание |
|-----|-----|--------------|----------|
| `script-name` | строка | ✅ | Имя скрипта из секции `scripts` в `mip.yml` |

## Логика работы

1. **Чтение конфига** — команда загружает `mip.yml` (или `package.json` для совместимости) из текущей директории.

2. **Поиск скрипта** — ищет указанный скрипт в секции `scripts`.

3. **Сбор путей бинарников** — сканирует манифест `.mip/manifest.json` и собирает все папки `.bin` из установленных пакетов.

4. **Обновление `PATH`** — все найденные папки с бинарниками добавляются в переменную окружения `PATH` (с приоритетом над системными).

5. **Запуск скрипта** — выполняет команду через системную оболочку:
   - **Windows:** `cmd.exe /d /s /c <script>`
   - **Unix:** `sh -c <script>`

6. **Обработка завершения** — код возврата скрипта передаётся как код завершения `mip run`.

## Примеры

::: tabs
== tab "Запуск скрипта из mip.yml"
```bash
mip run test
```

**Пример `mip.yml`:**
```yaml
scripts:
  test: jest --coverage
  start: node index.js
  build: webpack --mode production
```

**Вывод:**
```
🏃 Running "test" script...
> jest --coverage

 PASS  src/utils.test.js
 PASS  src/api.test.js
...
```
:::
== tab "Скрипт не найден"
```bash
mip run unknown
```

**Вывод:**
```
❌ Script "unknown" not found

📋 Available scripts:
  • test
  • start
  • build
```
:::
== tab "Нет скриптов в mip.yml"
```bash
mip run start
```

**Вывод:**
```
❌ Script "start" not found

💡 Add scripts to mip.yml:
  scripts:
    start: node index.js
    dev: nodemon index.js
```
:::

## Типичные ошибки

::: callout warning "❌ No mip.yml found" icon:alert-triangle
**Причина:** Вы находитесь не в корне MIP-проекта.

**Решение:**
1. Перейдите в папку с проектом: `cd /path/to/project`
2. Убедитесь, что там есть `mip.yml`.
3. Если нет — создайте его: `mip init`
:::

::: callout warning "❌ Script not found" icon:alert-circle
**Причина:** Указанный скрипт отсутствует в секции `scripts`.

**Решение:**
1. Добавьте скрипт в `mip.yml`:
   ```yaml
   scripts:
     my-script: node my-script.js
   ```
2. Используйте `mip run` с правильным именем.
:::

::: callout warning "⚠️ Command not found (даже с mip run)" icon:alert-triangle
**Причина:** Утилита не установлена локально.

**Решение:**
1. Установите нужный пакет локально: `mip install <package>`
2. Проверьте, что бинарник доступен: `mip exec <command>`
3. Запустите скрипт снова.
:::

::: callout tip "💡 Совет" icon:lightbulb
`mip run` — это аналог `npm run` или `yarn run`, но с MIP-специфичными улучшениями:

- **Автоматический `PATH`** — не нужно устанавливать пакеты глобально.
- **Кроссплатформенность** — корректно работает на Windows и Unix.
- **Простота** — достаточно указать имя скрипта.

**Примеры скриптов:**
```yaml
scripts:
  start: node index.js
  dev: nodemon index.js
  test: jest --coverage
  build: webpack --mode production
  lint: eslint src/
  format: prettier --write src/
```
:::

## Связанные команды

- [mip exec](/ru/commands/exec) — выполнение конкретного бинарника без скрипта.
- [mip install](/ru/commands/install) — установка пакетов, бинарники которых становятся доступны.
- [mip init](/ru/commands/init) — создание `mip.yml` с секцией `scripts`.

::: collapsible "🧠 Как работает автоматический PATH?"
Когда вы запускаете `mip run`, команда:

1. **Сканирует манифест** — читает `.mip/manifest.json`, где хранятся пути ко всем установленным пакетам.
2. **Собирает папки `.bin`** — для каждого пакета проверяет:
   - `node_modules/.bin/`
   - `.bin/` (в корне пакета)

3. **Формирует `PATH`**:
   ```
   PATH = <все .bin папки> + <системный PATH>
   ```

4. **Запускает скрипт** — все бинарники из глобального кэша становятся доступны без глобальной установки.

**Преимущество:** не нужно устанавливать пакеты глобально — всё работает из проекта.
:::
