---
title: "CI/CD with MIP"
description: "How to use MIP in CI/CD pipelines: installation, audit, deploy, GitHub Actions."
---

# CI/CD with MIP 🚀

MIP is great for CI/CD thanks to the `mip ci` command, optimized for automated environments.

---

## 📦 Basics

### The `mip ci` command

Installs dependencies strictly from `mip-lock.yml`.

```bash
mip ci
```

**What it does:**
1. Checks for `mip-lock.yml`
2. Installs packages from the lockfile
3. Verifies integrity
4. Does not update the lockfile

### `--frozen-lockfile`

Checks that the lockfile is synced with `mip.yml`.

```bash
mip ci --frozen-lockfile
```

If there are discrepancies — the command exits with an error.

---

## 🐙 GitHub Actions

### Minimal workflow

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

### With global store caching

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

## 🔒 Security

### Audit in CI

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

### Auto-fix vulnerabilities

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

## 🏗️ Build and deploy

### Build project

```yaml
- name: Build project
  run: mip run build

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: dist
    path: dist/
```

### Deploy to GitHub Pages

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

# Install MIP
RUN npm install -g mip

WORKDIR /app

COPY mip.yml mip-lock.yml ./
RUN mip ci --frozen-lockfile

COPY . .
RUN mip run build

CMD ["mip", "run", "start"]
```

### Build and run

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

## 🧪 Best practices

### 1. Always use `--frozen-lockfile`

```bash
mip ci --frozen-lockfile
```

This ensures the lockfile is synced.

### 2. Cache the global store

```yaml
- name: Cache MIP store
  uses: actions/cache@v3
  with:
    path: ~/.mip/store
    key: ${{ runner.os }}-mip-${{ hashFiles('mip-lock.yml') }}
```

### 3. Run audit in CI

```bash
mip audit --json
```

### 4. Use `mip doctor` for diagnostics

```yaml
- name: Check environment
  run: mip doctor
```

### 5. Check outdated packages

```yaml
- name: Check outdated packages
  run: mip outdated --json
```

---

## 📊 Full CI pipeline example

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

## 🔗 Related pages

- [mip ci](/commands/ci) — installation in CI
- [mip audit](/commands/audit) — security check
- [mip outdated](/commands/outdated) — check outdated packages
- [mip doctor](/commands/doctor) — environment diagnostics
