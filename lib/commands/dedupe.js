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
const features = require('../utils/features');

async function dedupe(options = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const { full = false } = options;
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['dedupe.enabled'] === false) {
    console.log('ℹ️ Dedupe command is disabled (dedupe.enabled: false)');
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnDedupe'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('🧹 Run dependency deduplication? (Y/n) ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  console.log(t('commands.dedupe.analyzing'));

  try {
    const deduplicator = new Deduplicator(process.cwd());
    
    // Используем фичи для настройки анализа
    const analyzeOptions = {
      checkDev: mipFeatures['dedupe.checkDev'] !== false,
      checkPeer: mipFeatures['dedupe.checkPeer'] !== false,
      maxDepth: mipFeatures['dedupe.maxDepth'] || 10
    };
    
    const { duplicates } = deduplicator.analyze(analyzeOptions);

    if (duplicates.length === 0) {
      console.log(t('commands.dedupe.none_found'));
      return;
    }

    // Фильтруем дубликаты по размеру
    const minSize = mipFeatures['dedupe.minSize'] || 0; // в байтах
    const filteredDuplicates = duplicates.filter(d => d.size > minSize);
    
    if (filteredDuplicates.length === 0) {
      console.log('ℹ️ No significant duplicates found (all are small)');
      return;
    }

    console.log(deduplicator.formatReport(filteredDuplicates));

    // Автоматическая дедупликация (если включена)
    if (mipFeatures['dedupe.autoDedupe']) {
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
      return;
    }

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