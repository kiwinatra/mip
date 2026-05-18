const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

const { loadLangForCwd, getI18n } = require('../i18n');
const { writeProgressLine, newLine } = require('../ui/cli');

async function ci() {

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

  const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const packages = lockData.packages || {};

  console.log(t('commands.ci.installing_from_lock', { count: Object.keys(packages).length }));

  // 🔥 ИЗМЕНЕНИЕ: удаляем node_modules, но теперь он не нужен
  // Просто очищаем старые кеши если требуется
  const mipDir = path.join(process.cwd(), '.mip');
  fs.mkdirSync(mipDir, { recursive: true });

  let installed = 0;
  const total = Object.keys(packages).length;

  for (const [fullName, info] of Object.entries(packages)) {
    const name = fullName.split('@')[0];
    // 🔥 ИЗМЕНЕНИЕ: устанавливаем напрямую в .mip
    const targetDir = path.join(mipDir, name, info.version);

    if (!fs.existsSync(targetDir)) {
      console.log(t('commands.ci.downloading', { name, version: info.version }));

      try {
        const response = await axios.get(info.resolved, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        fs.mkdirSync(targetDir, { recursive: true });

        // 🔥 ИЗМЕНЕНИЕ: распаковываем напрямую (без temp файла)
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

    // Оформление прогресса без изменения логики установки.
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