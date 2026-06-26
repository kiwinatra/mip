/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const yaml = require('js-yaml');

const { loadLangForCwd, getI18n } = require('../i18n');
const { writeProgressLine, newLine } = require('../ui/cli');

async function ci(options = {}) {
  const { frozenLockfile = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  console.log(t('commands.ci.running'));

  const yamlLockPath = path.join(process.cwd(), 'mip-lock.yml');
  const jsonLockPath = path.join(process.cwd(), 'mip-lock.json');
  const configPath = path.join(process.cwd(), 'mip.yml');

  // Проверяем наличие lock-файла (YAML или JSON)
  let lockPath = null;
  let lockData = null;

  if (fs.existsSync(yamlLockPath)) {
    lockPath = yamlLockPath;
    try {
      lockData = yaml.load(fs.readFileSync(lockPath, 'utf8'));
    } catch (err) {
      console.log(t('commands.ci.lock_corrupted', { path: lockPath }));
      process.exit(1);
    }
  } else if (fs.existsSync(jsonLockPath)) {
    lockPath = jsonLockPath;
    try {
      lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch (err) {
      console.log(t('commands.ci.lock_corrupted', { path: lockPath }));
      process.exit(1);
    }
  }

  if (!lockData) {
    console.log(t('commands.ci.lock_not_found'));
    process.exit(1);
  }

  // Проверяем наличие конфига (mip.yml, mip.json или package.json)
  const configExists = fs.existsSync(configPath) || 
                       fs.existsSync(path.join(process.cwd(), 'mip.json')) ||
                       fs.existsSync(path.join(process.cwd(), 'package.json'));

  if (!configExists) {
    console.log(t('commands.ci.config_not_found'));
    process.exit(1);
  }

  // Проверка frozen lockfile
  if (frozenLockfile) {
    console.log(t('commands.ci.checking_lockfile'));

    // Загружаем конфиг (предполагаем, что он уже загружен через config.js)
    const config = require('../utils/config');
    const conf = config.readConfig(process.cwd());
    if (!conf) {
      console.log(t('commands.ci.config_not_found'));
      process.exit(1);
    }

    const configDeps = { ...conf.dependencies, ...conf.devDependencies };
    const lockDeps = {};

    for (const [fullName, info] of Object.entries(lockData.packages || {})) {
      const name = fullName.split('@')[0];
      lockDeps[name] = info.version;
    }

    const mismatches = [];

    for (const [name] of Object.entries(configDeps)) {
      if (!lockDeps[name]) {
        mismatches.push(`  • ${name}: missing from lockfile`);
      }
    }

    for (const [name] of Object.entries(lockDeps)) {
      if (!configDeps[name] && !conf.devDependencies?.[name]) {
        mismatches.push(`  • ${name}: extra in lockfile`);
      }
    }

    if (mismatches.length > 0) {
      console.log(t('commands.ci.frozen_mismatch'));
      mismatches.forEach(m => console.log(m));
      console.log(t('commands.ci.run_install'));
      process.exit(1);
    }

    console.log(t('commands.ci.frozen_ok'));
  }

  const packages = lockData.packages || {};

  console.log(t('commands.ci.installing_from_lock', { count: Object.keys(packages).length }));

  const mipDir = path.join(process.cwd(), '.mip');
  fs.mkdirSync(mipDir, { recursive: true });

  let installed = 0;
  const total = Object.keys(packages).length;

  for (const [fullName, info] of Object.entries(packages)) {
    const name = fullName.split('@')[0];
    const targetDir = path.join(mipDir, name, info.version);

    if (!fs.existsSync(targetDir)) {
      console.log(t('commands.ci.downloading', { name, version: info.version }));

      try {
        const response = await axios.get(info.resolved, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        fs.mkdirSync(targetDir, { recursive: true });

        const { StreamExtractor } = require('../utils/stream-extract');
        await StreamExtractor.extractToDir(response.data, targetDir);
      } catch (err) {
        console.error(t('commands.ci.download_failed', { name, message: err.message }));
        process.exit(1);
      }
    }

    installed++;

    const percent = ((installed / total) * 100).toFixed(1);
    writeProgressLine({
      label: 'CI',
      percent,
      postfix: `${installed}/${total}`,
    });
  }

  newLine();
  console.log(t('commands.ci.complete', { installed }));
  console.log(t('commands.ci.lock_integrity_verified'));
}

module.exports = { ci };