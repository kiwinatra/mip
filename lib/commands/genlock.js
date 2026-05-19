const fs = require('fs');
const path = require('path');
const { getPackageInfo } = require('../utils/registry');
const { loadLangForCwd, getI18n } = require('../i18n');

async function genlock() {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const pkgPath = path.join(process.cwd(), 'mip.json');
  const lockPath = path.join(process.cwd(), 'mip-lock.json');
  
  if (!fs.existsSync(pkgPath)) {
    console.log(t('commands.genlock.no_mip_json'));
    return;
  }
  
  console.log(t('commands.genlock.generating'));
  
  const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...config.dependencies, ...config.devDependencies };
  const packages = Object.entries(deps);
  
  if (packages.length === 0) {
    console.log(t('commands.genlock.no_deps'));
    return;
  }
  
  const lockData = {
    version: '1.0.0',
    packages: {},
    generatedAt: new Date().toISOString()
  };
  
  let generated = 0;
  const total = packages.length;
  
  for (const [name, versionRange] of packages) {
    try {
      process.stdout.write(`\r  ${t('commands.genlock.progress')} ${generated + 1}/${total}`);
      
      const pkgInfo = await getPackageInfo(name, versionRange);
      const mipPath = path.join('.mip', name, pkgInfo.version);
      
      lockData.packages[`${name}@${pkgInfo.version}`] = {
        version: pkgInfo.version,
        resolved: pkgInfo.tarball,
        dependencies: pkgInfo.dependencies || {},
        peerDependencies: pkgInfo.peerDependencies || {},
        installPath: mipPath
      };
      
      generated++;
      
    } catch (err) {
      console.log(`\n  ${t('commands.genlock.failed', { name, message: err.message })}`);
    }
  }
  
  console.log('');
  
  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  console.log(t('commands.genlock.complete', { count: generated }));
}

module.exports = { genlock };