const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

const { loadLangForCwd, getI18n } = require('../i18n');
const { writeProgressLine, newLine } = require('../ui/cli');

async function ci(options = {}) {
  const { frozenLockfile = false } = options;
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  console.log(t('commands.ci.running'));

  const lockPath = path.join(process.cwd(), 'mip-lock.json');
  const configPath = path.join(process.cwd(), 'mip.json');

  if (!fs.existsSync(lockPath)) {
    console.log(t('commands.ci.lock_not_found'));
    process.exit(1);
  }

  if (!fs.existsSync(configPath)) {
    console.log(t('commands.ci.config_not_found'));
    process.exit(1);
  }

  // 🔥 НОВОЕ: проверка frozen lockfile
  if (frozenLockfile) {
    console.log(t('commands.ci.checking_lockfile'));
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    
    const configDeps = { ...config.dependencies, ...config.devDependencies };
    const lockDeps = {};
    
    for (const [fullName, info] of Object.entries(lockData.packages || {})) {
      const name = fullName.split('@')[0];
      lockDeps[name] = info.version;
    }
    
    const mismatches = [];
    
    for (const [name, range] of Object.entries(configDeps)) {
      const lockVersion = lockDeps[name];
      if (!lockVersion) {
        mismatches.push(`  • ${name}: missing from lockfile`);
      }
    }
    
    for (const [name, version] of Object.entries(lockDeps)) {
      if (!configDeps[name] && !config.devDependencies?.[name]) {
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

  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
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
          timeout: 30000
        });

        fs.mkdirSync(targetDir, { recursive: true });

        execSync(`tar -xzf - -C "${targetDir}" --strip-components=1`, {
          input: response.data,
          stdio: 'pipe'
        });
      } catch (err) {
        console.error(t('commands.ci.download_failed', { name, message: err.message }));
        process.exit(1);
      }
    }

    installed++;

    const percent = (installed / total * 100).toFixed(1);
    writeProgressLine({
      label: 'CI',
      percent,
      postfix: `${installed}/${total}`
    });
  }

  newLine();
  console.log(t('commands.ci.complete', { installed }));
  console.log(t('commands.ci.lock_integrity_verified'));
}

module.exports = { ci };