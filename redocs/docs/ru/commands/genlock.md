---
title: "mip genlock — генерация lock-файла"
description: "Команда genlock создаёт файл mip-lock.yml на основе зависимостей из mip.yml, фиксируя точные версии и URLs для воспроизводимой установки."
---

# mip genlock

::: callout info "Что это?" icon:lock
`mip genlock` генерирует **lock-файл** (`mip-lock.yml`) на основе зависимостей, указанных в `mip.yml`. В отличие от `mip install`, эта команда не устанавливает пакеты локально, а только резолвит их версии и создаёт файл с зафиксированными версиями, URLs и зависимостями. Это полезно для предварительной генерации lock-файла в CI/CD или после ручного обновления `mip.yml`.
:::

## Синтаксис

```bash
mip genlock
```

## Логика работы

1. **Проверка наличия `mip.yml`** — команда проверяет, существует ли файл `mip.yml` в текущей директории. Если нет — выполнение прерывается.

2. **Чтение зависимостей** — из `mip.yml` извлекаются секции `dependencies` и `devDependencies`.

3. **Резолвинг версий** — для каждой зависимости (имя + диапазон версий) выполняется запрос к реестру npm для получения точной последней версии, удовлетворяющей диапазону.

4. **Сбор метаданных** — для каждого пакета запрашиваются:
   - Точная версия (`version`).
   - URL tarball-архива (`resolved`).
   - Список зависимостей (`dependencies`).
   - Список peer-зависимостей (`peerDependencies`).

5. **Генерация lock-файла** — создаётся `mip-lock.yml` со структурой:
   ```yaml
   version: 1.0.0
   generatedAt: '2026-01-15T14:23:00.000Z'
   packages:
     lodash@4.17.21:
       version: 4.17.21
       resolved: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
       dependencies: {}
       peerDependencies: {}
       installPath: .mip/lodash/4.17.21
   ```

6. **Вывод результатов** — показывает, сколько пакетов успешно добавлено в lock-файл.

## Примеры

::: tabs
== tab "Генерация lock-файла"
```bash
mip genlock
```

**Пример вывода:**
```
🔒 Generating lockfile...
  ⏳ Resolving packages... 1/42
  ⏳ Resolving packages... 42/42

✅ Generated mip-lock.yml with 42 packages
```
:::
== tab "Когда mip.yml пуст"
```bash
mip genlock
```

**Пример вывода:**
```
ℹ️ No dependencies found in mip.yml
```
:::
== tab "При ошибке резолвинга"
```bash
mip genlock
```

**Пример вывода:**
```
🔒 Generating lockfile...
  ⏳ Resolving packages... 1/42
  ❌ Failed to resolve some-package@^2.0.0: Package not found

✅ Generated mip-lock.yml with 41 packages
```
:::

## Типичные ошибки

::: callout danger "❌ mip.yml not found" icon:skull
**Причина:** В текущей директории нет файла `mip.yml`.

**Решение:**
1. Убедитесь, что вы находитесь в корне проекта.
2. Если проект новый — создайте `mip.yml` с помощью `mip init`.
3. Или используйте `mip create` для создания готового проекта.
:::

::: callout warning "❌ No dependencies found" icon:info
**Причина:** В `mip.yml` не указаны зависимости (пустые секции `dependencies` и `devDependencies`).

**Решение:** Это не ошибка, а просто предупреждение. Если вы хотите зафиксировать зависимости — добавьте их в `mip.yml` и запустите `mip genlock` снова.
:::

::: callout danger "❌ Failed to resolve package" icon:alert-circle
**Причина:** Пакет не найден в реестре или указанная версия не существует.

**Решение:**
1. Проверьте правильность имени пакета и версии в `mip.yml`.
2. Проверьте интернет-соединение.
3. Если пакет приватный — убедитесь, что настроены правильные регистры.
4. После исправления запустите `mip genlock` заново.
:::

::: callout tip "💡 Совет" icon:lightbulb
`mip genlock` **требует доступ к реестру**, так как резолвит версии в реальном времени.

Рекомендуется использовать `mip genlock`:
- **После ручного редактирования** `mip.yml`.
- **В CI/CD** для создания lock-файла из `mip.yml` без установки пакетов.
- **В скриптах автоматизации** для проверки доступности зависимостей.
:::

## Связанные команды

- [mip install](/ru/commands/install) — устанавливает зависимости и генерирует lock-файл.
- [mip ci](/ru/commands/ci) — устанавливает зависимости **из lock-файла**.
- [mip update](/ru/commands/update) — обновляет зависимости и пересоздаёт lock-файл.

::: collapsible "🧠 Зачем нужен lock-файл?"
Lock-файл — это **снимок дерева зависимостей** в конкретный момент времени. Он гарантирует:

1. **Воспроизводимость** — все разработчики и CI получают **одинаковые** версии пакетов.
2. **Скорость** — не нужно резолвить зависимости при каждой установке.
3. **Безопасность** — если пакет будет удалён из реестра, у вас всё равно есть зафиксированная версия.

**Разница между `mip install` и `mip genlock`:**
| Команда | Устанавливает пакеты в глобальный кэш | Генерирует lock-файл |
|---------|--------------------------------------|-------------------|
| `mip install` | ✅ Да | ✅ Да (если нет lock-файла) |
| `mip genlock` | ❌ Нет | ✅ Да (всегда) |

`mip genlock` позволяет **заранее подготовить lock-файл** в CI, не тратя время на установку пакетов.
:::

::: collapsible "🔧 Формат mip-lock.yml"
```yaml
version: 1.0.0
generatedAt: '2026-01-15T14:23:00.000Z'
packages:
  lodash@4.17.21:
    version: 4.17.21
    resolved: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
    dependencies: {}
    peerDependencies: {}
    installPath: .mip/lodash/4.17.21
  react@18.2.0:
    version: 18.2.0
    resolved: https://registry.npmjs.org/react/-/react-18.2.0.tgz
    dependencies:
      loose-envify: ^1.1.0
      scheduler: ^0.23.0
    peerDependencies: {}
    installPath: .mip/react/18.2.0
```

**Поля:**
- `version` — версия формата lock-файла (для будущей совместимости).
- `generatedAt` — время генерации (ISO 8601).
- `packages` — объект с ключами вида `name@version` и метаданными.
- `resolved` — URL для скачивания tarball.
- `installPath` — путь, где будет установлен пакет (относительно корня проекта).
:::
