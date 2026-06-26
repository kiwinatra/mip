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
const { execSync } = require('child_process');

class WorkspaceManager {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.configPath = path.join(rootPath, 'mip.json');
    this.workspaces = [];
    this.load();
  }

  load() {
    if (fs.existsSync(this.configPath)) {
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      this.workspaces = config.workspaces || [];
    }
  }

  findWorkspaces() {
    const found = [];

    for (const pattern of this.workspaces) {
      if (pattern.includes('*')) {
        const baseDir = pattern.split('*')[0];
        if (fs.existsSync(baseDir)) {
          const dirs = fs.readdirSync(baseDir);
          for (const dir of dirs) {
            const fullPath = path.join(baseDir, dir);
            const pkgPath = path.join(fullPath, 'mip.json');
            if (fs.existsSync(pkgPath)) {
              found.push(fullPath);
            }
          }
        }
      } else {
        const fullPath = path.join(this.rootPath, pattern);
        if (fs.existsSync(fullPath) && fs.existsSync(path.join(fullPath, 'mip.json'))) {
          found.push(fullPath);
        }
      }
    }

    return found;
  }

  async runInAllWorkspaces(command, scriptName = null) {
    const workspaces = this.findWorkspaces();

    for (const ws of workspaces) {
      const pkg = JSON.parse(fs.readFileSync(path.join(ws, 'mip.json'), 'utf8'));
      console.log(`\n📦 ${pkg.name}:`);

      try {
        if (command === 'run' && scriptName) {
          const script = pkg.scripts?.[scriptName];
          if (script) {
            execSync(`cd "${ws}" && mip run ${scriptName}`, { stdio: 'inherit' });
          } else {
            console.log(`  ⚠️ No script "${scriptName}"`);
          }
        } else if (command === 'install') {
          execSync(`cd "${ws}" && mip install`, { stdio: 'inherit' });
        } else if (command === 'exec') {
          execSync(`cd "${ws}" && ${scriptName}`, { stdio: 'inherit' });
        }
      } catch (err) {
        console.log(`  ❌ Failed: ${err.message}`);
      }
    }
  }

  linkWorkspaces() {
    const workspaces = this.findWorkspaces();
    const modulesDir = path.join(this.rootPath, 'node_modules');
    fs.mkdirSync(modulesDir, { recursive: true });

    for (const ws of workspaces) {
      const pkg = JSON.parse(fs.readFileSync(path.join(ws, 'mip.json'), 'utf8'));
      const linkPath = path.join(modulesDir, pkg.name);

      if (fs.existsSync(linkPath)) {
        fs.rmSync(linkPath, { recursive: true, force: true });
      }

      fs.symlinkSync(ws, linkPath, 'junction');
      console.log(`  🔗 ${pkg.name} -> ${path.relative(this.rootPath, ws)}`);
    }
  }
}

module.exports = { WorkspaceManager };
