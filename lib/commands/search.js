const { searchPackages } = require('../utils/registry');
const { loadLangForCwd, getI18n } = require('../i18n');

async function search(query) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  if (!query) {
    console.log(t('commands.search.usage'));
    return;
  }

  console.log(t('commands.search.searching', { query }));

  try {
    const results = await searchPackages(query, 20);

    if (results.length === 0) {
      console.log(t('commands.search.no_packages'));
      return;
    }

    console.log(t('commands.search.found_title', { count: results.length }));

    results.forEach((pkg, i) => {
      const icon = i === results.length - 1 ? '└──' : '├──';
      console.log(`${icon} ${pkg.name}@${pkg.version}`);
      if (pkg.description) {
        console.log(`    📝 ${pkg.description.substring(0, 70)}${pkg.description.length > 70 ? '...' : ''}`);
      }
      console.log('');
    });
  } catch (error) {
    console.error(t('commands.search.failed', { message: error.message }));
  }
}

module.exports = { search };
