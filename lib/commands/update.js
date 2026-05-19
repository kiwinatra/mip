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
const { installPackage } = require('./install');

const { loadLangForCwd, getI18n } = require('../i18n');

async function update() {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  const pkgPath = path.join(process.cwd(), 'mip.json');

  if (!fs.existsSync(pkgPath)) {
    console.log(t('commands.update.no_mip_json'));
    return;
  }

  const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...config.dependencies, ...config.devDependencies };

  const packages = Object.entries(deps).map(([name, currentVersion]) => ({
    name,
    currentVersion
  }));

  console.log(t('commands.update.checking', { count: packages.length }));

  // Параллельная проверка обновлений
  const updates = await Promise.all(
    packages.map(async ({ name, currentVersion }) => {
      try {
        const latest = await getPackageInfo(name, 'latest');
        if (latest.version !== currentVersion) {
          return { name, current: currentVersion, latest: latest.version };
        }
      } catch (err) {
        console.log(t('commands.update.check_failed', { name }));
      }
      return null;
    })
  );

  const updatesAvailable = updates.filter(u => u !== null);

  if (updatesAvailable.length === 0) {
    console.log(t('commands.update.up_to_date'));
    return;
  }

  console.log(t('commands.update.available_title', { count: updatesAvailable.length }));

  updatesAvailable.forEach(({ name, current, latest }) => {
    console.log(`  ${name}: ${current} → ${latest}`);
  });

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question(t('commands.update.prompt'), async (answer) => {
    if (String(answer).toLowerCase() === 'y') {
      console.log(t('commands.update.updating'));

      for (const { name, latest } of updatesAvailable) {
        await installPackage(name, latest, { force: true });
      }

      console.log(t('commands.update.all_updated'));
    }
    readline.close();
  });
}

module.exports = { update };
