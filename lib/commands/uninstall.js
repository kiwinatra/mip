/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const { loadLangForCwd, getI18n } = require('../i18n');
const loader = require('../loader');
const config = require('../utils/config');

function uninstall(packageName, options = {}) {
  const { noSave = false } = options;
  const cwd = process.cwd();
  const { t } = getI18n(loadLangForCwd(cwd));

  // Проверяем/мигрируем конфиг
  const cfg = config.detectConfig();
  if (!cfg) {
    console.log(t('commands.uninstall.no_config'));
    return;
  }

  // Загружаем конфиг
  const conf = config.readConfig(cwd);
  if (!conf) {
    console.log(t('commands.uninstall.no_config'));
    return;
  }

  // Проверяем, есть ли пакет в зависимостях
  const deps = conf.dependencies || {};
  const devDeps = conf.devDependencies || {};
  const isInDeps = deps[packageName] || devDeps[packageName];

  if (!isInDeps) {
    console.log(t('commands.uninstall.not_in_config', { package: packageName }));
    // Всё равно пытаемся удалить из .mip и манифеста
  }

  // Удаляем из манифеста
  const manifest = loader.loadManifest(cwd);
  if (manifest[packageName]) {
    delete manifest[packageName];
    loader.saveManifest(manifest, cwd);
    console.log(t('commands.uninstall.removed_from_manifest', { package: packageName }));
  }

  // Удаляем симлинк из node_modules (если есть)
  const nodeModulesDir = path.join(cwd, 'node_modules');
  if (fs.existsSync(nodeModulesDir)) {
    const linkPath = path.join(nodeModulesDir, packageName);
    if (fs.existsSync(linkPath)) {
      try {
        fs.rmSync(linkPath, { recursive: true, force: true });
        console.log(t('commands.uninstall.removed_from_node_modules', { package: packageName }));
      } catch {
        // Молча игнорируем ошибки
      }
    }
  }

  // Удаляем локальный .mip (только если пакет есть локально)
  const mipDir = path.join(cwd, '.mip');
  let removedCount = 0;

  if (fs.existsSync(mipDir)) {
    const packageDir = path.join(mipDir, packageName);
    if (fs.existsSync(packageDir)) {
      const versions = fs.readdirSync(packageDir);
      for (const version of versions) {
        const versionPath = path.join(packageDir, version);
        if (fs.statSync(versionPath).isDirectory()) {
          fs.rmSync(versionPath, { recursive: true, force: true });
          removedCount++;
          console.log(t('commands.uninstall.removed_version', { package: packageName, version }));
        }
      }

      if (fs.readdirSync(packageDir).length === 0) {
        fs.rmdirSync(packageDir);
      }
    }
  }

  // Удаляем из lock-файлов (JSON + YAML)
  removeFromLockfiles(packageName, cwd);

  // Удаляем из конфига (если noSave не указан)
  if (!noSave && isInDeps) {
    if (deps[packageName]) delete deps[packageName];
    if (devDeps[packageName]) delete devDeps[packageName];
    config.writeConfig(conf, cwd);
    console.log(t('commands.uninstall.removed_from_config', { package: packageName }));
  }

  if (removedCount > 0 || isInDeps) {
    console.log(
      t('commands.uninstall.removed', {
        package: packageName,
        versions: removedCount || 1,
      })
    );
  } else {
    console.log(t('commands.uninstall.not_found', { package: packageName }));
  }
}

function removeFromLockfiles(packageName, cwd) {
  // Удаляем из YAML lock-файла
  const yamlLockPath = path.join(cwd, 'mip-lock.yml');
  if (fs.existsSync(yamlLockPath)) {
    try {
      const yaml = require('js-yaml');
      const lockData = yaml.load(fs.readFileSync(yamlLockPath, 'utf8'));
      if (lockData.packages) {
        for (const [pkgKey] of Object.entries(lockData.packages)) {
          if (pkgKey.startsWith(`${packageName}@`)) {
            delete lockData.packages[pkgKey];
            console.log(t('commands.uninstall.removed_from_lockfile', { package: pkgKey }));
          }
        }
        fs.writeFileSync(yamlLockPath, yaml.dump(lockData, { indent: 2 }));
      }
    } catch {}
  }

  // Удаляем из JSON lock-файла (для обратной совместимости)
  const jsonLockPath = path.join(cwd, 'mip-lock.json');
  if (fs.existsSync(jsonLockPath)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(jsonLockPath, 'utf8'));
      if (lockData.packages) {
        for (const [pkgKey] of Object.entries(lockData.packages)) {
          if (pkgKey.startsWith(`${packageName}@`)) {
            delete lockData.packages[pkgKey];
            console.log(t('commands.uninstall.removed_from_lockfile', { package: pkgKey }));
          }
        }
        fs.writeFileSync(jsonLockPath, JSON.stringify(lockData, null, 2));
      }
    } catch {}
  }
}

module.exports = { uninstall };