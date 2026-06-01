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

  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(prev);
  }
}

module.exports = { withCwd };

