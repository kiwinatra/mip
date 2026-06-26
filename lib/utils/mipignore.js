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
const ignore = require('ignore');

function loadMipIgnore(projectPath) {
  const ignorePath = path.join(projectPath, '.mipignore');
  const ig = ignore();

  if (fs.existsSync(ignorePath)) {
    const content = fs.readFileSync(ignorePath, 'utf8');
    ig.add(content);
  }

  // Default ignores
  ig.add(['node_modules/', '.mip/cache/', '.git/', '*.log']);

  return ig;
}

function shouldIgnore(projectPath, filePath) {
  const ig = loadMipIgnore(projectPath);
  return ig.ignores(filePath);
}

module.exports = { loadMipIgnore, shouldIgnore };
