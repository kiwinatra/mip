const fs = require('fs');
const path = require('path');
const { removeDependency } = require('../utils/deps');

const { loadLangForCwd, getI18n } = require('../i18n');

function uninstall(packageName, options = {}) {
  const { noSave = false } = options;
  const cwd = process.cwd();
  const pkgPath = path.join(cwd, 'mip.json');
  const { t } = getI18n(loadLangForCwd(cwd));

  if (!fs.existsSync(pkgPath)) {
    console.log(t('commands.uninstall.no_mip_json'));
    return;
  }

  const mipDir = path.join(cwd, '.mip');
  let removedCount = 0;
  
  if (fs.existsSync(mipDir)) {
    const packageDir = path.join(mipDir, packageName);
    if (fs.existsSync(packageDir)) {
      const versions = fs.readdirSync(packageDir);
      for (const version of versions) {
        const versionPath = path.join(packageDir, version);
        if (fs.statSync(versionPath).isDirectory()) {
          fs.rmSync(versionPath, { recursive: true, force: true });
          removedCount++;
          console.log(t('commands.uninstall.removed_version', { package: packageName, version }));
        }
      }
      
      if (fs.readdirSync(packageDir).length === 0) {
        fs.rmdirSync(packageDir);
      }
    }
  }

  const lockPath = path.join(cwd, 'mip-lock.json');
  if (fs.existsSync(lockPath)) {
    const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (lockData.packages) {
      for (const [pkgKey, info] of Object.entries(lockData.packages)) {
        if (pkgKey.startsWith(`${packageName}@`)) {
          delete lockData.packages[pkgKey];
          console.log(t('commands.uninstall.removed_from_lockfile', { package: pkgKey }));
        }
      }
      fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
    }
  }

  if (!noSave) {
    removeDependency(packageName);
  }

  if (removedCount > 0) {
    console.log(t('commands.uninstall.removed', { 
      package: packageName,
      versions: removedCount 
    }));
  } else {
    console.log(t('commands.uninstall.not_found', { package: packageName }));
  }
}

module.exports = { uninstall };