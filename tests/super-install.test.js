/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { SuperInstaller } = require('../lib/commands/super-install');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mip-test-super-install-'));
}

// В этом тесте мы не делаем реальные network/tar.
// Вместо этого подменяем resolver/downloader/StreamExtractor на предсказуемые заглушки.
test('SuperInstaller: bounded parallel extraction (no sequential bottleneck)', async () => {
  const dir = mkTempDir();
  const cwd = process.cwd();
  process.chdir(dir);

  try {
    // mock StreamExtractor
    const StreamExtractor = require('../lib/utils/stream-extract');

    let inFlight = 0;
    let maxInFlight = 0;

    const originalExtractToDir = StreamExtractor.extractToDir;

    StreamExtractor.extractToDir = async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      // имитируем работу
      await new Promise(r => setTimeout(r, 30));
      inFlight--;
      return 30;
    };

    // mock resolver/downloader
    const installer = new SuperInstaller();

    installer.resolver.resolveTree = async () => ([
      { name: 'p1', version: '1.0.0', tarball: 'x', dependencies: {} },
      { name: 'p2', version: '1.0.0', tarball: 'x', dependencies: {} },
      { name: 'p3', version: '1.0.0', tarball: 'x', dependencies: {} },
      { name: 'p4', version: '1.0.0', tarball: 'x', dependencies: {} },
    ]);

    installer.downloader.downloadPackages = async (resolvedTree) => {
      return resolvedTree.map((p) => ({
        name: p.name,
        version: p.version,
        tarball: p.tarball,
        data: Buffer.from('fake'),
        size: 4,
        time: 1
      }));
    };

    // run
    await installer.install({ root: '^1.0.0' }, { maxExtractWorkers: 2 });

    assert.ok(maxInFlight > 1, `Expected parallel extraction, maxInFlight=${maxInFlight}`);

    // check symlinks exist
    for (const pkg of ['p1', 'p2', 'p3', 'p4']) {
      const linkPath = path.join(dir, 'node_modules', pkg);
      assert.ok(fs.existsSync(linkPath), `Expected junction for ${pkg}`);
    }

    // restore
    StreamExtractor.extractToDir = originalExtractToDir;
  } finally {
    process.chdir(cwd);
  }
});
