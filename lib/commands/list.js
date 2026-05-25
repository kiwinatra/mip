/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝                                                 │
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

const { loadLangForCwd, getI18n } = require('../i18n');

function list() {
  const pkgPath = path.join(process.cwd(), 'mip.json');
  const cwd = process.cwd();
  const { t } = getI18n(loadLangForCwd(cwd));

  if (!fs.existsSync(pkgPath)) {
    console.log(t('commands.list.no_mip_json'));
    return;
  }

  const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const mipDir = path.join(cwd, '.mip');
  const lockPath = path.join(cwd, 'mip-lock.json');

  console.log('\n' + t('commands.list.installed_packages') + '\n');

  // Expected packages from lockfile (warn if .mip was deleted manually)
  const expectedFromLock = new Map(); // name -> version
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      for (const [key, info] of Object.entries(lock.packages || {})) {
        // key format: "name@version"
        const [name, versionFromKey] = key.split('@');
        const version = info?.version || versionFromKey;
        if (!name || !version) continue;
        expectedFromLock.set(name, version);
      }
    } catch {
      // ignore malformed lockfile
    }
  }

  const presentPackages = new Set();
  if (fs.existsSync(mipDir)) {
    const packages = fs.readdirSync(mipDir).filter(item => {
      const itemPath = path.join(mipDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    packages.forEach(p => presentPackages.add(p));
  }

  // Warn about packages present in lockfile but missing in .mip
  for (const [name] of expectedFromLock.entries()) {
    if (!presentPackages.has(name)) {
      console.log(`  ├── ${t('commands.list.missing_package', { name })}`);
    }
  }

  // Print packages actually present in .mip
  if (fs.existsSync(mipDir)) {
    const packages = fs.readdirSync(mipDir).filter(item => {
      const itemPath = path.join(mipDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    if (packages.length === 0) {
      if (expectedFromLock.size === 0) {
        console.log(t('commands.list.empty'));
      }
    } else {
      packages.forEach(pkg => {
        // Prefer version from mip.json
        let version = config.dependencies?.[pkg] || config.devDependencies?.[pkg];

        // Fallback: infer from .mip folder versions
        if (!version) {
          const pkgDir = path.join(mipDir, pkg);
          if (fs.existsSync(pkgDir)) {
            const versions = fs.readdirSync(pkgDir).filter(v =>
              fs.statSync(path.join(pkgDir, v)).isDirectory()
            );
            if (versions.length > 0) {
              version = versions[0];
            }
          }
        }

        console.log(`  ├── ${pkg}${version ? `@${version}` : ''}`);
      });
    }
  } else {
    if (expectedFromLock.size === 0) {
      console.log(t('commands.list.empty'));
    }
  }

  const totalPackages = Object.keys(config.dependencies || {}).length +
    Object.keys(config.devDependencies || {}).length;
  console.log(`\n${t('commands.list.total', { count: totalPackages })}\n`);
}

module.exports = { list };

