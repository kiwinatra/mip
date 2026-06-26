---
title: "Ошибки установки"
description: "Проблемы при установке пакетов и их решение."
---

# Ошибки установки 📦

Самые частые проблемы, возникающие при установке пакетов, и способы их решения.

---

## 🔍 Общая диагностика

### Проверка окружения

```bash
mip doctor
```

### Проверка lock-файла

```bash
cat mip-lock.json
```

### Проверка кэша

```bash
mip cache size
```

---

## 🐛 Частые ошибки

### 1. `mip-lock.json` не найден

**Ошибка:**
```
❌ Lockfile not found. Run mip install first
```

**Причина:** Lock-файл отсутствует или был удалён.

**Решение:**
```bash
mip install
```

---

### 2. Пакет не найден в реестре

**Ошибка:**
```
❌ Package not found: some-package
```

**Причина:** Пакет не существует в реестре.

**Решение:**
```bash
# Проверь название
mip search some-package

# Убедись, что пакет существует
mip info some-package
```

---

### 3. Версия не найдена

**Ошибка:**
```
❌ Version not found: some-package@99.99.99
```

**Причина:** Указана несуществующая версия.

**Решение:**
```bash
# Посмотри доступные версии
mip info some-package
```

---

### 4. Нет прав на запись

**Ошибка:**
```
❌ EACCES: permission denied
```

**Причина:** Нет прав на запись в `.mip/` или `node_modules/`.

**Решение:**
```bash
# Исправь права
sudo chown -R $(whoami) .

# Или удали и пересоздай
rm -rf .mip node_modules
mip install
```

---

### 5. Ошибка SSL

**Ошибка:**
```
❌ UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

**Причина:** Проблемы с SSL-сертификатами.

**Решение:**
```bash
# Отключи строгую проверку (временно)
NODE_TLS_REJECT_UNAUTHORIZED=0 mip install

# Или обнови Node.js
```

---

### 6. Пакет уже установлен

**Ошибка:**
```
✅ Package already installed
```

**Это не ошибка.** Просто пакет уже есть.

**Решение:**
```bash
# Принудительно переустанови
mip install lodash --force
```

---

### 7. Нет свободного места

**Ошибка:**
```
❌ ENOSPC: no space left on device
```

**Причина:** Закончилось место на диске.

**Решение:**
```bash
# Очисти кэш
mip cache clean

# Удали старые пакеты
mip uninstall <package>

# Проверь размер
mip cache size
```

---

### 8. Конфликт зависимостей

**Ошибка:**
```
❌ Peer dependency conflict
```

**Причина:** Пакет требует другую версию зависимости.

**Решение:**
```bash
# Установи требуемую версию
mip install lodash@4.17.20

# Или обнови все пакеты
mip update
```

---

## 🧹 Очистка и переустановка

### Полная переустановка

```bash
# Очисти всё
rm -rf .mip node_modules
rm -f mip-lock.json
mip cache clean

# Установи заново
mip install
```

### Только кэш

```bash
mip cache clean
mip install
```

### Только lock-файл

```bash
rm -f mip-lock.json
mip install
```

---

## 🛠️ Отладка

### Включи debug

```bash
DEBUG=1 mip install lodash
```

### Посмотри логи

```bash
# Логи выводятся в консоль
# Для плагинов-логгеров:
cat mip.log
```

### Проверь версии

```bash
mip --version
node --version
```

---

## 🔗 Связанные страницы

- [Сеть и регистры](/troubleshooting/network) — проблемы с сетью
- [Lock-файлы](/troubleshooting/lockfile) — проблемы с lock-файлами
- [mip doctor](/commands/doctor) — диагностика окружения
- [mip cache](/commands/cache) — управление кэшем
