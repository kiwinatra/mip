/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
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

  /**
   * Loads workspace configuration from mip.json.
   * Workspaces are defined as an array of glob patterns or directory paths.
   * 
   * @returns {void}
   */
  load() {
    if (fs.existsSync(this.configPath)) {
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      this.workspaces = config.workspaces || [];
    }
  }

  /**
   * Resolves workspace patterns to actual directory paths.
   * Supports simple glob patterns with '*' for directory matching.
   * 
   * Example patterns:
   * - 'packages/*' - matches all subdirectories in packages/
   * - 'apps/admin' - matches a specific directory
   * 
   * Each resolved path must contain a mip.json file to be considered a workspace.
   * 
   * @returns {Array<string>} Array of absolute workspace paths
   */
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

  /**
   * Executes a command across all workspaces.
   * Supports three command types:
   * - 'run': runs a script from each workspace's package.json
   * - 'install': runs mip install in each workspace
   * - 'exec': runs an arbitrary shell command in each workspace
   * 
   * Commands are executed sequentially to avoid race conditions with shared resources.
   * 
   * @param {string} command - 'run', 'install', or 'exec'
   * @param {string|null} scriptName - Script name (for 'run') or shell command (for 'exec')
   * @returns {Promise<void>}
   */
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

  /**
   * Creates symlinks from the root node_modules to each workspace.
   * This enables packages in one workspace to require packages from another
   * workspace without publishing them to the registry.
   * 
   * Uses junction symlinks on Windows for cross-platform compatibility.
   * 
   * @returns {void}
   */
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