---
title: "Проблемы с lock-файлами"
description: "Проблемы с mip-lock.json и их решение."
---

# Проблемы с lock-файлами 🔒

`mip-lock.json` — важный файл, который фиксирует точные версии зависимостей. Если он повреждён или не синхронизирован, могут возникать проблемы.

---

## 🔍 Что такое lock-файл?

`mip-lock.json` — это файл, в котором MIP хранит:

- Точные версии всех установленных пакетов
- URL tarball-архивов
- SHA256-хеши для проверки целостности
- Дерево зависимостей

**Пример:**

```json
{
  "version": "1.0.0",
  "packages": {
    "lodash@4.17.21": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-...",
      "dependencies": {}
    }
  }
}
```

---

## 🐛 Частые проблемы

### 1. Lock-файл не найден

**Ошибка:**
```
❌ Lockfile not found. Run mip install first
```

**Причина:** `mip-lock.json` отсутствует или был удалён.

**Решение:**
```bash
# Создай lock-файл
mip install
```

---

### 2. Lock-файл повреждён

**Ошибка:**
```
❌ Failed to parse lockfile
SyntaxError: Unexpected token ...
```

**Причина:** Файл повреждён или содержит невалидный JSON.

**Решение:**
```bash
# Проверь содержимое
cat mip-lock.json

# Удали и пересоздай
rm -f mip-lock.json
mip install
```

---

### 3. `--frozen-lockfile` ошибка

**Ошибка:**
```
❌ Frozen lockfile check failed:
  • lodash: missing from lockfile
  • axios: extra in lockfile
💡 Run 'mip install' to update lockfile
```

**Причина:** `mip.json` изменён, но lock-файл не обновлён.

**Решение:**
```bash
# Обнови lock-файл
mip install

# Закоммить изменения
git add mip-lock.json
git commit -m "chore: update lockfile"
```

---

### 4. Конфликт версий в lock-файле

**Ошибка:**
```
❌ Version conflict in lockfile
```

**Причина:** В lock-файле есть конфликтующие версии одного пакета.

**Решение:**
```bash
# Дедупликация
mip dedupe

# Или переустанови
rm -rf .mip node_modules
rm -f mip-lock.json
mip install
```

---

### 5. Lock-файл не синхронизирован с .mip/

**Ошибка:**
```
⚠️ Missing packages: lodash
```

**Причина:** Пакет есть в lock-файле, но отсутствует в `.mip/`.

**Решение:**
```bash
# Переустанови все пакеты
mip install
```

---

## 🛠️ Восстановление

### Полное восстановление

```bash
# Удали всё
rm -rf .mip node_modules
rm -f mip-lock.json

# Установи заново
mip install

# Проверь
mip list
```

### Обновление lock-файла

```bash
# Обнови lock-файл без установки
mip genlock
```

### Дедупликация

```bash
# Удали дублирующиеся версии
mip dedupe
```

---

## 🔬 Проверка lock-файла

### Просмотр содержимого

```bash
cat mip-lock.json | jq '.packages | keys'
```

### Проверка целостности

```bash
# Проверь SHA256-хеши
mip doctor
```

### Сравнение с mip.json

```bash
# Проверь синхронизацию
mip ci --frozen-lockfile
```

---

## 🧹 Очистка

### Удалить lock-файл

```bash
rm -f mip-lock.json
```

### Пересоздать lock-файл

```bash
mip install
```

### Очистить и пересоздать

```bash
rm -f mip-lock.json
rm -rf .mip
mip install
```

---

## 💡 Лучшие практики

1. **Всегда коммить `mip-lock.json`** — гарантирует воспроизводимость
2. **Не редактируй lock-файл вручную** — используй команды MIP
3. **Используй `mip ci --frozen-lockfile` в CI** — проверяет синхронизацию
4. **Периодически запускай `mip dedupe`** — удаляет дубликаты
5. **Храни lock-файл в репозитории** — ускоряет установку

---

## 🔗 Связанные страницы

- [mip genlock](/commands/genlock) — генерация lock-файла
- [mip ci](/commands/ci) — установка из lock-файла
- [mip dedupe](/commands/dedupe) — дедупликация
- [mip doctor](/commands/doctor) — диагностика
