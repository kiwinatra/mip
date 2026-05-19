const axios = require('axios');
const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { execSync } = require('child_process');
const { loadLangForCwd, getI18n } = require('../i18n');

async function audit(options = {}) {
  const { fix = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  console.log(t('commands.audit.running'));

  const lockPath = path.join(process.cwd(), 'mip-lock.json');
  if (!fs.existsSync(lockPath)) {
    console.log(t('commands.audit.lock_not_found'));
    return;
  }

  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
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
            patched_versions: adv.patched_versions
          };
          vulnerabilities.push(vuln);
          
          // Проверяем, можно ли автоматически починить
          if (fix && adv.patched_versions) {
            const fixedVersion = findFixableVersion(info.version, adv.patched_versions);
            if (fixedVersion && fixedVersion !== info.version) {
              fixable.push({
                name: name,
                currentVersion: info.version,
                fixedVersion: fixedVersion,
                severity: vuln.severity
              });
            }
          }
        }
      }
    } catch (err) {
      // Silent fail for network issues
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
    const icon = {
      'critical': '🔴',
      'high': '🟠',
      'moderate': '🟡',
      'low': '🔵'
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
      console.log(t('commands.audit.updating', { 
        name: pkg.name, 
        from: pkg.currentVersion, 
        to: pkg.fixedVersion 
      }));
      
      try {
        execSync(`mip install ${pkg.name}@${pkg.fixedVersion}`, { 
          stdio: 'pipe' 
        });
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
      
      // Только если major версия не изменилась
      if (parsed && current && parsed.major === current.major) {
        return patched;
      }
    }
  }
  
  return null;
}

module.exports = { audit };