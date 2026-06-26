---
title: "mip uninstall — удаление пакетов"
description: "Команда uninstall удаляет пакеты из проекта, очищая их из глобального кэша, манифеста, mip-lock.yml и mip.yml."
---

# mip uninstall

::: callout info "Что это?" icon:trash
`mip uninstall` — это команда для удаления пакетов из вашего проекта. Она полностью очищает пакет из `node_modules/`, удаляет его из `mip-lock.yml`, манифеста и (по умолчанию) из `mip.yml`. В отличие от ручного удаления, команда гарантирует, что не останется «мусора» в файлах конфигурации.
:::

## Синтаксис

```bash
mip uninstall <package-name> [--no-save]
```

## Аргументы

| Имя | Тип | Обязательный | Описание |
|-----|-----|--------------|----------|
| `package-name` | строка | ✅ | Имя пакета для удаления |

## Опции

| Флаг | Описание |
|------|----------|
| `--no-save` | Удаляет пакет из `node_modules/`, манифеста и lock-файла, но **не удаляет** из `mip.yml` |

## Логика работы

1. **Проверка `mip.yml`** — если файл отсутствует, команда завершается с ошибкой.

2. **Удаление из манифеста** (`manifest.json`):
   - Удаляет запись о пакете из `.mip/manifest.json`.

3. **Удаление симлинка из `node_modules/`**:
   - Удаляет символическую ссылку на пакет.

4. **Удаление из `mip-lock.yml`**:
   - Удаляет все записи, начинающиеся с `<package-name>@`.

5. **Удаление из `mip.yml`** (если `--no-save` не указан):
   - Удаляет пакет из `dependencies` и `devDependencies`.

6. **Очистка глобального кэша** — пакет НЕ удаляется из `~/.mip/store/`, так как может использоваться другими проектами.

7. **Вывод результата** — показывает, что было удалено.

## Примеры

::: tabs
== tab "Обычное удаление"
```bash
mip uninstall lodash
```

**Вывод:**
```
🗑️ Removing lodash...
  ✅ Removed from manifest: lodash
  ✅ Removed from node_modules: lodash
  ✅ Removed from lockfile: lodash@4.17.21
  ✅ Removed from mip.yml: lodash

✅ Removed lodash (1 version)
```
:::
== tab "Удаление без сохранения"
```bash
mip uninstall lodash --no-save
```

**Вывод:**
```
🗑️ Removing lodash...
  ✅ Removed from manifest: lodash
  ✅ Removed from node_modules: lodash
  ✅ Removed from lockfile: lodash@4.17.21

✅ Removed lodash from project (kept in mip.yml)
```
:::
== tab "Пакет не найден"
```bash
mip uninstall unknown-package
```

**Вывод:**
```
❌ Package unknown-package not found
```
:::

## Типичные ошибки

::: callout warning "❌ mip.yml not found" icon:alert-triangle
**Причина:** Вы находитесь не в корне MIP-проекта.

**Решение:**
1. Перейдите в папку с проектом: `cd /path/to/project`
2. Убедитесь, что там есть `mip.yml`.
3. Если нет — создайте его: `mip init`
:::

::: callout warning "❌ Package not found" icon:info
**Причина:** Указанный пакет не установлен в проекте.

**Решение:**
1. Проверьте список установленных пакетов: `mip list`
2. Убедитесь, что вы правильно написали имя пакета.
:::

::: callout tip "💡 Совет" icon:lightbulb
`mip uninstall` — это безопасный способ удаления пакетов:
- Автоматически очищает все файлы конфигурации.
- Не удаляет пакет из глобального кэша (экономит время при переустановке).
- Показывает, что было удалено.

**После удаления:**
1. Проверьте, что `mip.yml` обновился.
2. Запустите `mip list` для подтверждения.
3. Если есть сомнения, используйте `--no-save`.
:::

## Связанные команды

- [mip install](/ru/commands/install) — установка пакетов.
- [mip list](/ru/commands/list) — просмотр установленных пакетов.
- [mip outdated](/ru/commands/outdated) — проверка устаревших пакетов.
