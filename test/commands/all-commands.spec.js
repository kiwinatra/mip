const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileStreaming } = require('../helpers/child-process');

function createTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function createBasicProject(dir) {
  fs.writeFileSync(
    path.join(dir, 'mip.json'),
    JSON.stringify(
      {
        name: 'test',
        version: '1.0.0',
        language: 'en',
        dependencies: {},
        devDependencies: {},
        scripts: {
          ok: 'node -e "console.log(\\"ok\\")"',
        },
      },
      null,
      2
    )
  );

  // Some commands rely on .mip existing.
  fs.mkdirSync(path.join(dir, '.mip', 'cache'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.mip', 'packages'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.mip', 'temp'), { recursive: true });
}

function runMipIn(dir, argv) {
  const mipBin = path.join(__dirname, '../../bin/mip.js');

  return execFileStreaming(process.execPath, [mipBin, ...argv], {
    cwd: dir,
    env: {
      ...process.env,
      // avoid update checks and feature loading
      MIP_TEST_MODE: '1',
      DEBUG: '0',
    },
  });
}

describe('mip cli: smoke tests for all built-in commands', () => {
  it('each command is callable (no MODULE_NOT_FOUND crashes)', async function () {
    this.timeout(180000);

    const PER_CMD_TIMEOUT_MS = 5000;

    const dir = createTmpDir('mip-test-all-commands-');
    try {
      createBasicProject(dir);

      // Commands list aims to cover command router paths.
      // Network-heavy operations are included only in "--help"/TTY-safe modes.
      const commandsToSmoke = [
        // fast/always-available ones
        ['--version'],
        ['--help'],

        ['language', 'en'],
        ['list'],
        ['update'],
        ['search', 'leftpad'],
        ['info', 'leftpad'],
        ['outdated'],
        ['doctor'],
        ['why', 'leftpad'],

        ['hello'],
        ['init'],
        ['cache', 'status', '--json'],

        ['exec', '-e', 'console.log("hi")'],
        ['alias', ''],

        ['plugin', 'mip-lang'],
        ['registry', 'list'],
        ['config', 'get'],

        ['server', '--help'],
        ['publish', '--help'],
        ['genlock'],
        ['feel'],
        ['bundle', '--help'],
        ['exports', ''],
        ['clone', '--help'],

        ['audit'],
        ['run', 'ok'],
        ['cache', 'clean'],
        ['dedupe'],
        ['workspaces'],

        ['repo', 'kiwinatra/mip', '--branch', 'main', '--path', 'download'],
        ['oldrepo', 'kiwinatra/mip', '--branch', 'main', '--path', 'download'],

        ['pe', 'mip-lang', 'help', '--help'],

        ['install', '--help'],
        ['uninstall', 'leftpad', '--help'],

        ['create', 'react', 'my-app'],
        ['super-install', 'leftpad'],
        ['ci', '--help'],
        ['server', '--help'],
      ];

      // Deduplicate commands that are repeated above.
      const unique = [];
      const seen = new Set();
      for (const cmd of commandsToSmoke) {
        const key = cmd.join(' ');
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(cmd);
        }
      }

      for (const argv of unique) {
        const res = await Promise.race([
          runMipIn(dir, argv),
          new Promise(resolve =>
            setTimeout(
              () => resolve({ code: 124, stdout: '', stderr: 'TIMEOUT' }),
              PER_CMD_TIMEOUT_MS
            )
          ),
        ]);

        const combined = `${res.stdout}\n${res.stderr}`;
        assert.ok(
          !/MODULE_NOT_FOUND|Cannot find module/i.test(combined),
          `Command failed with module error: mip ${argv.join(' ')}\nexit=${res.code}\n${combined}`
        );
      }
    } finally {
      cleanupDir(dir);
    }
  });
});

