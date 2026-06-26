/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const { loadLangForCwd, getI18n } = require('../i18n');
const config = require('../utils/config');

async function audit(options = {}) {
  const { fix = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  console.log(t('commands.audit.running'));

  // Проверяем lock-файлы (YAML приоритет)
  const yamlLockPath = path.join(process.cwd(), 'mip-lock.yml');
  const jsonLockPath = path.join(process.cwd(), 'mip-lock.json');
  let lockData = null;
  let lockPath = null;

  if (fs.existsSync(yamlLockPath)) {
    lockPath = yamlLockPath;
    try {
      lockData = yaml.load(fs.readFileSync(lockPath, 'utf8'));
    } catch (err) {
      console.log(t('commands.audit.lock_corrupted', { path: lockPath }));
      return;
    }
  } else if (fs.existsSync(jsonLockPath)) {
    lockPath = jsonLockPath;
    try {
      lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch (err) {
      console.log(t('commands.audit.lock_corrupted', { path: lockPath }));
      return;
    }
  }

  if (!lockData) {
    console.log(t('commands.audit.lock_not_found'));
    return;
  }

  const packages = Object.entries(lockData.packages || {});

  if (packages.length === 0) {
    console.log(t('commands.audit.no_packages'));
    return;
  }

  console.log(t('commands.audit.scanning', { count: packages.length }));

  const vulnerabilities = [];
  const fixable = [];

  for (const [fullName, info] of packages) {
    const name = fullName.split('@')[0];

    try {
      const response = await axios.get(
        `https://registry.npmjs.org/-/npm/v1/security/advisories?package=${name}`,
        { timeout: 5000, validateStatus: () => true }
      );

      const advisories = response.data?.objects || [];

      for (const adv of advisories) {
        if (semver.satisfies(info.version, adv.vulnerable_versions)) {
          const vuln = {
            package: fullName,
            name: name,
            version: info.version,
            severity: adv.severity || 'moderate',
            title: adv.title,
            url: adv.url,
            cvss_score: adv.cvss?.score || 0,
            vulnerable_versions: adv.vulnerable_versions,
            patched_versions: adv.patched_versions,
          };
          vulnerabilities.push(vuln);

          if (fix && adv.patched_versions) {
            const fixedVersion = findFixableVersion(info.version, adv.patched_versions);
            if (fixedVersion && fixedVersion !== info.version) {
              fixable.push({
                name: name,
                currentVersion: info.version,
                fixedVersion: fixedVersion,
                severity: vuln.severity,
              });
            }
          }
        }
      }
    } catch (err) {
      console.log('ERR_NO_CONNECTION \n');
    }
  }

  if (vulnerabilities.length === 0) {
    console.log(t('commands.audit.no_vulnerabilities'));
    return;
  }

  vulnerabilities.sort((a, b) => b.cvss_score - a.cvss_score);

  const critical = vulnerabilities.filter(v => v.severity === 'critical');
  const high = vulnerabilities.filter(v => v.severity === 'high');
  const moderate = vulnerabilities.filter(v => v.severity === 'moderate');
  const low = vulnerabilities.filter(v => v.severity === 'low');

  console.log(t('commands.audit.found_title'));

  [...critical, ...high, ...moderate, ...low].forEach(v => {
    const icon =
      {
        critical: '🔴',
        high: '🟠',
        moderate: '🟡',
        low: '🔵',
      }[v.severity] || '⚪';

    console.log(`${icon} ${v.package} (${v.severity})`);
    console.log(`   ${v.title}`);
    console.log(`   CVSS: ${v.cvss_score}`);
    console.log(`   Fix: ${v.patched_versions || 'Update manually'}`);
    console.log(`   ${v.url}\n`);
  });

  console.log(t('commands.audit.summary'));
  console.log(`   🔴 Critical: ${critical.length}`);
  console.log(`   🟠 High: ${high.length}`);
  console.log(`   🟡 Moderate: ${moderate.length}`);
  console.log(`   🔵 Low: ${low.length}`);

  if (fix && fixable.length > 0) {
    console.log(t('commands.audit.fixing'));

    for (const pkg of fixable) {
      console.log(
        t('commands.audit.updating', {
          name: pkg.name,
          from: pkg.currentVersion,
          to: pkg.fixedVersion,
        })
      );

      try {
        execSync(`mip install ${pkg.name}@${pkg.fixedVersion}`, {
          stdio: 'pipe',
        });

        // Обновляем конфиг (mip.yml, mip.json или package.json)
        const conf = config.readConfig(process.cwd());
        if (conf) {
          if (!conf.dependencies) conf.dependencies = {};
          if (!conf.devDependencies) conf.devDependencies = {};

          if (conf.dependencies[pkg.name] !== undefined) {
            conf.dependencies[pkg.name] = pkg.fixedVersion;
          } else if (conf.devDependencies[pkg.name] !== undefined) {
            conf.devDependencies[pkg.name] = pkg.fixedVersion;
          } else {
            conf.dependencies[pkg.name] = pkg.fixedVersion;
          }

          config.writeConfig(conf, process.cwd());
        }

        console.log(t('commands.audit.updated', { name: pkg.name }));
      } catch (err) {
        console.log(t('commands.audit.update_failed', { name: pkg.name, message: err.message }));
      }
    }

    console.log(t('commands.audit.fix_complete'));
    console.log(t('commands.audit.rerun'));
  } else if (fix && fixable.length === 0 && vulnerabilities.length > 0) {
    console.log(t('commands.audit.no_auto_fix'));
  } else if (vulnerabilities.length > 0) {
    console.log(t('commands.audit.fix_hint'));
  }
}

function findFixableVersion(currentVersion, patchedVersions) {
  const patchedList = patchedVersions.split(' ').filter(v => v.trim());

  for (const patched of patchedList) {
    if (semver.valid(patched) && semver.gt(patched, currentVersion)) {
      const parsed = semver.parse(patched);
      const current = semver.parse(currentVersion);

      if (parsed && current && parsed.major === current.major) {
        return patched;
      }
    }
  }

  return null;
}

module.exports = { audit };