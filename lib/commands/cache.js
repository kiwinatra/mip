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
const os = require('os');

const { loadLangForCwd, getI18n } = require('../i18n');

function getDirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) size += getDirSize(p);
    else size += stat.size;
  }
  return size;
}

function cleanDir(dir) {
  if (!fs.existsSync(dir)) return 0;
  const size = getDirSize(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  return size;
}

async function cache(action) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  const localCache = path.join(process.cwd(), '.mip');
  const globalCache = path.join(os.homedir(), '.mip', 'packages');

  switch (action) {
    case 'clean': {
      let freed = 0;
      freed += cleanDir(localCache);
      freed += cleanDir(globalCache);
      console.log(t('commands.cache.cleaned', { mb: (freed / 1024 / 1024).toFixed(2) }));
      break;
    }

    case 'size': {
      let total = 0;
      total += getDirSize(localCache);
      total += getDirSize(globalCache);
      console.log(t('commands.cache.size', { mb: (total / 1024 / 1024).toFixed(2) }));
      break;
    }

    default:
      console.log(t('commands.cache.default_help'));
  }
}

module.exports = { cache };
