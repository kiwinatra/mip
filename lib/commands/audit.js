const axios = require('axios');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

async function audit() {
  console.log('🔒 Security audit...\n');

  const lockPath = path.join(process.cwd(), 'mip-lock.json');
  if (!fs.existsSync(lockPath)) {
    console.log('❌ Run "mip install" first');
    return;
  }

  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const packages = Object.entries(lockData.packages || {});
  
  if (packages.length === 0) {
    console.log('No packages to audit');
    return;
  }

  console.log(`📦 Scanning ${packages.length} packages...\n`);
  
  const vulnerabilities = [];
  
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
          vulnerabilities.push({
            package: fullName,
            version: info.version,
            severity: adv.severity || 'moderate',
            title: adv.title,
            url: adv.url,
            cvss_score: adv.cvss?.score || 0
          });
        }
      }
    } catch (err) {
      // Silent fail for network issues
    }
  }
  
  if (vulnerabilities.length === 0) {
    console.log('✅ No vulnerabilities found!');
    return;
  }
  
  vulnerabilities.sort((a, b) => b.cvss_score - a.cvss_score);
  
  const critical = vulnerabilities.filter(v => v.severity === 'critical');
  const high = vulnerabilities.filter(v => v.severity === 'high');
  const moderate = vulnerabilities.filter(v => v.severity === 'moderate');
  const low = vulnerabilities.filter(v => v.severity === 'low');
  
  console.log('⚠️  Vulnerabilities found:\n');
  
  [...critical, ...high, ...moderate, ...low].forEach(v => {
    const icon = {
      'critical': '🔴',
      'high': '🟠',
      'moderate': '🟡',
      'low': '🔵'
    }[v.severity] || '⚪';
    
    console.log(`${icon} ${v.package}@${v.version} (${v.severity})`);
    console.log(`   ${v.title}`);
    console.log(`   CVSS: ${v.cvss_score}`);
    console.log(`   ${v.url}\n`);
  });
  
  console.log(`📊 Summary:`);
  console.log(`   🔴 Critical: ${critical.length}`);
  console.log(`   🟠 High: ${high.length}`);
  console.log(`   🟡 Moderate: ${moderate.length}`);
  console.log(`   🔵 Low: ${low.length}`);
  console.log(`\n💡 Run "mip update" to fix vulnerabilities`);
}

module.exports = { audit };