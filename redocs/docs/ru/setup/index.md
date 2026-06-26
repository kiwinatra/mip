```markdown
---
title: "Установка и настройка MIP"
description: "Как установить MIP и настроить его для вашего проекта."
---

# Установка и настройка MIP ⚙️

Этот раздел поможет вам установить MIP и настроить ваш первый проект.

---

## 📚 Содержание

| Раздел | Описание |
|--------|----------|
| [Быстрый старт](/ru/setup/quick-start) | Установка и первый проект за 5 минут |
| [Конфигурация](/ru/setup/configuration) | Все настройки `mip.yml` |

---

## 🚀 Быстрый старт

### 1. Установите MIP

```bash
git clone https://github.com/kiwinatra/mip
cd mip
npm install
npm run build
```

### 2. Создайте проект

```bash
mip init
```

MIP создаст:
- `mip.yml` — конфигурация проекта в YAML
- `.mip/` — директория для кэша и манифеста
- `README.md` — файл с инструкциями

### 3. Установите зависимости

```bash
mip install express
```

### 4. Запустите проект

```bash
mip run start
```

---

## 📁 Структура проекта

После `mip init` у вас появится:

```
my-project/
├── mip.yml          # Конфигурация проекта (YAML)
├── mip-lock.yml     # Зафиксированные версии (YAML)
├── .mip/
│   ├── manifest.json # Манифест установленных пакетов
│   ├── cache/        # Кэш загрузок
│   └── packages/     # Локальные пакеты
└── node_modules/     # Симлинки на глобальный кэш
```

---

## 🔧 Основные команды

```bash
# Инициализация
mip init

# Установка пакетов
mip install <package>

# Запуск скриптов
mip run <script>

# Список пакетов
mip list

# Обновление пакетов
mip update

# Удаление пакетов
mip uninstall <package>

# Проверка безопасности
mip audit
```

---

## 🌍 Смена языка

```bash
mip language ru
```

Доступные языки: `en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

---

## 🔗 Связанные страницы

- [Быстрый старт](/ru/setup/quick-start) — подробный гайд
- [Конфигурация](/ru/setup/configuration) — настройка `mip.yml`
- [Команды](/ru/commands/install) — все команды MIP
