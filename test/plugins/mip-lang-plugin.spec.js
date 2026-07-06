const assert = require('assert');
const fs = require('fs');
const path = require('path');

const os = require('os');

const { getPluginManager } = require('../../lib/api/plugin-manager');

function tmpDir(prefix = 'mip-test-plugins-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function requireFresh(modulePath) {
  // ensure clean require between tests
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
}

// PluginManager is a singleton and ConfigHandler is also singleton-like.
// To keep tests isolated, we reload both modules by purging require cache.
function resetSingletons() {
  for (const m of [
    '../../lib/api/plugin-manager',
    '../../lib/api/config-handler',
    '../../lib/api/api-methods',
    '../../lib/api/hooks',
  ]) {
    try {
      const resolved = require.resolve(m);
      delete require.cache[resolved];
    } catch {
      // ignore
    }
  }
}

describe('plugins: mip-lang', () => {
  let dir;
  let cwd;
  beforeEach(() => {
    dir = tmpDir('mip-lang-plugin-');
    cwd = process.cwd();
    fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true });

    // minimal project config; plugin enabling is opt-out (enabled defaults to true)
    writeJson(path.join(dir, 'mip.json'), {
      name: 'test',
      version: '1.0.0',
      language: 'en',
      dependencies: {},
      devDependencies: {},
      plugins: {}
    });

    // Copy builtin plugin source into temp project.
    // We copy the JS files + templates; tests will mutate locales/templates.
    fs.mkdirSync(path.join(dir, 'plugins', 'mip-lang'), { recursive: true });
    const src = path.join(cwd, 'mip-plugins', 'mip-lang');

    // Recursive copy
    const copyRecursive = (from, to) => {
      const stat = fs.statSync(from);
      if (stat.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        for (const entry of fs.readdirSync(from)) {
          copyRecursive(path.join(from, entry), path.join(to, entry));
        }
      } else {
        fs.copyFileSync(from, to);
      }
    };

    copyRecursive(src, path.join(dir, 'plugins', 'mip-lang'));

    resetSingletons();
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(cwd);
    rmDir(dir);
  });

  it('mip-lang init creates plugins/mip-lang/locales and templates directories', async () => {
    const { getPluginManager } = requireFresh('../../lib/api/plugin-manager');
    // force load
    const pm = getPluginManager();

    // plugin should be loaded from plugins/mip-lang folder
    assert.ok(pm.getPlugin('mip-lang'), 'mip-lang plugin should be registered');

    // locales/templates dirs created by plugin.init
    assert.ok(
      fs.existsSync(path.join(dir, 'plugins', 'mip-lang', 'locales')),
      'locales dir should exist'
    );
    assert.ok(
      fs.existsSync(path.join(dir, 'plugins', 'mip-lang', 'templates')),
      'templates dir should exist'
    );
  });

  it('mip-lang create copies translations from a template into a new locales/<lang>.json', async () => {
    const pm = requireFresh('../../lib/api/plugin-manager').getPluginManager();
    const plugin = pm.getPlugin('mip-lang');
    assert.ok(plugin, 'mip-lang should be loaded');

    // call via plugin commands through ApiMethods registered by plugin manager
    // ApiMethods.registerCommand already happened during plugin registration.
    // We can run it via api.runRegisteredCommand.
    const api = pm.api;

    await pm.runCommand('mip-lang', 'create', ['pirate', 'en']);

    const target = path.join(dir, 'plugins', 'mip-lang', 'locales', 'pirate.json');
    assert.ok(fs.existsSync(target), 'pirate locale should be created');

    const content = JSON.parse(fs.readFileSync(target, 'utf8'));
    const enTemplate = JSON.parse(
      fs.readFileSync(path.join(dir, 'plugins', 'mip-lang', 'templates', 'en.json'), 'utf8')
    );

    // deep compare a couple of keys
    const enKeys = Object.keys(enTemplate);
    assert.ok(enKeys.length > 0, 'template should have keys');
    const k = enKeys[0];
    assert.deepEqual(content[k], enTemplate[k]);
  });

  it('mip-lang pack creates a distributable plugin directory and index.js', async () => {
    const pm = requireFresh('../../lib/api/plugin-manager').getPluginManager();

    // create language first
    await pm.runCommand('mip-lang', 'create', ['pirate', 'en']);
    const packedDir = path.join(dir, 'plugins', 'mip-lang-pirate');

    await pm.runCommand('mip-lang', 'pack', ['pirate']);

    assert.ok(fs.existsSync(packedDir), 'packed plugin dir should exist');
    assert.ok(fs.existsSync(path.join(packedDir, 'package.json')));
    assert.ok(fs.existsSync(path.join(packedDir, 'index.js')));
    assert.ok(fs.existsSync(path.join(packedDir, 'locales', 'pirate.json')));

    const pkg = JSON.parse(fs.readFileSync(path.join(packedDir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'mip-lang-pirate');
    const idx = fs.readFileSync(path.join(packedDir, 'index.js'), 'utf8');
    assert.ok(idx.includes("mip-lang-pirate"), 'index.js should include plugin name');
  });

  it('mip-lang apply updates mip.json language field via its temp config writer', async () => {
    const pm = requireFresh('../../lib/api/plugin-manager').getPluginManager();

    await pm.runCommand('mip-lang', 'apply', ['pirate']);

    const mipJson = JSON.parse(fs.readFileSync(path.join(dir, 'mip.json'), 'utf8'));
    assert.equal(mipJson.language, 'pirate');
  });

  it('plugin-manager registers plugin commands and runCommand executes them without throwing', async () => {
    const pm = requireFresh('../../lib/api/plugin-manager').getPluginManager();

    // ensure commands exist
    assert.doesNotThrow(() => pm.runCommand('mip-lang', 'help', []));

    // create a locale using runCommand
    await pm.runCommand('mip-lang', 'create', ['pirate2', 'en']);

    assert.ok(
      fs.existsSync(path.join(dir, 'plugins', 'mip-lang', 'locales', 'pirate2.json')),
      'create command should write locale file'
    );
  });
});

