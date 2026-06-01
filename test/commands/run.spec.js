const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { createTmpDir, cleanupDir, writeJson } = require('../helpers/tmp-project');
const { withCwd } = require('../helpers/with-cwd');

// These tests validate that run() reads scripts from mip.json and propagates failures.
// We stub spawn by using a simple executable script as the "command".

describe('mip core: run', () => {
  it('executes configured script and exits non-zero when command fails', async () => {
    const dir = createTmpDir('mip-test-run-');
    try {
      await withCwd(dir, async () => {
        writeJson(path.join(dir, 'mip.json'), {
          name: 'test',
          version: '1.0.0',
          language: 'en',
          dependencies: {},
          devDependencies: {},
          scripts: {
            fail: 'node -e "process.exit(3)"'
          }
        });

        // Ensure .mip exists to avoid path probing overhead.
        fs.mkdirSync(path.join(dir, '.mip'), { recursive: true });

        const { run } = require('../../lib/commands/run');

        // run() uses spawn + listens to close handler that calls process.exit().
        // Intercept process.exit to turn it into an assertion.
        const originalExit = process.exit;
        let exitCode;
        process.exit = (code) => {
          exitCode = code;
        };

        try {
          await run('fail');

          // Wait a bit for spawned process close event.
          await new Promise((r) => setTimeout(r, 300));
          assert.equal(exitCode, 3);
        } finally {
          process.exit = originalExit;
        }
      });
    } finally {
      cleanupDir(dir);
    }
  });
});

