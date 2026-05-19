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
  
  // 🔥 ИЗМЕНЕНИЕ: читаем из .mip вместо node_modules
  const mipDir = path.join(cwd, '.mip');

  console.log('\n' + t('commands.list.installed_packages') + '\n');

  if (fs.existsSync(mipDir)) {
    // Получаем список пакетов из .mip (директории первого уровня)
    const packages = fs.readdirSync(mipDir).filter(item => {
      const itemPath = path.join(mipDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    if (packages.length === 0) {
      console.log(t('commands.list.empty'));
    } else {
      packages.forEach(pkg => {
        // Получаем установленную версию из lockfile или mip.json
        let version = config.dependencies?.[pkg] || config.devDependencies?.[pkg];
        
        // Если в mip.json нет, пытаемся получить из .mip
        if (!version) {
          const pkgDir = path.join(mipDir, pkg);
          if (fs.existsSync(pkgDir)) {
            const versions = fs.readdirSync(pkgDir).filter(v => 
              fs.statSync(path.join(pkgDir, v)).isDirectory()
            );
            if (versions.length > 0) {
              version = versions[0]; // берем первую версию
            }
          }
        }
        
        console.log(`  ├── ${pkg}${version ? `@${version}` : ''}`);
      });
    }
  } else {
    console.log(t('commands.list.empty'));
  }

  const totalPackages = Object.keys(config.dependencies || {}).length + 
                        Object.keys(config.devDependencies || {}).length;
  console.log(`\n${t('commands.list.total', { count: totalPackages })}\n`);
}

module.exports = { list };