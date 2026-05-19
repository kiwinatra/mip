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

const { ParallelDownloader } = require('../lib/core/parallel-download');

test('ParallelDownloader: uses http2Agent when provided', async () => {
  let called = 0;

  const http2Agent = {
    download: async (url) => {
      called++;
      return { data: Buffer.from('hello'), duration: 1 };
    }
  };

  const dl = new ParallelDownloader(2, http2Agent);

  const out = await dl.downloadPackages([
    { name: 'a', version: '1.0.0', tarball: 'https://example.com/a.tgz' }
  ]);

  assert.equal(called, 1);
  assert.equal(out[0].name, 'a');
  assert.equal(out[0].size, 5);
});

test('ParallelDownloader: falls back to axios when http2 fails', async () => {
  // Мокаем axios через require cache-override на время теста
  const Module = require('module');
  const originalLoad = Module._load;

  const axiosMock = {
    get: async () => {
      return { data: Buffer.from('fallback') };
    }
  };

  Module._load = function (request, parent, isMain) {
    if (request === 'axios') return axiosMock;
    return originalLoad.apply(this, arguments);
  };

  try {
    let called = 0;
    const http2Agent = {
      download: async () => {
        called++;
        throw new Error('http2 error');
      }
    };

    const dl = new ParallelDownloader(2, http2Agent);

    const out = await dl.downloadPackages([
      { name: 'b', version: '1.0.0', tarball: 'https://example.com/b.tgz' }
    ]);

    assert.equal(called, 1);
    assert.equal(out[0].name, 'b');
    assert.equal(out[0].size, 'fallback'.length);
  } finally {
    Module._load = originalLoad;
  }
});
