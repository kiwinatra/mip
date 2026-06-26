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

const { Deduplicator } = require('../core/dedupe');
const { loadLangForCwd, getI18n } = require('../i18n');

async function dedupe(options = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const { full = false } = options;

  console.log(t('commands.dedupe.analyzing'));

  try {
    const deduplicator = new Deduplicator(process.cwd());
    const { duplicates } = deduplicator.analyze();

    if (duplicates.length === 0) {
      console.log(t('commands.dedupe.none_found'));
      return;
    }

    console.log(deduplicator.formatReport(duplicates));

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(t('commands.dedupe.confirm'), async answer => {
      if (answer.toLowerCase() === 'y') {
        console.log(t('commands.dedupe.running'));

        const result = full ? await deduplicator.fullDedupe() : await deduplicator.quickDedupe();

        if (result.success) {
          console.log(
            t('commands.dedupe.complete', {
              removed: result.removedCount,
              remaining: result.remainingPackages,
            })
          );

          if (result.removed && result.removed.length > 0) {
            console.log(t('commands.dedupe.removed_list'));
            result.removed.forEach(r => {
              console.log(`  • ${r.name}@${r.version} → kept ${r.keptVersion}`);
            });
          }
        }
      } else {
        console.log(t('commands.dedupe.cancelled'));
      }
      readline.close();
    });
  } catch (err) {
    console.error(t('commands.dedupe.error', { message: err.message }));
  }
}

module.exports = { dedupe };
