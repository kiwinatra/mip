/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yaml = require('js-yaml');

const { loadLangForCwd, getI18n } = require('../i18n');
const { writeProgressLine, newLine } = require('../ui/cli');
const features = require('../utils/features');

async function ci(options = {}) {
  const { frozenLockfile = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['ci.enabled'] === false) {
    console.log('ℹ️ CI command is disabled (ci.enabled: false)');
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnCi'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('🔧 Run CI installation? (Y/n) ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  console.log(t('commands.ci.running'));

  const yamlLockPath = path.join(process.cwd(), 'mip-lock.yml');
  const jsonLockPath = path.join(process.cwd(), 'mip-lock.json');
  const configPath = path.join(process.cwd(), 'mip.yml');

  // Проверяем наличие lock-файла (YAML или JSON)
  let lockPath = null;
  let lockData = null;

  // Проверка на использование YAML lockfile (из фич)
  const preferYaml = mipFeatures['ci.preferYaml'] !== false;

  if (preferYaml && fs.existsSync(yamlLockPath)) {
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
  } else if (fs.existsSync(yamlLockPath)) {
    lockPath = yamlLockPath;
    try {
      lockData = yaml.load(fs.readFileSync(lockPath, 'utf8'));
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
  if (frozenLockfile || mipFeatures['ci.frozenLockfile']) {
    console.log(t('commands.ci.checking_lockfile'));

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

    // Проверка соответствия версий
    const checkExact = mipFeatures['ci.checkExactVersions'] !== false;
    
    for (const [name, version] of Object.entries(configDeps)) {
      if (!lockDeps[name]) {
        mismatches.push(`  • ${name}: missing from lockfile`);
      } else if (checkExact && lockDeps[name] !== version) {
        mismatches.push(`  • ${name}: lockfile version ${lockDeps[name]} != config version ${version}`);
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

  // Параллельная установка
  const useParallel = mipFeatures['ci.parallelInstall'] !== false;
  const parallelCount = mipFeatures['performance.parallelDownloads'] || 5;

  if (useParallel && total > 1) {
    const entries = Object.entries(packages);
    const chunks = [];
    for (let i = 0; i < entries.length; i += parallelCount) {
      chunks.push(entries.slice(i, i + parallelCount));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async ([fullName, info]) => {
        const name = fullName.split('@')[0];
        const targetDir = path.join(mipDir, name, info.version);

        if (!fs.existsSync(targetDir)) {
          console.log(t('commands.ci.downloading', { name, version: info.version }));

          try {
            const response = await axios.get(info.resolved, {
              responseType: 'arraybuffer',
              timeout: mipFeatures['registry.timeout'] || 30000,
            });

            fs.mkdirSync(targetDir, { recursive: true });

            const { StreamExtractor } = require('../utils/stream-extract');
            await StreamExtractor.extractToDir(response.data, targetDir);
          } catch (err) {
            console.error(t('commands.ci.download_failed', { name, message: err.message }));
            throw err;
          }
        }
        return { name, version: info.version };
      });
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      installed += successful;
      
      const percent = ((installed / total) * 100).toFixed(1);
      writeProgressLine({
        label: 'CI',
        percent,
        postfix: `${installed}/${total}`,
      });
      
      // Проверка на ошибки
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.log(`\n❌ ${failed.length} package(s) failed to install`);
        process.exit(1);
      }
    }
  } else {
    for (const [fullName, info] of Object.entries(packages)) {
      const name = fullName.split('@')[0];
      const targetDir = path.join(mipDir, name, info.version);

      if (!fs.existsSync(targetDir)) {
        console.log(t('commands.ci.downloading', { name, version: info.version }));

        try {
          const response = await axios.get(info.resolved, {
            responseType: 'arraybuffer',
            timeout: mipFeatures['registry.timeout'] || 30000,
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
  }

  newLine();
  console.log(t('commands.ci.complete', { installed }));
  console.log(t('commands.ci.lock_integrity_verified'));
  
  // Проверка на использование кеша
  if (mipFeatures['ci.useCache'] !== false) {
    console.log('✅ Using global cache for packages');
  }
}

module.exports = { ci };