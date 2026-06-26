---
title: "Testing in MIP"
description: "How to write and run tests for MIP — unit tests, integration tests, plugin testing."
---

# Testing in MIP 🧪

MIP uses **Jest** for testing. Tests are located in the `tests/` folder.

---

## 📁 Test structure

```
tests/
├── unit/                    # Unit tests
│   ├── resolver.test.js
│   ├── registry.test.js
│   └── ...
├── integration/             # Integration tests
│   ├── install.test.js
│   ├── audit.test.js
│   └── ...
└── fixtures/                # Test data
    ├── mip.yml
    └── mip-lock.yml
```

---

## 🧪 Running tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run a specific file
npm test -- tests/unit/resolver.test.js

# Run in watch mode
npm test -- --watch
```

---

## ✍️ Writing unit tests

### Testing utilities

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

### Testing core components

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

## 🔗 Integration tests

### Testing commands

```javascript
// tests/integration/install.test.js
const { install } = require('../../lib/commands/install');
const fs = require('fs');
const path = require('path');

describe('install command', () => {
  const testDir = path.join(__dirname, '../fixtures/test-project');

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('installs package', async () => {
    await install('lodash');
    const lockPath = path.join(testDir, 'mip-lock.yml');
    expect(fs.existsSync(lockPath)).toBe(true);
  });
});
```

### Testing via CLI

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

  test('mip init creates mip.yml', () => {
    execSync(`node ${cli} init`, { encoding: 'utf8' });
    const fs = require('fs');
    expect(fs.existsSync('mip.yml')).toBe(true);
  });
});
```

---

## 🧩 Testing plugins

### Isolated plugin testing

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

### Plugin integration test

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

## 📦 Fixtures

Create test data in `tests/fixtures/`:

```yaml
# tests/fixtures/mip.yml
name: test-project
version: 1.0.0
dependencies:
  lodash: ^4.17.21
```

```yaml
# tests/fixtures/mip-lock.yml
version: 1.0.0
packages:
  lodash@4.17.21:
    version: 4.17.21
    resolved: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
    dependencies: {}
```

---

## 🔧 Mocks and stubs

### Registry mock

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

### File system mock

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

## 🚀 CI/CD integration

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

## 📊 Code coverage

```bash
# Run with coverage
npm test -- --coverage

# Open report in browser
open coverage/lcov-report/index.html
```

**Minimum requirements:**
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

---

## 🐛 Debugging tests

```bash
# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Open chrome://inspect in browser
```

---

## Related pages

- [MIP Architecture](/dev/architecture) — project structure
- [Adding commands](/dev/adding-commands) — how to create a command
- [Hooks and plugins](/dev/hooks) — extending functionality
