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

        assert.ok(require('fs').existsSync(path.join(dir, 'mip.yml')));
        assert.ok(require('fs').existsSync(path.join(dir, '.mip')));

        const raw = require('fs').readFileSync(path.join(dir, 'mip.yml'), 'utf8');
        assert.ok(raw.length > 0, 'mip.yml should not be empty');
        assert.ok(/\bname\b/i.test(raw), 'mip.yml should contain name');
        assert.ok(/\blanguage\b/i.test(raw), 'mip.yml should contain language');


        assert.ok(require('fs').existsSync(path.join(dir, '.mip', 'packages')));
        assert.ok(require('fs').existsSync(path.join(dir, '.mip', 'cache')));
        assert.ok(require('fs').existsSync(path.join(dir, '.mip', 'temp')));
      });
    } finally {
      cleanupDir(dir);
    }
  });

  it('re-runs init without throwing when mip.yml already exists', async () => {
    const dir = createTmpDir('mip-test-init-reenter-');
    try {
      globalThis.__MIP_TEST_MODE__ = true;
      await withCwd(dir, async () => {
        const { init } = require('../../lib/commands/init');
        init();
        init();

        assert.ok(require('fs').existsSync(path.join(dir, 'mip.yml')));
        assert.ok(require('fs').existsSync(path.join(dir, '.mip')));
      });
    } finally {
      delete globalThis.__MIP_TEST_MODE__;
      cleanupDir(dir);
    }
  });

});
