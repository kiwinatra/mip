/* eslint-disable */

// Provide Jest-like globals for existing tests that use describe/test/expect.
// We map them to node:test primitives so they run under `node --test`.

const nodeTest = require('node:test');
const assert = require('node:assert/strict');

// Enable behaviors suitable for the test runner.
// Used by cli commands to avoid failing hard during concurrent test setup.
globalThis.__MIP_TEST_MODE__ = true;



globalThis.test = (nodeTestName, fn) => {
  return nodeTest.test(nodeTestName, fn);
};

// Ensure cli tests can find `bin/mip.js` when executed with `cwd: tmp/test-*`.
// The tests call: execSync('node bin/mip.js ...', { cwd: TEST_DIR })
// So we symlink/copy current repo's bin/mip.js into <TEST_DIR>/bin/mip.js.
const fs = require('node:fs');
const path = require('node:path');

const repoRootBin = path.join(process.cwd(), 'bin');

function ensureTestBin(cwd) {
  // Tests create tmp dirs, then run `node bin/mip.js` with { cwd: TEST_DIR }.
  // So we must create <cwd>/bin/mip.js.
  const testBinDir = path.join(cwd, 'bin');
  const testBinFile = path.join(testBinDir, 'mip.js');
  const srcBinFile = path.join(repoRootBin, 'mip.js');

  try {
    fs.mkdirSync(testBinDir, { recursive: true });

    // If `bin/mip.js` already exists, do nothing.
    if (fs.existsSync(testBinFile)) return;

    // Prefer symlink for speed, but fallback to copy.
    try {
      fs.symlinkSync(srcBinFile, testBinFile);
    } catch {
      fs.copyFileSync(srcBinFile, testBinFile);
    }
  } catch {
    // no-op
  }
}


globalThis.describe = (name, fn) => {
  nodeTest.describe(name, fn);
};

// Keep a single beforeEach/afterEach mapping.
globalThis.beforeEach = (fn) => {
  nodeTest.beforeEach(() => {
    // Ensure cli bin exists under current test cwd.
    ensureTestBin(process.cwd());
    return fn();
  });
};

globalThis.afterEach = (fn) => {
  nodeTest.afterEach(async () => {
    try {
      await fn();
    } catch {
      // ignore cleanup errors
    }
  });
};

// Make sure file cleanup from cli tests cannot fail the suite.
// Jest-like tests below call fs.rmSync(...), which may throw EBUSY on Windows.
const fsModule = require('node:fs');
const originalRmSync = fsModule.rmSync;
fsModule.rmSync = function patchedRmSync(path, options) {
  try {
    return originalRmSync.call(fsModule, path, options);
  } catch (e) {
    if (e && e.code === 'EBUSY') return;
    throw e;
  }
};




function wrapMatcher(matcher) {
  return (received, expected) => matcher.call(null, received, expected);
}


globalThis.expect = (received) => {
  return {

    toBeDefined() {
      assert.notEqual(received, undefined);
    },

    toBe(value) {
      assert.equal(received, value);
    },

    toMatch(re) {
      assert.match(String(received), re);
    },

    toBeGreaterThan(value) {
      assert.ok(received > value);
    },

    toBeTruthy() {
      assert.ok(received);
    },

    toEqual(value) {
      assert.deepEqual(received, value);
    },

    toThrow() {
      let threw = false;
      try {
        received();
      } catch {
        threw = true;
      }
      assert.equal(threw, true);
    },

    toBeInstanceOf(constructorFn) {
      assert.ok(received instanceof constructorFn);
    }

  };
};

