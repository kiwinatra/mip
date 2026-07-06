/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

/**
 * Команда для сборки проекта в один файл
 * mip bundle <entry> [options]
 * 
 * Пример: mip bundle index.js -o dist/bundle.js
 */
async function bundle(argv) {
  const options = parseOptions(argv);
  
  // Проверяем наличие esbuild
  if (!hasEsbuild()) {
    console.log(chalk.yellow('⚠️ esbuild not found, installing...'));
    try {
      execSync('npm install esbuild --save-dev', { stdio: 'inherit' });
    } catch (e) {
      console.log(chalk.red('❌ Failed to install esbuild'));
      console.log(chalk.gray('   Please install manually: npm install esbuild --save-dev'));
      process.exit(1);
    }
  }

  const esbuild = require('esbuild');

  // Определяем entry point
  const entry = options.entry || 'index.js';
  if (!fs.existsSync(entry)) {
    console.log(chalk.red(`❌ Entry file not found: ${entry}`));
    process.exit(1);
  }

  // Определяем output
  const outfile = options.outfile || 'dist/bundle.js';
  const outdir = path.dirname(outfile);
  
  // Создаём папку для вывода
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  console.log(chalk.blue(`📦 Bundling ${entry} → ${outfile}`));
  console.log(chalk.gray(`   Platform: ${options.platform}`));
  console.log(chalk.gray(`   Target: ${options.target}`));
  if (options.minify) console.log(chalk.gray(`   Minify: enabled`));
  if (options.sourcemap) console.log(chalk.gray(`   Sourcemap: enabled`));
  console.log('');

  const startTime = Date.now();

  try {
    // Сборка
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: options.platform || 'node',
      target: options.target || 'node18',
      outfile: outfile,
      minify: options.minify || false,
      sourcemap: options.sourcemap || false,
      external: options.external || [],
      format: options.format || 'cjs',
      mainFields: ['module', 'main'],
      banner: {
        js: '#!/usr/bin/env node\n'
      },
      metafile: true,
      logLevel: 'info',
      loader: {
        '.node': 'file'
      }
    });

    const duration = Date.now() - startTime;
    const stats = getStats(result.metafile);

    console.log('');
    console.log(chalk.green(`✅ Bundle complete in ${duration}ms`));
    console.log(chalk.gray(`   Output: ${outfile}`));
    console.log(chalk.gray(`   Size: ${stats.totalSize}`));
    console.log(chalk.gray(`   Modules: ${stats.totalModules}`));
    
    if (options.analyze) {
      console.log('');
      console.log(chalk.blue('📊 Bundle analysis:'));
      console.log(chalk.gray('   ─────────────────────────────'));
      const sorted = Object.entries(result.metafile.inputs)
        .sort((a, b) => b[1].bytes - a[1].bytes)
        .slice(0, 10);
      
      for (const [file, info] of sorted) {
        const size = formatSize(info.bytes);
        console.log(chalk.gray(`   ${size}  ${path.basename(file)}`));
      }
    }

  } catch (error) {
    console.log(chalk.red('❌ Bundle failed:'));
    console.log(chalk.red(error.message));
    process.exit(1);
  }
}

/**
 * Парсинг опций командной строки
 */
function parseOptions(argv) {
  const options = {
    entry: null,
    outfile: 'dist/bundle.js',
    platform: 'node',
    target: 'node18',
    minify: false,
    sourcemap: false,
    external: [],
    format: 'cjs',
    analyze: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '-o' || arg === '--outfile') {
      options.outfile = argv[++i];
    } else if (arg === '--platform') {
      options.platform = argv[++i];
    } else if (arg === '--target') {
      options.target = argv[++i];
    } else if (arg === '--minify' || arg === '-m') {
      options.minify = true;
    } else if (arg === '--sourcemap' || arg === '-s') {
      options.sourcemap = true;
    } else if (arg === '--format') {
      options.format = argv[++i];
    } else if (arg === '--external') {
      options.external.push(argv[++i]);
    } else if (arg === '--analyze' || arg === '-a') {
      options.analyze = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.entry = arg;
    }
  }

  return options;
}

/**
 * Проверка наличия esbuild
 */
function hasEsbuild() {
  try {
    require.resolve('esbuild');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Получение статистики
 */
function getStats(metafile) {
  const inputs = metafile.inputs || {};
  let totalBytes = 0;
  let totalModules = Object.keys(inputs).length;

  for (const [file, info] of Object.entries(inputs)) {
    totalBytes += info.bytes || 0;
  }

  return {
    totalSize: formatSize(totalBytes),
    totalModules: totalModules
  };
}

/**
 * Форматирование размера
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Показать справку
 */
function showHelp() {
  console.log(`
${chalk.blue('📦 mip bundle - Bundle project into a single file')}

${chalk.bold('USAGE')}
  mip bundle <entry> [options]

${chalk.bold('OPTIONS')}
  -o, --outfile <file>   Output file (default: dist/bundle.js)
  --platform <platform>  Platform: node | browser | neutral (default: node)
  --target <target>      Target environment (default: node18)
  -m, --minify           Minify output
  -s, --sourcemap        Generate sourcemap
  --format <format>      Output format: cjs | esm | iife (default: cjs)
  --external <pkg>       External package (can be used multiple times)
  -a, --analyze          Show bundle analysis
  -h, --help             Show this help

${chalk.bold('EXAMPLES')}
  ${chalk.gray('# Basic bundle')}
  mip bundle index.js

  ${chalk.gray('# Bundle with custom output')}
  mip bundle src/index.js -o dist/app.js

  ${chalk.gray('# Bundle for browser')}
  mip bundle src/index.js --platform browser --format iife

  ${chalk.gray('# Bundle with minification')}
  mip bundle index.js --minify

  ${chalk.gray('# Bundle with analysis')}
  mip bundle index.js --analyze

${chalk.bold('REQUIREMENTS')}
  esbuild is required. If not installed, MIP will install it automatically.
`);
}

module.exports = { bundle };