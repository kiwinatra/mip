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

// ==========================================
// ЦВЕТА ДЛЯ АУДИТА
// ==========================================

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function getSeverityIcon(severity) {
  const icons = {
    critical: '🔴',
    high: '🟠',
    moderate: '🟡',
    low: '🔵',
  };
  return icons[severity] || '⚪';
}

function getSeverityColor(severity) {
  const colors = {
    critical: 'red',
    high: 'yellow',
    moderate: 'blue',
    low: 'green',
  };
  return colors[severity] || 'gray';
}

async function audit(options = {}) {
  const { fix = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  // Проверяем флаг --output
  const outputArgIndex = process.argv.indexOf('--output');
  let outputFile = null;
  if (outputArgIndex !== -1) {
    outputFile = process.argv[outputArgIndex + 1];
  }

  // Проверяем флаг --json
  const isJson = process.argv.includes('--json');

  console.log(colorize('🔍 Running security audit...', 'bold'));

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

  // ==========================================
  // ФОРМИРУЕМ РЕЗУЛЬТАТ
  // ==========================================

  const result = {
    timestamp: new Date().toISOString(),
    summary: {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      moderate: vulnerabilities.filter(v => v.severity === 'moderate').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
    },
    vulnerabilities: vulnerabilities,
    fixable: fixable,
  };

  // ==========================================
  // ВЫВОД В ФАЙЛ (если указан --output)
  // ==========================================

  if (outputFile) {
    try {
      const outputPath = path.isAbsolute(outputFile)
        ? outputFile
        : path.join(process.cwd(), outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(colorize(`📄 Report saved to: ${outputPath}`, 'green'));
    } catch (err) {
      console.log(colorize(`❌ Failed to save report: ${err.message}`, 'red'));
    }
  }

  // ==========================================
  // ВЫВОД В КОНСОЛЬ (JSON или цветной)
  // ==========================================

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (vulnerabilities.length === 0) {
    console.log(colorize('✅ No vulnerabilities found', 'green'));
    return;
  }

  vulnerabilities.sort((a, b) => b.cvss_score - a.cvss_score);

  const critical = vulnerabilities.filter(v => v.severity === 'critical');
  const high = vulnerabilities.filter(v => v.severity === 'high');
  const moderate = vulnerabilities.filter(v => v.severity === 'moderate');
  const low = vulnerabilities.filter(v => v.severity === 'low');

  console.log(colorize('\n📋 Vulnerabilities found:', 'bold'));

  [...critical, ...high, ...moderate, ...low].forEach(v => {
    const icon = getSeverityIcon(v.severity);
    const color = getSeverityColor(v.severity);
    const severityLabel = v.severity.toUpperCase();

    console.log(colorize(`\n${icon} ${v.package}`, color));
    console.log(`   ${colorize('Severity:', 'bold')} ${colorize(severityLabel, color)}`);
    console.log(`   ${colorize('Title:', 'bold')} ${v.title}`);
    console.log(`   ${colorize('CVSS:', 'bold')} ${v.cvss_score}`);
    console.log(
      `   ${colorize('Fix:', 'bold')} ${v.patched_versions || colorize('Update manually', 'yellow')}`
    );
    console.log(`   ${colorize('URL:', 'bold')} ${v.url}`);
  });

  console.log(colorize('\n📊 Summary:', 'bold'));
  console.log(`   ${colorize('🔴 Critical:', 'red')} ${critical.length}`);
  console.log(`   ${colorize('🟠 High:', 'yellow')} ${high.length}`);
  console.log(`   ${colorize('🟡 Moderate:', 'blue')} ${moderate.length}`);
  console.log(`   ${colorize('🔵 Low:', 'green')} ${low.length}`);

  if (outputFile) {
    console.log(colorize(`\n📄 Report saved to: ${outputFile}`, 'green'));
  }

  if (fix && fixable.length > 0) {
    console.log(colorize('\n🔧 Fixing vulnerabilities...', 'bold'));

    for (const pkg of fixable) {
      console.log(
        colorize(
          `  Updating ${pkg.name}: ${pkg.currentVersion} → ${pkg.fixedVersion}`,
          'yellow'
        )
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

        console.log(colorize(`  ✅ ${pkg.name} updated`, 'green'));
      } catch (err) {
        console.log(colorize(`  ❌ Failed to update ${pkg.name}: ${err.message}`, 'red'));
      }
    }

    console.log(colorize('\n✅ Fix complete', 'green'));
    console.log(colorize('🔄 Run mip audit again to verify', 'gray'));
  } else if (fix && fixable.length === 0 && vulnerabilities.length > 0) {
    console.log(colorize('\n⚠️ No packages can be auto-fixed', 'yellow'));
  } else if (vulnerabilities.length > 0) {
    console.log(colorize('\n💡 Run mip audit --fix to automatically update', 'yellow'));
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