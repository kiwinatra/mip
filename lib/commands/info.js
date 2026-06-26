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

async function info(packageName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  if (!packageName) {
    console.log(t('commands.info.usage'));
    return;
  }

  console.log(t('commands.info.fetching', { package: packageName }));

  try {
    const [pkg, versions] = await Promise.all([
      getPackageInfo(packageName, 'latest'),
      getPackageVersions(packageName),
    ]);

    console.log(`
╔═══════════════════════════════════════╗
║ ${packageName}@${pkg.version}
╠═══════════════════════════════════════╣
${t('commands.info.description')}
  ${pkg.description || t('commands.info.no_description')}

${t('commands.info.author')}
  ${pkg.author?.name || t('commands.info.unknown_author')}

${t('commands.info.homepage')}
  ${pkg.homepage || t('commands.info.not_provided')}

${t('commands.info.versions')}
  ${t('commands.info.latest')} ${pkg.version}
  ${t('commands.info.total')} ${versions.length}

${t('commands.info.published')}
  ${new Date(pkg.time?.modified || Date.now()).toLocaleDateString()}

${t('commands.info.repository')}
  ${pkg.repository?.url || t('commands.info.not_provided')}
╚═══════════════════════════════════════╝
    `);

    if (versions.length > 0) {
      console.log(`${t('commands.info.recent_versions')}`);
      versions.slice(0, 5).forEach(v => {
        console.log(`  • ${v} ${v === pkg.version ? t('commands.info.latest_tag') : ''}`);
      });
    }
  } catch (error) {
    console.error(t('commands.info.failed', { message: error.message }));
  }
}

module.exports = { info };
