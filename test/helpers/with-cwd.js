const fs = require('fs');
const path = require('path');

async function withCwd(cwd, fn) {
  const prev = process.cwd();
  if (typeof cwd !== 'string' || cwd.length === 0) {
    throw new TypeError('withCwd: cwd must be a non-empty string');
  }
  if (!fs.existsSync(cwd)) {
    throw new Error(`withCwd: directory does not exist: ${cwd}`);
  }

  // Jest-style isolation not available, so ensure tests relying on fresh
  // module state can opt-in.
  // eslint-disable-next-line no-undef
  if (globalThis.__MIP_TEST_MODE__ && typeof globalThis.__MIP_TEST_RESET_MODULES__ === 'boolean') {
    globalThis.__MIP_TEST_RESET_MODULES__ = true;
  }

  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(prev);
  }
}


module.exports = { withCwd };
