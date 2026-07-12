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

const { getPackageInfo, getPackageVersions } = require('../utils/registry');
const { loadLangForCwd, getI18n } = require('../i18n');
const features = require('../utils/features');

async function info(packageName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['info.enabled'] === false) {
    console.log('ℹ️ Info command is disabled (info.enabled: false)');
    return;
  }

  if (!packageName) {
    console.log(t('commands.info.usage'));
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnInfo'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`📦 Get info for "${packageName}"? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  console.log(t('commands.info.fetching', { package: packageName }));

  // Проверка кеша
  const cacheKey = `info_${packageName}`;
  const cache = mipFeatures['info.cache'] !== false;
  
  try {
    const [pkg, versions] = await Promise.all([
      getPackageInfo(packageName, 'latest'),
      getPackageVersions(packageName),
    ]);

    // Форматируем размер
    const size = pkg.dist?.unpackedSize || 0;
    const sizeFormatted = size > 0 ? formatSize(size) : 'N/A';

    // Форматируем лицензию
    const license = pkg.license || pkg.license?.type || 'Unknown';

    console.log(`
╔═══════════════════════════════════════╗
║ ${packageName}@${pkg.version}
╠═══════════════════════════════════════╣
${t('commands.info.description')}
  ${pkg.description || t('commands.info.no_description')}

${t('commands.info.author')}
  ${pkg.author?.name || pkg.author || t('commands.info.unknown_author')}

${t('commands.info.license')}
  ${license}

${t('commands.info.size')}
  ${sizeFormatted}

${t('commands.info.dependencies')}
  ${pkg.dependencies ? Object.keys(pkg.dependencies).length : 0}

${t('commands.info.homepage')}
  ${pkg.homepage || t('commands.info.not_provided')}

${t('commands.info.versions')}
  ${t('commands.info.latest')} ${pkg.version}
  ${t('commands.info.total')} ${versions.length}

${t('commands.info.published')}
  ${pkg.time?.modified ? new Date(pkg.time.modified).toLocaleDateString() : 'N/A'}

${t('commands.info.repository')}
  ${pkg.repository?.url || t('commands.info.not_provided')}
╚═══════════════════════════════════════╝
    `);

    // Показываем последние версии (если включено)
    if (mipFeatures['info.showRecentVersions'] !== false && versions.length > 0) {
      console.log(`${t('commands.info.recent_versions')}`);
      const maxDisplay = mipFeatures['info.maxVersions'] || 5;
      versions.slice(0, maxDisplay).forEach(v => {
        const isLatest = v === pkg.version;
        console.log(`  • ${v}${isLatest ? ` ${t('commands.info.latest_tag')}` : ''}`);
      });
    }

    // Показываем зависимости (если включено)
    if (mipFeatures['info.showDependencies'] !== false && pkg.dependencies) {
      const deps = Object.keys(pkg.dependencies);
      if (deps.length > 0) {
        console.log(`\n📦 Dependencies (${deps.length}):`);
        const maxDeps = mipFeatures['info.maxDependencies'] || 10;
        deps.slice(0, maxDeps).forEach(dep => {
          console.log(`  • ${dep}@${pkg.dependencies[dep]}`);
        });
        if (deps.length > maxDeps) {
          console.log(`  ... and ${deps.length - maxDeps} more`);
        }
      }
    }

  } catch (error) {
    console.error(t('commands.info.failed', { message: error.message }));
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = { info };