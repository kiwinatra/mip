---
title: "CI/CD с MIP"
description: "Как использовать MIP в CI/CD пайплайнах: установка, аудит, деплой, GitHub Actions."
---

# CI/CD с MIP 🚀

MIP отлично подходит для CI/CD благодаря команде `mip ci`, которая оптимизирована для автоматических сред.

---

## 📦 Основы

### Команда `mip ci`

Устанавливает зависимости строго по `mip-lock.yml`.

```bash
mip ci
```

**Что делает:**
1. Проверяет наличие `mip-lock.yml`
2. Устанавливает пакеты из lock-файла
3. Верифицирует целостность
4. Не обновляет lock-файл

### `--frozen-lockfile`

Проверяет, что lock-файл синхронизирован с `mip.yml`.

```bash
mip ci --frozen-lockfile
```

Если есть расхождения — команда завершается с ошибкой.

---

## 🐙 GitHub Actions

### Минимальный workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install MIP
        run: npm install -g mip

      - name: Install dependencies
        run: mip ci --frozen-lockfile

      - name: Run tests
        run: mip run test
```

### С кэшированием глобального стора

```yaml
name: CI with cache

on: push

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Cache MIP store
        uses: actions/cache@v3
        with:
          path: ~/.mip/store
          key: ${{ runner.os }}-mip-${{ hashFiles('mip-lock.yml') }}
          restore-keys: |
            ${{ runner.os }}-mip-

      - name: Install MIP
        run: npm install -g mip

      - name: Install dependencies
        run: mip ci --frozen-lockfile

      - name: Run tests
        run: mip run test
```

---

## 🔒 Безопасность

### Аудит в CI

```yaml
- name: Security audit
  run: mip audit --json

- name: Check for vulnerabilities
  run: |
    VULNS=$(mip audit --json | jq '.vulnerabilities | length')
    if [ "$VULNS" -gt 0 ]; then
      echo "⚠️ Found $VULNS vulnerabilities!"
      exit 1
    fi
```

### Автофикс уязвимостей

```yaml
- name: Fix vulnerabilities
  run: mip audit --fix

- name: Commit fixes
  run: |
    git config user.name "GitHub Actions"
    git config user.email "actions@github.com"
    git add mip-lock.yml mip.yml
    git commit -m "chore: auto-fix vulnerabilities" || exit 0
    git push
```

---

## 🏗️ Сборка и деплой

### Сборка проекта

```yaml
- name: Build project
  run: mip run build

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: dist
    path: dist/
```

### Деплой на GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy docs

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install MIP
        run: npm install -g mip

      - name: Build docs
        run: mip run docs:build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site
```

---

## 🐳 Docker

### Dockerfile

```dockerfile
FROM node:18-alpine

# Устанавливаем MIP
RUN npm install -g mip

WORKDIR /app

COPY mip.yml mip-lock.yml ./
RUN mip ci --frozen-lockfile

COPY . .
RUN mip run build

CMD ["mip", "run", "start"]
```

### Сборка и запуск

```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```

---

## 🔧 GitLab CI

```yaml
# .gitlab-ci.yml
image: node:18

stages:
  - install
  - test
  - build

cache:
  paths:
    - ~/.mip/store

install:
  stage: install
  script:
    - npm install -g mip
    - mip ci --frozen-lockfile
  artifacts:
    paths:
      - node_modules/

test:
  stage: test
  script:
    - mip run test
    - mip audit

build:
  stage: build
  script:
    - mip run build
  artifacts:
    paths:
      - dist/
```

---

## 🔄 CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  build:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run:
          name: Install MIP
          command: npm install -g mip
      - run:
          name: Install dependencies
          command: mip ci --frozen-lockfile
      - run:
          name: Run tests
          command: mip run test
      - run:
          name: Build
          command: mip run build
```

---

## 🧪 Лучшие практики

### 1. Всегда используй `--frozen-lockfile`

```bash
mip ci --frozen-lockfile
```

Это гарантирует, что lock-файл синхронизирован.

### 2. Кэшируй глобальный стор

```yaml
- name: Cache MIP store
  uses: actions/cache@v3
  with:
    path: ~/.mip/store
    key: ${{ runner.os }}-mip-${{ hashFiles('mip-lock.yml') }}
```

### 3. Запускай аудит в CI

```bash
mip audit --json
```

### 4. Используй `mip doctor` для диагностики

```yaml
- name: Check environment
  run: mip doctor
```

### 5. Проверяй устаревшие пакеты

```yaml
- name: Check outdated packages
  run: mip outdated --json
```

---

## 📊 Пример полного CI пайплайна

```yaml
name: Full CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Cache MIP store
        uses: actions/cache@v3
        with:
          path: ~/.mip/store
          key: ${{ runner.os }}-mip-${{ hashFiles('mip-lock.yml') }}

      - name: Install MIP
        run: npm install -g mip

      - name: Install dependencies
        run: mip ci --frozen-lockfile

      - name: Run linter
        run: mip run lint

      - name: Run tests
        run: mip run test

      - name: Security audit
        run: mip audit --json

      - name: Build
        run: mip run build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

---

## 🔗 Связанные страницы

- [mip ci](/ru/commands/ci) — установка в CI
- [mip audit](/ru/commands/audit) — проверка безопасности
- [mip outdated](/ru/commands/outdated) — проверка устаревших пакетов
- [mip doctor](/ru/commands/doctor) — диагностика окружения
