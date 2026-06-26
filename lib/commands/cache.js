/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                           │
 * │   https://github.com/kiwinatra/mip                                  │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const store = require('../utils/store');
const loader = require('../loader');
const { loadLangForCwd, getI18n } = require('../i18n');
const config = require('../utils/config');

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
  const isGlobal = options.global || process.argv.includes('--global');

  const localCache = path.join(process.cwd(), '.mip');
  const globalCache = path.join(os.homedir(), '.mip');

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
      }
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

      console.log(t('commands.cache.usage_title'));
      console.log('─'.repeat(60));
      for (const item of usage) {
        const isUsed = !!manifest[item.name];
        const usedIcon = isUsed ? '📋' : '💀';
        console.log(`  ${usedIcon} ${item.name}@${item.version}  ${formatBytes(item.size)}`);
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