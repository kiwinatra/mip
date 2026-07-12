const os = require('os');
const path = require('path');
const fs = require('fs');

// ==========================================
// БАЗА ЦИТАТ
// ==========================================

const QUOTES = [
  "Code is like humor. When you have to explain it, it's bad.",
  "First, solve the problem. Then, write the code.",
  "Simplicity is the soul of efficiency.",
  "Make it work, make it right, make it fast.",
  "The only way to go fast is to go well.",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
  "Experience is the name everyone gives to their mistakes.",
  "The best error message is the one that never shows up.",
  "It works on my machine.",
  "If at first you don't succeed, call it version 1.0.",
  "Real programmers count from 0.",
  "I'm not a great programmer; I'm just a good programmer with great habits.",
  "Programs must be written for people to read, and only incidentally for machines to execute.",
  "The trouble with programmers is that you can never tell what a programmer is doing until it's too late.",
  "Premature optimization is the root of all evil.",
  "Walking on water and developing software from a specification are easy if both are frozen.",
  "The best thing about a boolean is even if you are wrong, you are only off by a bit.",
  "There are only two hard things in Computer Science: cache invalidation and naming things.",
  "Any sufficiently advanced technology is indistinguishable from magic.",
  "One man's crappy software is another man's full-time job."
];

// ==========================================
// СОВЕТЫ
// ==========================================

const TIPS = [
  "Try 'mip alias set i install' to save time typing",
  "Use 'mip feel' to see how your project is doing",
  "Run 'mip doctor' to check your system health",
  "Use 'mip registry list' to see all configured registries",
  "Try 'mip server' for a web dashboard of your project",
  "Use 'mip publish' to share your packages with the world",
  "Use 'mip clone' to share your project configuration",
  "Use 'mip config edit' to edit settings in your editor",
  "You can use 'mip bundle' to bundle your project into a single file",
  "Use 'mip audit' to check for security vulnerabilities",
  "Use 'mip outdated' to see which packages need updating",
  "Use 'mip why' to understand why a package is installed"
];

function getStats() {
  let packageCount = 0;
  let projectCount = 0;
  
  try {
    // conut packets in globalstore
    const storePath = path.join(os.homedir(), '.mip', 'store');
    if (fs.existsSync(storePath)) {
      const pkgs = fs.readdirSync(storePath);
      for (const pkg of pkgs) {
        const pkgPath = path.join(storePath, pkg);
        if (fs.statSync(pkgPath).isDirectory()) {
          const versions = fs.readdirSync(pkgPath);
          packageCount += versions.length;
        }
      }
    }
  } catch (e) {
    packageCount = 0;
  }
  
  return { packageCount, projectCount };
}

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

function getRandomTip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

function getRandomFact() {
  const stats = getStats();
  const facts = [
    `You can disable modt in config`
    `MIP v2.1 is 8x faster than v2.0`,
    `MIP supports ${Object.keys(require('../i18n/locales')).length || 10} languages`,
    `MIP uses global cache to save disk space`,
    `MIP has built-in plugin system`,
    `MIP can publish to npm, GitHub, and GitLab`,
    stats.packageCount > 0 ? `${stats.packageCount} packages in global store` : null
  ].filter(Boolean);
  
  return facts[Math.floor(Math.random() * facts.length)];
}


function getMOTD() {
  const parts = [];
  
  // Message type:
  // @type citation;
  // @type fact;
  // @type recommendation;
  const type = Math.floor(Math.random() * 3);
  
  if (type === 0) {
    parts.push(`💡 "${getRandomQuote()}"`);
  } else if (type === 1) {
    parts.push(`💡 Tip: ${getRandomTip()}`);
  } else {
    parts.push(`📊 Fact: ${getRandomFact()}`);
  }
  
  return parts.join('\n');
}


function shouldShowMOTD(cwd = process.cwd()) {
  try {
    // check config
    const configPath = path.join(cwd, 'mip.config.yml');
    if (fs.existsSync(configPath)) {
      const yaml = require('js-yaml');
      const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
      if (config && config.motd && config.motd.enabled === false) {
        return false;
      }
    }
  } catch (e) {
    // nothing, just idc
  }
// Проверяем, показывали ли уже сегодня
  const today = new Date().toDateString();
  const motdFile = path.join(os.homedir(), '.mip', 'motd.cache');
  
  if (fs.existsSync(motdFile)) {
    try {
      const cache = fs.readFileSync(motdFile, 'utf8');
      if (cache === today) {
        return false;
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  
  // Сохраняем сегодняшнюю дату
  try {
    const mipDir = path.join(os.homedir(), '.mip');
    if (!fs.existsSync(mipDir)) {
      fs.mkdirSync(mipDir, { recursive: true });
    }
    fs.writeFileSync(motdFile, today, 'utf8');
  } catch (e) {
    // Игнорируем ошибки записи
  }
  
  return true;
}

function showMOTD(cwd = process.cwd()) {
  if (!shouldShowMOTD(cwd)) {
    return;
  }
  
  const message = getMOTD();
  console.log(`\n${message}\n`);
}

module.exports = {
  getRandomQuote,
  getRandomTip,
  getRandomFact,
  getMOTD,
  shouldShowMOTD,
  showMOTD, // <- fixed
  QUOTES,
  TIPS
};