const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');

const { createTmpDir, cleanupDir, writeJson } = require('../helpers/tmp-project');
const { withCwd } = require('../helpers/with-cwd');

function captureConsoleLog() {
  let output = '';
  const originalLog = console.log;

  console.log = (...args) => {
    output += args.map(a => String(a)).join(' ') + '\n';
  };

  return {
    getOutput: () => output,
    restore: () => {
      console.log = originalLog;
    },
  };
}

describe('output validation', () => {
  it('audit command does not call axios when mip-lock.json missing', async () => {
    const dir = createTmpDir('mip-test-audit-lock-');
    try {
      await withCwd(dir, async () => {
        writeJson(path.join(dir, 'mip.json'), {
          name: 'test',
          version: '1.0.0',
          language: 'en',
          dependencies: {},
          devDependencies: {},
        });

        const axios = require('axios');
        const axiosGet = sinon.stub(axios, 'get');

        const cap = captureConsoleLog();
        try {
          const { audit } = require('../../lib/commands/audit');
          await audit({ fix: false });

          assert.equal(
            axiosGet.called,
            false,
            'axios.get must not be called when mip-lock.json is missing'
          );
          assert.ok(
            cap.getOutput().length > 0,
            'audit must print something even when lock is missing'
          );
        } finally {
          cap.restore();
          axiosGet.restore();
        }
      });
    } finally {
      cleanupDir(dir);
    }
  });

  it('audit prints no_packages when mip-lock.json exists but contains no packages', async () => {
    const dir = createTmpDir('mip-test-audit-no-packages-');
    try {
      await withCwd(dir, async () => {
        writeJson(path.join(dir, 'mip.json'), {
          name: 'test',
          version: '1.0.0',
          language: 'en',
          dependencies: {},
          devDependencies: {},
        });

        writeJson(path.join(dir, 'mip-lock.json'), {
          packages: {},
        });

        const cap = captureConsoleLog();
        try {
          const { audit } = require('../../lib/commands/audit');
          await audit({ fix: false });

          const output = cap.getOutput();
          assert.ok(output.length > 0, 'audit should output something');
          // invariant from implementation: early return when packages length is 0
          assert.ok(
            /no_packages/i.test(output) ||
              /no packages/i.test(output) ||
              output.includes('no_packages') ||
              output.includes('no_packages'),
            'should indicate no packages'
          );
        } finally {
          cap.restore();
        }
      });
    } finally {
      cleanupDir(dir);
    }
  });

  it('audit prints no_vulnerabilities when mip-lock.json has packages but axios returns empty advisories', async () => {
    const dir = createTmpDir('mip-test-audit-no-vulns-');
    try {
      await withCwd(dir, async () => {
        writeJson(path.join(dir, 'mip.json'), {
          name: 'test',
          version: '1.0.0',
          language: 'en',
          dependencies: {},
          devDependencies: {},
        });

        writeJson(path.join(dir, 'mip-lock.json'), {
          packages: {
            'leftpad@1.3.0': {
              version: '1.3.0',
              dependencies: {},
              peerDependencies: {},
            },
          },
        });

        const axios = require('axios');
        const axiosGet = sinon.stub(axios, 'get').resolves({ data: { objects: [] } });

        const cap = captureConsoleLog();
        try {
          const { audit } = require('../../lib/commands/audit');
          await audit({ fix: false });

          const output = cap.getOutput();
          assert.ok(axiosGet.calledOnce, 'axios.get should be called');
          assert.ok(output.length > 0, 'audit should output something');
          // Implementation early return when vulnerabilities.length === 0
          assert.ok(
            /no_vulnerabilities/i.test(output) ||
              /no vulnerabilities/i.test(output) ||
              output.includes('no_vulnerabilities'),
            'should indicate no vulnerabilities'
          );
        } finally {
          cap.restore();
          axiosGet.restore();
        }
      });
    } finally {
      cleanupDir(dir);
    }
  });

  it('audit handles axios errors without throwing', async () => {
    const dir = createTmpDir('mip-test-audit-axios-error-');
    try {
      await withCwd(dir, async () => {
        writeJson(path.join(dir, 'mip.json'), {
          name: 'test',
          version: '1.0.0',
          language: 'en',
          dependencies: {},
          devDependencies: {},
        });

        writeJson(path.join(dir, 'mip-lock.json'), {
          packages: {
            'leftpad@1.3.0': {
              version: '1.3.0',
              dependencies: {},
              peerDependencies: {},
            },
          },
        });

        const axios = require('axios');
        const axiosGet = sinon.stub(axios, 'get').rejects(new Error('boom'));

        const cap = captureConsoleLog();
        try {
          const { audit } = require('../../lib/commands/audit');
          await audit({ fix: false });

          const output = cap.getOutput();
          assert.ok(
            output.includes('ERR_NO_CONNECTION') || output.length > 0,
            'should not throw on axios errors'
          );
        } finally {
          cap.restore();
          axiosGet.restore();
        }
      });
    } finally {
      cleanupDir(dir);
    }
  });

  it('init creates README.md when absent', async () => {
    const dir = createTmpDir('mip-test-init-readme-');
    try {
      await withCwd(dir, async () => {
        const { init } = require('../../lib/commands/init');
        init();
        assert.ok(fs.existsSync(path.join(dir, 'README.md')));

        const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
        assert.ok(
          readme.includes('Created with ❤️ using mip'),
          'README.md should contain the standard footer'
        );
      });
    } finally {
      cleanupDir(dir);
    }
  });
});
