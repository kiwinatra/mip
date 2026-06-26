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

const { ExportsResolver } = require('../core/exports-resolver');
const { loadLangForCwd, getI18n } = require('../i18n');

async function exportsCommand(packageName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  if (!packageName) {
    console.log(t('commands.exports.usage'));
    return;
  }

  const resolver = new ExportsResolver(process.cwd());
  const paths = resolver.getExportedPaths(packageName);

  if (paths.length === 0) {
    console.log(t('commands.exports.not_found', { package: packageName }));
    return;
  }

  console.log(t('commands.exports.title', { package: packageName }));
  for (const p of paths) {
    const exists = resolver.hasExport(packageName, p);
    const icon = exists ? '✅' : '❌';
    console.log(`  ${icon} ${p}`);
  }
}

module.exports = { exports: exportsCommand };
