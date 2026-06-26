const assert = require('assert');
const nock = require('nock');

describe('audit: external API mocking', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('auditor API resolves vulnerabilities deterministically (mocked)', async () => {
    const dir = require('fs').mkdtempSync(
      require('path').join(require('os').tmpdir(), 'mip-test-audit-api-')
    );
    try {
      const fs = require('fs');
      const path = require('path');
      const { withCwd } = require('../helpers/with-cwd');
      const { cleanupDir } = require('../helpers/tmp-project');

      fs.writeFileSync(
        path.join(dir, 'mip.json'),
        JSON.stringify(
          { name: 'test', version: '1.0.0', language: 'en', dependencies: {}, devDependencies: {} },
          null,
          2
        )
      );

      fs.writeFileSync(
        path.join(dir, 'mip-lock.json'),
        JSON.stringify(
          {
            packages: {
              'leftpad@1.3.0': {
                version: '1.3.0',
                dependencies: {},
                peerDependencies: {},
              },
            },
          },
          null,
          2
        )
      );

      const scope = nock('https://registry.npmjs.org')
        .get('/-/npm/v1/security/advisories')
        .query(q => q && q.package === 'leftpad')
        .reply(200, {
          objects: [
            {
              id: 123,
              title: 'Prototype Pollution',
              severity: 'moderate',
              url: 'https://example.com',
              cvss: { score: 5.0 },
              vulnerable_versions: '<=1.3.0',
              patched_versions: '1.3.1',
              recommendation: 'Upgrade',
            },
          ],
        });

      await withCwd(dir, async () => {
        // Capture output so assertions are stable.
        let output = '';
        const originalLog = console.log;

        console.log = (...args) => {
          output += args.map(a => String(a)).join(' ') + '\n';
        };

        try {
          const { audit } = require('../../lib/commands/audit');
          await audit({ fix: false });

          assert.ok(output.includes('Prototype Pollution'), 'should print advisory title');
          assert.ok(output.includes('leftpad@1.3.0'), 'should print vulnerable package');
          assert.ok(output.includes('CVSS:'), 'should print CVSS line');
          assert.ok(output.includes('Fix:'), 'should print Fix line');
        } finally {
          console.log = originalLog;
        }
      });

      assert.ok(scope.isDone(), 'expected npm advisory API request was not performed');
      cleanupDir(dir);
    } finally {
      // cleanup in outer finally in case of early failure
      try {
        require('../helpers/tmp-project').cleanupDir(dir);
      } catch (_) {}
    }
  });
});
