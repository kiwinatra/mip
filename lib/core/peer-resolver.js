/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
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

  async resolveAndInstall(pkgInfo, installFunction, options = {}) {
    const { showPeerWarnings = false } = options;
    const { t } = getI18n(loadLangForCwd(this.projectPath));

    const { conflicts, warnings } = await this.checkPeerDependencies(pkgInfo);

    // По умолчанию — просто логируем в debug, но не показываем
    if (warnings.length > 0 && showPeerWarnings) {
      console.log(this.formatMessage(warnings, 'warning', t));
    }

    if (conflicts.length > 0) {
      // По умолчанию — скипаем и продолжаем
      if (!showPeerWarnings) {
        // Просто логируем в debug
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

      // Если включены предупреждения — показываем и спрашиваем
      const shouldContinue = await this.promptForConflicts(conflicts, t);
      if (!shouldContinue) {
        return false;
      }
    }

    await installFunction(pkgInfo);
    this.savePeerDependencies(pkgInfo);

    return true;
  }

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