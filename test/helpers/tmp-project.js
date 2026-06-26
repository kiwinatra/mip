const fs = require('fs');
const os = require('os');
const path = require('path');

function createTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanupDir(dirPath) {
  // fs.rmSync exists on Node 14+
  fs.rmSync(dirPath, { recursive: true, force: true });
}

module.exports = {
  createTmpDir,
  writeJson,
  ensureDir,
  cleanupDir,
};
