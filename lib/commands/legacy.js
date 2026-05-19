// lib/commands/legacy.js
const { LegacyFallback } = require('../core/legacy-fallback');
const { loadLangForCwd, getI18n } = require('../i18n');

async function legacy(action, packageName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const fallback = new LegacyFallback(process.cwd());
  
  if (action === 'list') {
    console.log(t('commands.legacy.checking'));
    
    const mipDir = path.join(process.cwd(), '.mip');
    if (!fs.existsSync(mipDir)) {
      console.log(t('commands.legacy.no_packages'));
      return;
    }
    
    const packages = fs.readdirSync(mipDir);
    const legacyPackages = [];
    
    for (const pkg of packages) {
      if (fallback.isLegacyPackage(pkg)) {
        legacyPackages.push(pkg);
      }
    }
    
    if (legacyPackages.length === 0) {
      console.log(t('commands.legacy.none_found'));
    } else {
      console.log(t('commands.legacy.found_title', { count: legacyPackages.length }));
      for (const pkg of legacyPackages) {
        console.log(`  • ${pkg}`);
      }
      console.log(t('commands.legacy.fix_hint'));
    }
    return;
  }
  
  if (action === 'fix' && packageName) {
    console.log(t('commands.legacy.fixing', { package: packageName }));
    const emulated = fallback.emulateDependencies(packageName);
    console.log(t('commands.legacy.fixed', { package: packageName, count: emulated }));
    return;
  }
  
  if (action === 'clean') {
    const removed = fallback.cleanEmulation();
    console.log(t('commands.legacy.cleaned', { count: removed }));
    return;
  }
  
  console.log(t('commands.legacy.usage'));
}

module.exports = { legacy };