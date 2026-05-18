const fs = require('fs');
const path = require('path');

const { loadLangForCwd, getI18n } = require('../i18n');

async function why(packageName) {
  const cwd = process.cwd();
  const { t } = getI18n(loadLangForCwd(cwd));

  if (!packageName) {
    console.log(t('commands.why.usage'));
    return;
  }

  const lockPath = path.join(cwd, 'mip-lock.json');
  if (!fs.existsSync(lockPath)) {
    console.log(t('commands.why.install_first'));
    return;
  }

  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const dependents = [];

  // Ищем кто зависит от этого пакета
  for (const [fullName, info] of Object.entries(lockData.packages || {})) {
    if (info.dependencies && info.dependencies[packageName]) {
      dependents.push({
        name: fullName,
        version: info.version,
        requiredVersion: info.dependencies[packageName]
      });
    }
  }

  // Находим сам пакет
  let pkgInfo = null;
  for (const [fullName, info] of Object.entries(lockData.packages || {})) {
    if (fullName.startsWith(packageName + '@')) {
      pkgInfo = { fullName, ...info };
      break;
    }
  }

  if (!pkgInfo && dependents.length === 0) {
    console.log(t('commands.why.not_found', { package: packageName }));
    return;
  }

  console.log(t('commands.why.title', { package: packageName }));

  if (pkgInfo) {
    console.log(`  ${t('commands.why.version', { version: pkgInfo.version }).trim()}`);
    console.log(`  ${t('commands.why.resolved', { resolved: pkgInfo.resolved }).trim()}\n`);
  }

  if (dependents.length > 0) {
    console.log(`  ${t('commands.why.required_by').trim()}\n`);
    dependents.forEach(dep => {
      console.log(`    └── ${dep.name} (requires ${dep.requiredVersion})`);
    });
  } else if (pkgInfo) {
    console.log(`  ${t('commands.why.direct_dependency').trim()}`);
  }

  console.log('');
}

module.exports = { why };
