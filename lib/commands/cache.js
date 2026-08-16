/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                           │
 * │   https://github.com/kiwinatra/mip                                  │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */


// So since we are making this thingy working, we all need --json?

const fs = require('fs');
const path = require('path');
const os = require('os');
const store = require('../utils/store');
const loader = require('../loader');
const { loadLangForCwd, getI18n } = require('../i18n');
const features = require('../utils/features');

function getDirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      size += getDirSize(p);
    } else {
      size += stat.size;
    }
  }
  return size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

async function cache(action, options = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включен ли кеш
  if (mipFeatures['cache.enabled'] === false) {
    console.log('ℹ️ Cache is disabled (cache.enabled: false)');
    console.log('   Enable it in mip.config.yml or with: mip config set features.cache.enabled true');
    return;
  }

  const isGlobal = options.global || process.argv.includes('--global');

  // Получение пути к кешу из фич
  const customCachePath = mipFeatures['cache.path'];
  let cachePath = customCachePath ? customCachePath.replace('~', os.homedir()) : null;

  const localCache = cachePath || path.join(process.cwd(), '.mip');
  const _globalCache = path.join(os.homedir(), '.mip');

  // Проверка лимита размера кеша
  const maxSize = mipFeatures['cache.maxSize'] || 500;
  const maxSizeBytes = maxSize * 1024 * 1024;

  // Проверка автоочистки
  if (action === 'clean' && mipFeatures['cache.cleanOnExit']) {
    console.log('ℹ️ cache.cleanOnExit is enabled, cleaning cache...');
  }

  switch (action) {
    case 'clean': {
      // Проверяем наличие lock-файла
      const yamlLock = path.join(process.cwd(), 'mip-lock.yml');
      const jsonLock = path.join(process.cwd(), 'mip-lock.json');
      
      if (!isGlobal) {
        const hasLock = fs.existsSync(yamlLock) || fs.existsSync(jsonLock);
        const hasManifest = fs.existsSync(loader.getManifestPath(process.cwd()));
        
        if (!hasLock && !hasManifest) {
          console.log('⚠️ No lockfile or manifest found');
          console.log('💡 Nothing to clean');
          return;
        }
      }

      let freed = 0;

      if (isGlobal) {
        const storeSize = store.getStoreSize();
        store.clearStore();
        console.log(t('commands.cache.global_cleaned', { mb: (storeSize / 1024 / 1024).toFixed(2) }));
      } else {
        // Очищаем локальный кэш
        if (fs.existsSync(localCache)) {
          freed += getDirSize(localCache);
          fs.rmSync(localCache, { recursive: true, force: true });
        }
        console.log(t('commands.cache.cleaned', { mb: (freed / 1024 / 1024).toFixed(2) }));
      }

      // Уведомление об очистке
      if (freed > maxSizeBytes) {
        console.log(`✅ Cleaned ${formatBytes(freed)} of cache`);
      }
      break;
    }

    case 'size': {
      let total = 0;

      if (isGlobal) {
        total = store.getStoreSize();
        console.log(t('commands.cache.global_size', { mb: (total / 1024 / 1024).toFixed(2) }));
      } else {
        if (fs.existsSync(localCache)) {
          total = getDirSize(localCache);
        }
        // Проверяем манифест
        const manifest = loader.loadManifest(process.cwd());
        const manifestSize = Object.keys(manifest).length;
        console.log(t('commands.cache.manifest_packages', { count: manifestSize }));
        console.log(t('commands.cache.size', { mb: (total / 1024 / 1024).toFixed(2) }));
        
        // Предупреждение о превышении лимита
        if (total > maxSizeBytes) {
          console.log(`⚠️ Cache size exceeds limit (${formatBytes(maxSizeBytes)})`);
          console.log(`   Run "mip cache clean" to free up space`);
        }
      }
      break;
    }

    case 'status': {
      const localCacheDir = path.join(process.cwd(), '.mip', 'cache');
      const globalCachePath = store.getGlobalStorePath ? store.getGlobalStorePath() : path.join(os.homedir(), '.mip', 'store');

      const toStats = (dirPath) => {
        if (!fs.existsSync(dirPath)) return { entries: 0, bytes: 0 };
        let bytes = 0;
        let entries = 0;
        const stack = [dirPath];
        while (stack.length) {
          const cur = stack.pop();
          let items;
          try {
            items = fs.readdirSync(cur);
          } catch {
            continue;
          }
          for (const it of items) {
            const p = path.join(cur, it);
            let st;
            try {
              st = fs.statSync(p);
            } catch {
              continue;
            }
            if (st.isDirectory()) {
              stack.push(p);
            } else {
              entries += 1;
              bytes += st.size;
            }
          }
        }
        return { entries, bytes };
      };

      const wantJson = options.json || process.argv.includes('--json');

      const localStats = toStats(localCacheDir);
      if (isGlobal) {
        const globalStats = toStats(globalCachePath);
        const out = {
          scope: 'global',
          path: globalCachePath,
          entries: globalStats.entries,
          bytes: globalStats.bytes,
          mb: Number((globalStats.bytes / 1024 / 1024).toFixed(2)),
        };
        if (wantJson) console.log(JSON.stringify(out, null, 2));
        else console.log(`Global cache: ${out.entries} files, ${out.mb} MB`);
        break;
      }

      // local only
      const out = {
        scope: 'local',
        path: localCacheDir,
        entries: localStats.entries,
        bytes: localStats.bytes,
        mb: Number((localStats.bytes / 1024 / 1024).toFixed(2)),
      };
      if (wantJson) console.log(JSON.stringify(out, null, 2));
      else console.log(`Local cache: ${out.entries} files, ${out.mb} MB`);
      break;
    }

    case 'usage': {
      // Показывает, какие пакеты из глобального кэша используются
      if (!isGlobal) {
        console.log(t('commands.cache.usage_global_only'));
        return;
      }


      const storePath = store.getGlobalStorePath();
      if (!fs.existsSync(storePath)) {
        console.log(t('commands.cache.no_global_cache'));
        return;
      }

      const packages = fs.readdirSync(storePath);
      let totalSize = 0;
      const usage = [];

      for (const pkg of packages) {
        const pkgPath = path.join(storePath, pkg);
        if (fs.statSync(pkgPath).isDirectory()) {
          const versions = fs.readdirSync(pkgPath);
          for (const version of versions) {
            const versionPath = path.join(pkgPath, version);
            if (fs.statSync(versionPath).isDirectory()) {
              const size = getDirSize(versionPath);
              totalSize += size;
              usage.push({ name: pkg, version, size });
            }
          }
        }
      }

      usage.sort((a, b) => b.size - a.size);

      // Проверяем, какие пакеты используются в манифесте
      const manifest = loader.loadManifest(process.cwd());

      // Ограничиваем вывод
      const maxDisplay = 50;
      const displayItems = usage.slice(0, maxDisplay);

      console.log(t('commands.cache.usage_title'));
      console.log('─'.repeat(60));
      for (const item of displayItems) {
        const isUsed = !!manifest[item.name];
        const usedIcon = isUsed ? '📋' : '💀';
        console.log(`  ${usedIcon} ${item.name}@${item.version}  ${formatBytes(item.size)}`);
      }
      
      if (usage.length > maxDisplay) {
        console.log(`  ... and ${usage.length - maxDisplay} more packages`);
      }
      
      console.log('─'.repeat(60));
      console.log(t('commands.cache.usage_total', { total: formatBytes(totalSize) }));
      console.log('\n' + t('commands.cache.usage_legend'));
      console.log('  📋 - used in current project');
      console.log('  💀 - not used (can be cleaned)');
      break;
    }

    default:
      console.log(t('commands.cache.default_help'));
  }
}

module.exports = { cache };