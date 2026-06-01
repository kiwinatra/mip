const assert = require('assert');
const path = require('path');

const { createTmpDir, cleanupDir, writeJson } = require('../helpers/tmp-project');
const { withCwd } = require('../helpers/with-cwd');

describe('mip core: init', () => {
  it('creates mip.json and .mip structure', async () => {
    const dir = createTmpDir('mip-test-init-');
    try {
      await withCwd(dir, async () => {
        const { init } = require('../../lib/commands/init');
        init();

        assert.ok(require('fs').existsSync(path.join(dir, 'mip.json')));
        assert.ok(require('fs').existsSync(path.join(dir, '.mip')));

        const config = JSON.parse(require('fs').readFileSync(path.join(dir, 'mip.json'), 'utf8'));
        assert.equal(typeof config.name, 'string');
        assert.equal(config.language, 'en');
        assert.deepEqual(config.dependencies, {});

        assert.ok(require('fs').existsSync(path.join(dir, '.mip', 'packages')));
        assert.ok(require('fs').existsSync(path.join(dir, '.mip', 'cache')));
        assert.ok(require('fs').existsSync(path.join(dir, '.mip', 'temp')));
      });
    } finally {
      cleanupDir(dir);
    }
  });

  it('re-runs init in test mode without throwing when mip.json already exists', async () => {
    const dir = createTmpDir('mip-test-init-reenter-');
    try {
      globalThis.__MIP_TEST_MODE__ = true;
      await withCwd(dir, async () => {
        const { init } = require('../../lib/commands/init');
        init();
        init();

        assert.ok(require('fs').existsSync(path.join(dir, 'mip.json')));
      });
    } finally {
      delete globalThis.__MIP_TEST_MODE__;
      cleanupDir(dir);
    }
  });
});

