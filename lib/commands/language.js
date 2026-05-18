const fs = require('fs');
const path = require('path');

const { languages, loadLangForCwd, getI18n } = require('../i18n');

function readMipConfig(cwd) {
  const pkgPath = path.join(cwd, 'mip.json');
  if (!fs.existsSync(pkgPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeMipConfig(cwd, config) {
  const pkgPath = path.join(cwd, 'mip.json');
  fs.writeFileSync(pkgPath, JSON.stringify(config, null, 2));
}

function formatLangs() {
  return languages.join(', ');
}

async function language(langArg) {
  const cwd = process.cwd();
  const currentLang = loadLangForCwd(cwd);
  const { t } = getI18n(currentLang);

  if (!langArg) {
    const msg = t('commands.language.current', { lang: currentLang });
    const msg2 = t('commands.language.available', { langs: formatLangs() });
    console.log(`${msg}\n${msg2}`);
    return;
  }

  const lang = String(langArg).toLowerCase();
  if (!languages.includes(lang)) {
    console.log(t('commands.language.invalid', { lang }));
    return;
  }

  const config = readMipConfig(cwd) || {};
  config.language = lang;

  // Ensure structure if user just runs language in empty folder
  if (!config.dependencies) config.dependencies = {};
  if (!config.devDependencies) config.devDependencies = {};

  writeMipConfig(cwd, config);
  console.log(t('commands.language.set_ok', { lang }));
}

module.exports = { language };
