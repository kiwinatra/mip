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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function sha256Hex(buffer) {
  const h = crypto.createHash('sha256');
  h.update(buffer);
  return h.digest('hex');
}

function createJsonlWriter(logFilePath) {
  const dir = path.dirname(logFilePath);
  fs.mkdirSync(dir, { recursive: true });

  return {
    log(obj) {
      try {
        fs.appendFileSync(logFilePath, JSON.stringify({ ts: Date.now(), ...obj }) + '\n', 'utf8');
      } catch {
        // ignore
      }
    },
    flush() {}
  };
}

module.exports = { formatBytes, sha256Hex, createJsonlWriter };

