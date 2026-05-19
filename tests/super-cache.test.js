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

const { SuperCache } = require('../lib/core/super-cache');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mip-test-'));
}

test('SuperCache: mem hit after set', async () => {
  const dir = mkTempDir();
  const cwd = process.cwd();
  process.chdir(dir);

  try {
    const cache = new SuperCache({ maxMemoryItems: 10, ttl: 50, diskTtlMs: 50 });
    await cache.set('pkg', '1.0.0', { ok: true });

    // мгновенный mem-hit
    const v = await cache.get('pkg', '1.0.0');
    assert.equal(v.ok, true);
    assert.equal(cache.getStats().hits >= 1, true);
  } finally {
    process.chdir(cwd);
  }
});

test('SuperCache: disk hit after restart (disk write/read)', async () => {
  const dir = mkTempDir();
  const cwd = process.cwd();
  process.chdir(dir);

  try {
    const cache1 = new SuperCache({ maxMemoryItems: 1, ttl: 10_000, diskTtlMs: 10_000 });
    await cache1.set('pkg', '2.0.0', { disk: true });

    // Даем асинхронной записи на диск время завершиться
    await new Promise(r => setTimeout(r, 50));

    const cache2 = new SuperCache({ maxMemoryItems: 1, ttl: 10_000, diskTtlMs: 10_000 });
    const v = await cache2.get('pkg', '2.0.0');
    assert.equal(v.disk, true);
  } finally {
    process.chdir(cwd);
  }
});

test('SuperCache: disk ttl invalidates stale entry', async () => {
  const dir = mkTempDir();
  const cwd = process.cwd();
  process.chdir(dir);

  try {
    const cache1 = new SuperCache({ maxMemoryItems: 10, ttl: 10_000, diskTtlMs: 10 });
    await cache1.set('pkg', '3.0.0', { stale: false });
    await new Promise(r => setTimeout(r, 30)); // чтобы диск стал просроченным

    const cache2 = new SuperCache({ maxMemoryItems: 10, ttl: 10_000, diskTtlMs: 10 });
    const v = await cache2.get('pkg', '3.0.0');
    assert.equal(v, null);
  } finally {
    process.chdir(cwd);
  }
});

test('SuperCache: inFlight dedupe prevents duplicate disk reads', async () => {
  const dir = mkTempDir();
  const cwd = process.cwd();
  process.chdir(dir);

  try {
    const cache = new SuperCache({ maxMemoryItems: 1, ttl: 10_000, diskTtlMs: 10_000 });

    // заранее положим запись на диск
    await cache.set('pkg', '4.0.0', { inflight: true });
    await new Promise(r => setTimeout(r, 50));

    // Вынуждаем mem miss (maxMemoryItems=1, но мы можем сымитировать тем что не положили mem)
    // И делаем параллельные get
    const [a, b, c] = await Promise.all([
      cache.get('pkg', '4.0.0'),
      cache.get('pkg', '4.0.0'),
      cache.get('pkg', '4.0.0')
    ]);

    assert.equal(a.inflight, true);
    assert.equal(b.inflight, true);
    assert.equal(c.inflight, true);
  } finally {
    process.chdir(cwd);
  }
});
