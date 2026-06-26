---
title: "mip search — поиск пакетов в реестре"
description: "Команда search ищет пакеты в реестре npm по ключевому слову, показывая название, версию и описание."
---

# mip search

::: callout info "Что это?" icon:search
`mip search` — это команда для поиска пакетов в реестре npm. Она принимает ключевое слово и возвращает список пакетов, соответствующих запросу, с указанием версии и краткого описания. Это удобно, когда вы ищете библиотеку для своего проекта, но не знаете точного названия.
:::

## Синтаксис

```bash
mip search <query>
```

## Аргументы

| Имя | Тип | Обязательный | Описание |
|-----|-----|--------------|----------|
| `query` | строка | ✅ | Ключевое слово или фраза для поиска |

## Логика работы

1. **Проверка аргументов** — если запрос не указан, выводится справка по использованию.

2. **Отправка запроса в реестр** — команда выполняет поиск через API реестра npm.

3. **Получение результатов** — возвращается до 20 пакетов, соответствующих запросу.

4. **Форматирование вывода** — для каждого пакета показывается:
   - Имя и версия.
   - Описание (обрезается до 70 символов).

5. **Отчёт о количестве** — показывается общее количество найденных пакетов.

## Примеры

::: tabs
== tab "Поиск по ключевому слову"
```bash
mip search express
```

**Пример вывода:**
```
🔍 Searching for packages matching: express...

Found 15 packages:

├── express@4.18.2
    📝 Fast, unopinionated, minimalist web framework for Node.js

├── express-graphql@0.12.0
    📝 GraphQL HTTP server middleware for Express

├── express-session@1.17.3
    📝 Session middleware for Express.js

└── express-validator@7.0.1
    📝 Express.js middleware for request validation
```
:::
== tab "Поиск с префиксом скоупа"
```bash
mip search @docmd/core
```

**Пример вывода:**
```
🔍 Searching for packages matching: @docmd/core...

Found 3 packages:

├── @docmd/core@0.8.7
    📝 Documentation engine from Markdown

├── @docmd/plugin-openapi@0.8.7
    📝 OpenAPI plugin for docmd

└── @docmd/plugin-mermaid@0.8.7
    📝 Mermaid plugin for docmd
```
:::
== tab "Ничего не найдено"
```bash
mip search some-very-rare-package
```

**Пример вывода:**
```
🔍 Searching for packages matching: some-very-rare-package...

❌ No packages found
```
:::
== tab "Пустой запрос"
```bash
mip search
```

**Пример вывода:**
```
📋 Usage: mip search <query>
```
:::

## Типичные ошибки

::: callout warning "❌ No packages found" icon:info
**Причина:** По вашему запросу ничего не найдено.

**Решение:**
1. Проверьте правильность написания.
2. Попробуйте другое ключевое слово.
3. Возможно, пакет удалён или недоступен.
:::

::: callout warning "❌ Failed to search" icon:alert-circle
**Причина:** Проблемы с сетью или реестр npm недоступен.

**Решение:**
1. Проверьте интернет-соединение.
2. Проверьте доступность реестра: `mip doctor`
3. Попробуйте позже.
:::

::: callout tip "💡 Совет" icon:lightbulb
`mip search` — это первый шаг перед установкой пакета:
1. Используйте `mip search` для поиска нужного пакета.
2. Посмотрите описание и версию.
3. Установите пакет: `mip install <package>`.

**Советы по поиску:**
- Используйте общие ключевые слова (например, `http` вместо `http-client`).
- Для фреймворков используйте их имя (например, `react`, `vue`).
- Для скоуп-пакетов указывайте полное имя: `@namespace/package`.
:::

## Связанные команды

- [mip info](/ru/commands/info) — подробная информация о пакете.
- [mip install](/ru/commands/install) — установка найденного пакета.
- [mip list](/ru/commands/list) — просмотр уже установленных пакетов.
