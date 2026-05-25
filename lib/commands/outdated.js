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
const { getPackageInfo } = require('../utils/registry');

async function outdated() {
  // added --json tag, no one asked btw <333
  const isJson = process.argv.includes('--json');

  const pkgPath = path.join(process.cwd(), 'mip.json');

  if (!fs.existsSync(pkgPath)) {
    console.log('❌ No mip.json found');
    return;
  }

  const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...config.dependencies, ...config.devDependencies };

  if (Object.keys(deps).length === 0) {
    console.log('✨ No dependencies found');
    return;
  }

  if (!isJson) {
    console.log('🔍 Checking for outdated packages...\n');
    console.log('┌─────────────────────┬──────────────┬──────────────┐');
    console.log('│ Package             │ Current      │ Latest       │');
    console.log('├─────────────────────┼──────────────┼──────────────┤');
  }

  let outdatedCount = 0;
  const results = [];

  for (const [name, currentVersion] of Object.entries(deps)) {
    try {
      const pkgInfo = await getPackageInfo(name, 'latest');
      const latestVersion = pkgInfo.version;
      const isOutdated = latestVersion !== currentVersion;

      if (isOutdated) outdatedCount++;

      results.push({
        name,
        current: currentVersion,
        latest: latestVersion,
        outdated: isOutdated
      });

    } catch (err) {
      results.push({
        name,
        current: currentVersion,
        latest: 'ERROR',
        outdated: false
      });
    }
  }

  if (isJson) {
    const payload = {
      packages: results.map(({ name, current, latest, outdated }) => ({
        name,
        current,
        latest,
        outdated
      }))
    };

    // Output ONLY JSON for CI/CD
    console.log(JSON.stringify(payload));

    if (outdatedCount > 0) {
      process.exitCode = 1;
    }

    return;
  }

  results.forEach(({ name, current, latest, outdated }) => {
    const status = outdated ? '⚠️' : '✅';
    const namePadded = name.padEnd(21, ' ');
    const currentPadded = current.padEnd(14, ' ');
    const latestPadded = latest.padEnd(14, ' ');

    if (outdated) {
      console.log(`│ ${status} ${namePadded}│ ${currentPadded}│ ${latest}     │`);
    }
  });

  console.log('└─────────────────────┴──────────────┴──────────────┘');
  console.log(`\n📊 ${outdatedCount} package(s) outdated out of ${Object.keys(deps).length}`);

  if (outdatedCount > 0) {
    console.log('\n💡 Run "mip update" to update all packages');
    console.log('💡 Run "mip update --latest" to update to latest versions');
  }
}

module.exports = { outdated };

