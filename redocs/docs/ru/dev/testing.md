---
title: "Тестирование в MIP"
description: "Как писать и запускать тесты для MIP — юнит-тесты, интеграционные тесты, тестирование плагинов."
---

# Тестирование в MIP 🧪

MIP использует **Jest** для тестирования. Тесты лежат в папке `tests/`.

---

## 📁 Структура тестов

```
tests/
├── unit/                    # Юнит-тесты
│   ├── resolver.test.js
│   ├── registry.test.js
│   └── ...
├── integration/             # Интеграционные тесты
│   ├── install.test.js
│   ├── audit.test.js
│   └── ...
└── fixtures/                # Тестовые данные
    ├── mip.json
    └── mip-lock.json
```

---

## 🧪 Запуск тестов

```bash
# Запустить все тесты
npm test

# Запустить с покрытием
npm test -- --coverage

# Запустить конкретный файл
npm test -- tests/unit/resolver.test.js

# Запустить в режиме наблюдения
npm test -- --watch
```

---

## ✍️ Написание юнит-тестов

### Тестирование утилит

```javascript
// tests/unit/registry.test.js
const { getPackageInfo } = require('../../lib/utils/registry');

describe('registry', () => {
  test('getPackageInfo returns package info', async () => {
    const info = await getPackageInfo('lodash', 'latest');
    expect(info.name).toBe('lodash');
    expect(info.version).toBeDefined();
  });

  test('getPackageInfo handles invalid package', async () => {
    await expect(getPackageInfo('invalid-package-123', 'latest')).rejects.toThrow();
  });
});
```

### Тестирование core-компонентов

```javascript
// tests/unit/resolver.test.js
const { DependencyResolver } = require('../../lib/core/resolver');

describe('DependencyResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  test('resolveVersion returns correct version', async () => {
    const result = await resolver.resolveVersion('lodash', '^4.0.0');
    expect(result.name).toBe('lodash');
    expect(result.version).toMatch(/^4\./);
  });

  test('resolveVersion caches results', async () => {
    const result1 = await resolver.resolveVersion('lodash', '^4.0.0');
    const result2 = await resolver.resolveVersion('lodash', '^4.0.0');
    expect(result1).toBe(result2);
  });
});
```

---

## 🔗 Интеграционные тесты

### Тестирование команд

```javascript
// tests/integration/install.test.js
const { install } = require('../../lib/commands/install');
const fs = require('fs');
const path = require('path');

describe('install command', () => {
  const testDir = path.join(__dirname, '../fixtures/test-project');

  beforeEach(() => {
    // Создаём тестовый проект
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    // Удаляем тестовый проект
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('installs package', async () => {
    await install('lodash');
    const lockPath = path.join(testDir, 'mip-lock.json');
    expect(fs.existsSync(lockPath)).toBe(true);
  });
});
```

### Тестирование через CLI

```javascript
// tests/integration/cli.test.js
const { execSync } = require('child_process');
const path = require('path');

describe('CLI integration', () => {
  const cli = path.join(__dirname, '../../bin/mip.js');

  test('mip --version works', () => {
    const output = execSync(`node ${cli} --version`, { encoding: 'utf8' });
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test('mip init creates mip.json', () => {
    execSync(`node ${cli} init`, { encoding: 'utf8' });
    const fs = require('fs');
    expect(fs.existsSync('mip.json')).toBe(true);
  });
});
```

---

## 🧩 Тестирование плагинов

### Тестирование плагина изолированно

```javascript
// tests/unit/plugin.test.js
const plugin = require('../../plugins/hello/index');

describe('hello plugin', () => {
  test('plugin has name', () => {
    expect(plugin.name).toBe('hello');
  });

  test('plugin has commands', () => {
    expect(plugin.commands).toBeDefined();
    expect(plugin.commands.hello).toBeDefined();
  });

  test('plugin command works', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    await plugin.commands.hello(['zshx']);
    expect(consoleSpy).toHaveBeenCalledWith('Hello, zshx! 👋');
    consoleSpy.mockRestore();
  });
});
```

### Интеграционный тест плагина

```javascript
// tests/integration/plugin-install.test.js
const { getPluginManager } = require('../../lib/api/plugin-manager');

describe('plugin installation', () => {
  test('plugin loads correctly', () => {
    const pm = getPluginManager();
    const plugin = pm.getPlugin('hello');
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('hello');
  });

  test('plugin command is registered', () => {
    const pm = getPluginManager();
    const api = require('../../lib/api/api-methods').getApiMethods();
    const commands = api.getRegisteredCommands();
    expect(commands.has('hello')).toBe(true);
  });
});
```

---

## 📦 Фикстуры

Создавай тестовые данные в `tests/fixtures/`:

```json
// tests/fixtures/mip.json
{
  "name": "test-project",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

```json
// tests/fixtures/mip-lock.json
{
  "version": "1.0.0",
  "packages": {
    "lodash@4.17.21": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "dependencies": {}
    }
  }
}
```

---

## 🔧 Моки и стабы

### Мок реестра

```javascript
// tests/unit/registry.mock.js
jest.mock('../../lib/utils/registry', () => ({
  getPackageInfo: jest.fn().mockResolvedValue({
    name: 'lodash',
    version: '4.17.21',
    tarball: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
    dependencies: {},
  }),
  searchPackages: jest.fn().mockResolvedValue([
    { name: 'lodash', version: '4.17.21', description: 'Lodash utilities' },
  ]),
}));
```

### Мок файловой системы

```javascript
// tests/unit/fs.mock.js
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({ name: 'test' })),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));
```

---

## 🚀 CI/CD интеграция

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test
      - run: npm run build
```

---

## 📊 Покрытие кода

```bash
# Запустить с покрытием
npm test -- --coverage

# Открыть отчёт в браузере
open coverage/lcov-report/index.html
```

**Минимальные требования:**
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

---

## 🐛 Отладка тестов

```bash
# Запустить с отладкой
node --inspect-brk node_modules/.bin/jest --runInBand

# В браузере открыть chrome://inspect
```

---

## Связанные страницы

- [Архитектура MIP](/dev/architecture) — устройство проекта
- [Добавление команд](/dev/adding-commands) — как создать команду
- [Хуки и плагины](/dev/hooks) — расширение функциональности
