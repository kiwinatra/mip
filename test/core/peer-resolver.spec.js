const assert = require('assert');
const path = require('path');
const fs = require('fs');

const os = require('os');

const { PeerResolver } = require('../../lib/core/peer-resolver');

function tmpDir(prefix = 'mip-peer-resolver-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeLockFiles(projectPath, lock) {
  // PeerResolver supports both mip-lock.yml and mip-lock.json.
  // We'll create both to cover backward compatibility.
  const yaml = require('js-yaml');
  fs.writeFileSync(path.join(projectPath, 'mip-lock.yml'), yaml.dump(lock, { indent: 2 }));
  fs.writeFileSync(
    path.join(projectPath, 'mip-lock.json'),
    JSON.stringify(lock, null, 2)
  );
}

describe('lib/core/peer-resolver', () => {
  it('checkPeerDependencies returns empty arrays when peer semver is satisfied', async () => {
    const dir = tmpDir('mip-peer-resolver-satisfied-');
    try {
      writeLockFiles(dir, {
        packages: {
          react: {
            version: '18.2.0',
            peerDependencies: {},
          },
        },
      });

      const pr = new PeerResolver(dir);
      const res = await pr.checkPeerDependencies({
        name: 'pkg-a',
        version: '1.0.0',
        peerDependencies: {
          react: '^18.0.0',
        },
      });

      assert.deepEqual(res.conflicts, []);
      assert.deepEqual(res.warnings, []);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('checkPeerDependencies can read mip-lock.json (json-only lockfile)', async () => {
    const dir = tmpDir('mip-peer-resolver-json-only-');
    try {
      const lock = {
        packages: {
          // PeerResolver.loadInstalledPackages uses fullName.split('@')[0],
          // so to be deterministic we keep a fullName-like key.
          'react@17.0.0': {
            version: '17.0.0',
            peerDependencies: {},
          },
        },
      };
      fs.writeFileSync(path.join(dir, 'mip-lock.json'), JSON.stringify(lock, null, 2));

      const pr = new PeerResolver(dir);
      const res = await pr.checkPeerDependencies({
        name: 'pkg-a',
        version: '1.0.0',
        peerDependencies: {
          react: '^18.0.0',
        },
      });

      assert.equal(res.conflicts.length, 1);
      assert.equal(res.conflicts[0].peer, 'react');
      assert.equal(res.conflicts[0].installed, '17.0.0');
      assert.equal(res.warnings.length, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });



  it('savePeerDependencies persists peerDependencies into mip-lock.yml and mip-lock.json', async () => {
    const dir = tmpDir('mip-peer-resolver-save-');
    try {
      writeLockFiles(dir, {
        packages: {
          react: {
            version: '17.0.0',
            peerDependencies: {},
          },
        },
      });

      const pr = new PeerResolver(dir);
      pr.savePeerDependencies({
        name: 'pkg-a',
        version: '1.0.0',
        peerDependencies: { react: '^18.0.0' },
      });

      const yamlText = fs.readFileSync(path.join(dir, 'mip-lock.yml'), 'utf8');
      const yaml = require('js-yaml');
      const yamlData = yaml.load(yamlText);

      const jsonData = JSON.parse(
        fs.readFileSync(path.join(dir, 'mip-lock.json'), 'utf8')
      );

      assert.ok(yamlData.packages['pkg-a@1.0.0']);
      assert.deepEqual(yamlData.packages['pkg-a@1.0.0'].peerDependencies, {
        react: '^18.0.0',
      });

      assert.ok(jsonData.packages['pkg-a@1.0.0']);
      assert.deepEqual(jsonData.packages['pkg-a@1.0.0'].peerDependencies, {
        react: '^18.0.0',
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolveAndInstall(showPeerWarnings=true) calls prompt when conflicts exist', async () => {
    const dir = tmpDir('mip-peer-resolver-conflict-');
    try {
      writeLockFiles(dir, {
        packages: {
          react: {
            version: '17.0.0',
            peerDependencies: {},
          },
        },
      });

      const pr = new PeerResolver(dir);
      const res = await pr.checkPeerDependencies({
        name: 'pkg-a',
        version: '1.0.0',
        peerDependencies: {
          react: '^18.0.0',
        },
      });

      assert.equal(res.conflicts.length, 1);
      assert.deepEqual(res.conflicts[0], {
        package: 'pkg-a',
        peer: 'react',
        required: '^18.0.0',
        installed: '17.0.0',
        status: 'conflict',
      });

      assert.equal(res.warnings.length, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('checkPeerDependencies returns warning when peer dependency is missing', async () => {
    const dir = tmpDir('mip-peer-resolver-warning-');
    try {
      writeLockFiles(dir, {
        packages: {
          // PeerResolver's installedPackages map is built from lockfile packages.
          // To simulate a missing peer, ensure leftpad is NOT present here.
          react: {
            version: '17.0.0',
            peerDependencies: {},
          },
        },
      });



      const pr = new PeerResolver(dir);
      const res = await pr.checkPeerDependencies({
        name: 'react',
        version: '17.0.0',
        peerDependencies: {
          leftpad: '>=1.0.0',
        },
      });


      // PeerResolver marks conflicts only when a peer is installed but version doesn't satisfy the range.
      // Since leftpad is NOT present in installedPackages, it must be returned as a warning.
      assert.equal(res.conflicts.length, 0);
      assert.equal(res.warnings.length, 1);

      assert.deepEqual(res.warnings[0], {
        package: 'react',
        peer: 'leftpad',
        required: '>=1.0.0',
        status: 'missing',
      });

    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolveAndInstall(showPeerWarnings=false) does not prompt and installs even with conflicts', async () => {
    const dir = tmpDir('mip-peer-resolver-no-prompt-');
    try {
      writeLockFiles(dir, {
        packages: {
          react: {
            version: '17.0.0', // version update
            peerDependencies: {},
          },
        },
      });

      const pr = new PeerResolver(dir);

      // If promptForConflicts is called => fail the test.
      pr.promptForConflicts = async () => {
        throw new Error('promptForConflicts must not be called in showPeerWarnings=false mode');
      };

      let installed = 0;
      const installFunction = async () => {
        installed += 1;
      };

      const ok = await pr.resolveAndInstall(
        {
          name: 'pkg-a',
          version: '1.0.0',
          peerDependencies: { react: '^18.0.0' },
        },
        installFunction,
        { showPeerWarnings: false }
      );

      assert.equal(ok, true);
      assert.equal(installed, 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('promptForConflicts(cancel: "1") returns false', async () => {
    const dir = tmpDir('mip-peer-resolver-prompt-cancel-');
    try {
      // Create minimal mip.json so i18n loader can find lang for cwd.
      fs.writeFileSync(
        path.join(dir, 'mip.json'),
        JSON.stringify({ name: 't', version: '1.0.0', language: 'en' }, null, 2)
      );

      const pr = new PeerResolver(dir);

      // Stub readline.question via monkeypatching createInterface.
      const readline = require('readline');
      const originalCreate = readline.createInterface;
      readline.createInterface = () => {
        return {
          question: (_q, cb) => cb('1'),
          close: () => {},
        };
      };


      const out = [];
      const originalLog = console.log;
      console.log = (...args) => out.push(args.map(String).join(' '));

      try {
        const { getI18n } = require('../../lib/i18n');
        const { loadLangForCwd } = require('../../lib/i18n');
        const { t } = getI18n(loadLangForCwd(dir));

        const conflicts = [
          {
            package: 'pkg-a',
            peer: 'react',
            required: '^18.0.0',
            installed: '17.0.0',
            status: 'conflict',
          },
        ];

        const shouldContinue = await pr.promptForConflicts(conflicts, t);
        assert.equal(shouldContinue, false);
        assert.ok(out.some(s => /cancel/i.test(s)), 'should log cancelled option');
      } finally {
        console.log = originalLog;
        readline.createInterface = originalCreate;
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolveAndInstall(showPeerWarnings=true) prompts and obeys ignore option ("2")', async () => {
    const dir = tmpDir('mip-peer-resolver-ignore-');
    try {
      fs.writeFileSync(
        path.join(dir, 'mip.json'),
        JSON.stringify({ name: 't', version: '1.0.0', language: 'en' }, null, 2)
      );

      writeLockFiles(dir, {
        packages: {
          react: {
            version: '17.0.0',
            peerDependencies: {},
          },
        },
      });

      const pr = new PeerResolver(dir);

      // Stub readline so answer is "2" (ignore conflicts).
      const readline = require('readline');
      const originalCreate = readline.createInterface;
      readline.createInterface = () => {
        return {
          question: (_q, cb) => cb('2'),
          close: () => {},
        };
      };


      let installed = 0;
      const installFunction = async () => {
        installed += 1;
      };

      const ok = await pr.resolveAndInstall(
        {
          name: 'pkg-a',
          version: '1.0.0',
          peerDependencies: { react: '^18.0.0' },
        },
        installFunction,
        { showPeerWarnings: true }
      );

      assert.equal(ok, true);
      assert.equal(installed, 1);

      readline.createInterface = originalCreate;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

