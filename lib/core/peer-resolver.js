/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const semver = require('semver');
const fs = require('fs');
const path = require('path');
const { loadLangForCwd, getI18n } = require('../i18n');

class PeerResolver {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.lockPath = path.join(projectPath, 'mip-lock.yml');
    this.jsonLockPath = path.join(projectPath, 'mip-lock.json');
    this.installedPackages = new Map();
    this.loadInstalledPackages();
  }

  /**
   * Loads all currently installed packages from the lockfile.
   * Builds an in-memory map of package names to their versions and
   * declared peer dependencies for conflict detection.
   * 
   * Supports both YAML and JSON lockfile formats for backward compatibility.
   * 
   * @returns {void}
   */
  loadInstalledPackages() {
    const yaml = require('js-yaml');
    let lockData = null;

    if (fs.existsSync(this.lockPath)) {
      try {
        lockData = yaml.load(fs.readFileSync(this.lockPath, 'utf8'));
      } catch {}
    } else if (fs.existsSync(this.jsonLockPath)) {
      try {
        lockData = JSON.parse(fs.readFileSync(this.jsonLockPath, 'utf8'));
      } catch {}
    }

    if (!lockData) return;

    const packages = lockData.packages || {};
    for (const [fullName, info] of Object.entries(packages)) {
      const name = fullName.split('@')[0];
      this.installedPackages.set(name, {
        version: info.version,
        peerDependencies: info.peerDependencies || {},
      });
    }
  }

  /**
   * Checks peer dependencies for a package against the current installation state.
   * Returns two categories of issues:
   * - conflicts: Peer dependency is installed but version doesn't satisfy the range
   * - warnings: Peer dependency is not installed at all
   * 
   * @param {Object} pkgInfo - Package metadata with name and peerDependencies
   * @param {string|null} parentName - Parent package name (unused, reserved for future)
   * @returns {Promise<Object>} Object containing conflicts and warnings arrays
   */
  async checkPeerDependencies(pkgInfo, parentName = null) {
    const conflicts = [];
    const warnings = [];

    const peerDeps = pkgInfo.peerDependencies || {};

    for (const [peerName, peerRange] of Object.entries(peerDeps)) {
      const installed = this.installedPackages.get(peerName);

      if (!installed) {
        warnings.push({
          package: pkgInfo.name,
          peer: peerName,
          required: peerRange,
          status: 'missing',
        });
        continue;
      }

      if (!semver.satisfies(installed.version, peerRange)) {
        conflicts.push({
          package: pkgInfo.name,
          peer: peerName,
          required: peerRange,
          installed: installed.version,
          status: 'conflict',
        });
      }
    }

    return { conflicts, warnings };
  }

  /**
   * Formats peer dependency issues into a human-readable message.
   * Uses i18n system for localized output.
   * 
   * @param {Array} issues - Array of conflict or warning objects
   * @param {string} type - 'conflict' or 'warning'
   * @param {Function} t - i18n translation function
   * @returns {string} Formatted message
   */
  formatMessage(issues, type, t) {
    if (issues.length === 0) return '';

    let output = '';

    if (type === 'conflict') {
      output += `\n${t('commands.install.peer.conflict_title')}\n`;
    } else {
      output += `\n${t('commands.install.peer.warning_title')}\n`;
    }

    for (const issue of issues) {
      output += `\n${t('commands.install.peer.package', { package: issue.package })}\n`;
      output += `     ${t('commands.install.peer.requires', { peer: issue.peer, required: issue.required })}\n`;
      if (issue.installed) {
        output += `         ${t('commands.install.peer.but_installed', { version: issue.installed })}\n`;
      } else {
        output += `         ${t('commands.install.peer.not_installed')}\n`;
      }
    }

    return output;
  }

  /**
   * Prompts the user for action when peer dependency conflicts are found.
   * Options:
   * 1. Cancel the installation
   * 2. Continue despite conflicts (ignore)
   * 3. Attempt to install compatible versions (delegated to caller)
   * 
   * @param {Array} conflicts - Conflict objects from checkPeerDependencies
   * @param {Function} t - i18n translation function
   * @returns {Promise<boolean>} True if should continue, false if cancelled
   */
  async promptForConflicts(conflicts, t) {
    console.log(this.formatMessage(conflicts, 'conflict', t));
    console.log(t('commands.install.peer.options_title'));
    console.log(t('commands.install.peer.option_cancel'));
    console.log(t('commands.install.peer.option_ignore'));
    console.log(t('commands.install.peer.option_install'));

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      readline.question(t('commands.install.peer.choose'), answer => {
        readline.close();
        if (answer === '1') {
          console.log(t('commands.install.peer.cancelled'));
          resolve(false);
        } else if (answer === '2') {
          console.log(t('commands.install.peer.continuing'));
          resolve(true);
        } else {
          console.log(t('commands.install.peer.installing_warnings'));
          resolve(true);
        }
      });
    });
  }

  /**
   * Main entry point for resolving and installing a package with peer dependencies.
   * 
   * Behavior modes:
   * - showPeerWarnings = false (default): Only logs to DEBUG, installs without prompting
   * - showPeerWarnings = true: Displays warnings and prompts for conflicts
   * 
   * The default mode prioritizes automation and user experience by not blocking
   * installation on peer conflicts, which is common in large monorepos where
   * perfect peer resolution is impossible without major version upgrades.
   * 
   * @param {Object} pkgInfo - Package metadata
   * @param {Function} installFunction - Async function to perform the installation
   * @param {Object} options - Options including showPeerWarnings flag
   * @returns {Promise<boolean>} Whether installation was successful
   */
  async resolveAndInstall(pkgInfo, installFunction, options = {}) {
    const { showPeerWarnings = false } = options;
    const { t } = getI18n(loadLangForCwd(this.projectPath));

    const { conflicts, warnings } = await this.checkPeerDependencies(pkgInfo);

    if (warnings.length > 0 && showPeerWarnings) {
      console.log(this.formatMessage(warnings, 'warning', t));
    }

    if (conflicts.length > 0) {
      if (!showPeerWarnings) {
        if (process.env.DEBUG) {
          console.log(`[DEBUG] Peer conflicts for ${pkgInfo.name}: ${conflicts.length} conflicts`);
          for (const c of conflicts) {
            console.log(`  - ${c.peer}: required ${c.required}, installed ${c.installed}`);
          }
        }
        this.savePeerDependencies(pkgInfo);
        await installFunction(pkgInfo);
        return true;
      }

      const shouldContinue = await this.promptForConflicts(conflicts, t);
      if (!shouldContinue) {
        return false;
      }
    }

    await installFunction(pkgInfo);
    this.savePeerDependencies(pkgInfo);

    return true;
  }

  /**
   * Persists peer dependency information to the lockfile.
   * Saves both to YAML (primary) and JSON (backward compatibility).
   * 
   * This allows subsequent installs to remember the peer dependency state
   * without re-querying the registry.
   * 
   * @param {Object} pkgInfo - Package metadata with peerDependencies
   * @returns {void}
   */
  savePeerDependencies(pkgInfo) {
    let lockData = {};
    const yaml = require('js-yaml');

    if (fs.existsSync(this.lockPath)) {
      try {
        lockData = yaml.load(fs.readFileSync(this.lockPath, 'utf8'));
      } catch {}
    } else if (fs.existsSync(this.jsonLockPath)) {
      try {
        lockData = JSON.parse(fs.readFileSync(this.jsonLockPath, 'utf8'));
      } catch {}
    }

    if (!lockData.packages) lockData.packages = {};

    const key = `${pkgInfo.name}@${pkgInfo.version}`;
    if (!lockData.packages[key]) {
      lockData.packages[key] = {};
    }

    lockData.packages[key].peerDependencies = pkgInfo.peerDependencies || {};
    lockData.packages[key].version = pkgInfo.version;

    fs.writeFileSync(this.lockPath, yaml.dump(lockData, { indent: 2 }));

    if (fs.existsSync(this.jsonLockPath)) {
      fs.writeFileSync(this.jsonLockPath, JSON.stringify(lockData, null, 2));
    }
  }
}

module.exports = { PeerResolver };