const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { createTmpDir, cleanupDir } = require('../helpers/tmp-project');
const { withCwd } = require('../helpers/with-cwd');

function captureConsoleLog() {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.map((a) => String(a)).join(' ') + '\n';
  };
  return {
    getOutput: () => output,
    restore: () => {
      console.log = originalLog;
    },
  };
}

describe('mip cache status', () => {
  it('prints local cache stats and supports --json', async () => {
    const dir = createTmpDir('mip-test-cache-status-');
    try {
      await withCwd(dir, async () => {
        fs.mkdirSync(path.join(dir, '.mip', 'cache'), { recursive: true });

        // create some fake cache files (best-effort)
        const p1 = path.join(dir, '.mip', 'cache', 'pkgA', '1.0.0');
        const p2 = path.join(dir, '.mip', 'cache', 'pkgB', '2.0.0');
        fs.mkdirSync(p1, { recursive: true });
        fs.mkdirSync(p2, { recursive: true });
        fs.writeFileSync(path.join(p1, 'file.txt'), 'hello');
        fs.writeFileSync(path.join(p2, 'file2.txt'), 'world!');

        const cap = captureConsoleLog();
        try {
          const { cache } = require('../../lib/commands/cache');
          await cache('status', { json: true, global: false });

          const out = cap.getOutput();
          assert.ok(out.includes('"scope"'), 'should output JSON');

          const parsed = JSON.parse(out.trim());
          assert.equal(parsed.scope, 'local');
          assert.ok(parsed.entries >= 2);
          assert.ok(parsed.bytes > 0);
          assert.equal(parsed.path, path.join(dir, '.mip', 'cache'));
        } finally {
          cap.restore();
        }
      });
    } finally {
      cleanupDir(dir);
    }
  });
});

