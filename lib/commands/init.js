/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { loadLangForCwd, getI18n } = require('../i18n');
const { migrateToYaml, detectConfig } = require('../utils/config');
const features = require('../utils/features');

function init() {
  const cwd = process.cwd();
  const ymlPath = path.join(cwd, 'mip.yml');
  const { t } = getI18n(loadLangForCwd(cwd));
  const mipFeatures = features.loadFeatures(cwd);

  // Проверка включена ли команда
  if (mipFeatures['init.enabled'] === false) {
    console.log('ℹ️ Init command is disabled (init.enabled: false)');
    return;
  }

  // ==========================================
  // ПРОВЕРКА ФЛАГА --template
  // ==========================================
  const templateArgIndex = process.argv.indexOf('--template');
  const shortTemplateArgIndex = process.argv.indexOf('-t');

  if (templateArgIndex !== -1 || shortTemplateArgIndex !== -1) {
    const idx = templateArgIndex !== -1 ? templateArgIndex : shortTemplateArgIndex;
    const templateName = process.argv[idx + 1];
    const projectName = process.argv[idx + 2] || path.basename(cwd);

    if (!templateName) {
      console.log('Usage: mip init --template <template> <name>');
      console.log('Templates: node, react, cli, express');
      console.log('');
      console.log('Example: mip init --template react my-app');
      return;
    }

    // Делегируем create
    const { create } = require('./create');
    create(templateName, projectName);
    return;
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    🚀 MIP INIT STARTED 🚀                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // Проверяем, есть ли уже mip.yml
  if (fs.existsSync(ymlPath)) {
    console.log('⚠️  mip.yml already exists');
    return;
  }

  // Проверяем, есть ли старый mip.json или package.json - мигрируем
  const existing = detectConfig(cwd);
  if (existing) {
    console.log('📦 Found existing config file, migrating to mip.yml...');
    const migratedPath = migrateToYaml(cwd);
    if (migratedPath) {
      console.log(`✅ Migrated to ${migratedPath}`);
      console.log('💡 Old file saved as .backup');
    }
    return;
  }

  console.log('📋 Step 1/4: Creating mip.yml...');

  // Получаем язык из фич или дефолт
  const language = mipFeatures['i18n.language'] || 'en';

  const config = {
    name: path.basename(cwd),
    version: '1.0.0',
    language: language,
    dependencies: {},
    devDependencies: {},
    scripts: mipFeatures['init.defaultScripts'] !== false ? {
      start: 'node index.js',
      test: 'echo "Error: no test specified" && exit 1'
    } : {},
    workspaces: []
  };

  fs.writeFileSync(ymlPath, yaml.dump(config, { indent: 2 }));
  console.log('  ✅ mip.yml created');
  console.log(`     📄 Path: ${ymlPath}`);
  console.log(`     📦 Name: ${config.name}`);
  console.log(`     🔢 Version: ${config.version}`);

  console.log('');
  console.log('📂 Step 2/4: Creating .mip directory...');

  const mipDir = path.join(cwd, '.mip');
  fs.mkdirSync(mipDir, { recursive: true });
  console.log('  ✅ .mip directory created');
  console.log(`     📁 Path: ${mipDir}`);

  console.log('');
  console.log('🔧 Step 3/4: Setting up directory structure...');

  const packagesDir = path.join(mipDir, 'packages');
  const cacheDir = path.join(mipDir, 'cache');
  const tempDir = path.join(mipDir, 'temp');

  fs.mkdirSync(packagesDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('  ✅ Packages directory: .mip/packages/');
  console.log('  ✅ Cache directory: .mip/cache/');
  console.log('  ✅ Temp directory: .mip/temp/');

  console.log('');
  console.log('🔐 Step 4/4: Checking system compatibility...');

  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1));
  console.log(`  ✅ Node.js version: ${nodeVersion}`);
  if (nodeMajor < 14) {
    console.log(`  ⚠️  Warning: Node.js ${nodeVersion} (recommended: v18+)`);
  }

  try {
    const testFile = path.join(cwd, '.mip', '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('  ✅ Write permissions: OK');
  } catch {
    console.log('  ⚠️  Write permissions: LIMITED');
  }

  // Проверка на наличие index.js
  if (mipFeatures['init.checkIndexFile'] !== false) {
    const indexFile = path.join(cwd, 'index.js');
    if (!fs.existsSync(indexFile)) {
      console.log('  ℹ️  No index.js found, creating default...');
      const defaultIndex = `// MIP project: ${config.name}
console.log('Hello from MIP!');`;
      fs.writeFileSync(indexFile, defaultIndex, 'utf8');
      console.log('  ✅ Created index.js');
    }
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║              ✅ MIP PROJECT INITIALIZED! ✅                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   📁 Project: ${config.name}`);
  console.log(`   📂 Location: ${cwd}`);
  console.log('   🗂️  Structure: .mip/ (cache + packages + temp)');
  console.log('   📄 Config: mip.yml');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1️⃣  Install packages:  mip install express');
  console.log('   2️⃣  Run scripts:       mip run start');
  console.log('   3️⃣  List packages:     mip list');
  console.log('   4️⃣  Check outdated:    mip outdated');
  console.log('   5️⃣  Security audit:    mip audit');
  console.log('');
  console.log('📚 More commands: mip --help');
  console.log('');
}

module.exports = { init };