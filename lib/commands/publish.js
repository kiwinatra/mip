/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const axios = require('axios');
const yaml = require('js-yaml');
const chalk = require('chalk');
const config = require('../utils/config');
const features = require('../utils/features');
const registry = require('./registry');

/**
 * Команда для публикации пакетов в реестры
 * mip publish [options]
 * mip publish --registry npm
 * mip publish --registry github
 */
async function publish(argv) {
  const options = parseOptions(argv);
  const pkgInfo = loadPackageInfo();

  if (!pkgInfo) {
    console.log(chalk.red('❌ No package.json or mip.yml found'));
    console.log(chalk.gray('   Run "mip init" first'));
    process.exit(1);
  }

  // Определяем реестр
  const registryName = options.registry || getDefaultRegistry();
  const registryConfig = getRegistryConfig(registryName);

  if (!registryConfig) {
    console.log(chalk.red(`❌ Registry "${registryName}" not configured`));
    console.log(chalk.gray(`   Add it with: mip registry add ${registryName} <url>`));
    process.exit(1);
  }

  console.log(chalk.blue(`📦 Publishing ${pkgInfo.name}@${pkgInfo.version}`));
  console.log(chalk.gray(`   → ${registryName}: ${registryConfig.url}`));

  // Проверяем, существует ли пакет в реестре
  const exists = await checkPackageExists(pkgInfo.name, registryConfig);

  if (exists && !options.force) {
    console.log(chalk.yellow(`⚠️ Package ${pkgInfo.name} already exists in ${registryName}`));
    console.log(chalk.gray('   Use --force to override'));
    process.exit(1);
  }

  // Собираем пакет если нужно
  if (options.build) {
    console.log(chalk.gray('🔨 Building package...'));
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (e) {
      console.log(chalk.red('❌ Build failed'));
      process.exit(1);
    }
  }

  // Публикуем в зависимости от типа реестра
  try {
    await publishToRegistry(pkgInfo, registryConfig, registryName, options);
    console.log(chalk.green(`✅ Published ${pkgInfo.name}@${pkgInfo.version} to ${registryName}`));
  } catch (error) {
    console.log(chalk.red(`❌ Failed to publish: ${error.message}`));
    if (process.env.DEBUG) console.error(error);
    process.exit(1);
  }
}

/**
 * Парсинг опций командной строки
 */
function parseOptions(argv) {
  return {
    registry: getArgValue(argv, '--registry', '-r'),
    tag: getArgValue(argv, '--tag', '-t') || 'latest',
    build: argv.includes('--build') || argv.includes('-b'),
    force: argv.includes('--force') || argv.includes('-f'),
    dryRun: argv.includes('--dry-run') || argv.includes('-d'),
    access: getArgValue(argv, '--access', '-a') || 'public'
  };
}

/**
 * Получение значения аргумента
 */
function getArgValue(argv, long, short) {
  const index = argv.indexOf(long) !== -1 ? argv.indexOf(long) : argv.indexOf(short);
  if (index !== -1 && argv[index + 1]) {
    return argv[index + 1];
  }
  return null;
}

/**
 * Загрузка информации о пакете
 */
function loadPackageInfo() {
  // Проверяем mip.yml
  const mipYmlPath = path.join(process.cwd(), 'mip.yml');
  if (fs.existsSync(mipYmlPath)) {
    try {
      const data = yaml.load(fs.readFileSync(mipYmlPath, 'utf8'));
      return {
        name: data.name,
        version: data.version,
        description: data.description || '',
        main: data.main || 'index.js',
        files: data.files || [],
        dependencies: data.dependencies || {},
        devDependencies: data.devDependencies || {},
        scripts: data.scripts || {},
        registry: data.registry || 'npm',
        peerDependencies: data.peerDependencies || {},
        repository: data.repository || null
      };
    } catch (e) {}
  }

  // Проверяем package.json
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (e) {}
  }

  return null;
}

/**
 * Получение реестра по умолчанию
 */
function getDefaultRegistry() {
  const conf = config.readConfig(process.cwd());
  if (conf && conf.defaultRegistry) {
    return conf.defaultRegistry;
  }

  const featuresConfig = features.loadFeatures(process.cwd());
  if (featuresConfig['registry.default']) {
    return featuresConfig['registry.default'];
  }

  return 'npm';
}

/**
 * Получение конфигурации реестра
 */
function getRegistryConfig(name) {
  if (name === 'npm') {
    return {
      url: 'https://registry.npmjs.org/',
      type: 'npm',
      token: process.env.NPM_TOKEN || null
    };
  }

  // Получаем токен из глобального хранилища
  const token = registry.getRegistryToken(name);
  const url = registry.getRegistryUrl(name);

  if (!url) return null;

  // Определяем тип реестра по URL
  let type = 'custom';
  if (url.includes('npm.pkg.github.com')) type = 'github';
  else if (url.includes('gitlab.com')) type = 'gitlab';
  else if (url.includes('jfrog.io')) type = 'artifactory';
  else if (url.includes('pkgs.dev.azure.com')) type = 'azure';
  
  return {
    url: url,
    type: type,
    token: token || process.env[`${name.toUpperCase()}_TOKEN`] || null,
    name: name
  };
}

/**
 * Проверка существования пакета в реестре
 */
async function checkPackageExists(name, registryConfig) {
  try {
    // Для npm используем специальный эндпоинт
    if (registryConfig.type === 'npm') {
      const response = await axios.get(`https://registry.npmjs.org/${name}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      return response.status === 200;
    }

    // Для GitHub Packages
    if (registryConfig.type === 'github') {
      const response = await axios.get(`${registryConfig.url}${name}`, {
        timeout: 5000,
        validateStatus: () => true,
        headers: registryConfig.token ? {
          'Authorization': `Bearer ${registryConfig.token}`
        } : {}
      });
      return response.status === 200;
    }

    // Для остальных реестров
    const response = await axios.get(`${registryConfig.url}${name}`, {
      timeout: 5000,
      validateStatus: () => true
    });
    return response.status === 200;
  } catch (e) {
    return false;
  }
}

/**
 * Публикация в реестр
 */
async function publishToRegistry(pkgInfo, registryConfig, registryName, options) {
  if (options.dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN - No changes made'));
    console.log(chalk.gray(`   Would publish: ${pkgInfo.name}@${pkgInfo.version}`));
    console.log(chalk.gray(`   Registry: ${registryName} (${registryConfig.url})`));
    console.log(chalk.gray(`   Tag: ${options.tag}`));
    console.log(chalk.gray(`   Access: ${options.access}`));
    return;
  }

  // Создаём tarball
  const tarball = createTarball(pkgInfo);
  if (!tarball) {
    throw new Error('Failed to create tarball');
  }

  // Отправляем в реестр
  switch (registryConfig.type) {
    case 'github':
      await publishToGitHub(pkgInfo, registryConfig, tarball, options);
      break;
    case 'gitlab':
      await publishToGitLab(pkgInfo, registryConfig, tarball, options);
      break;
    case 'custom':
      await publishToCustomRegistry(pkgInfo, registryConfig, tarball, options);
      break;
    case 'npm':
    default:
      await publishToNpm(pkgInfo, registryConfig, tarball, options);
  }

  // Удаляем временный tarball
  if (fs.existsSync(tarball)) {
    fs.unlinkSync(tarball);
  }
}

/**
 * Создание tarball
 */
function createTarball(pkgInfo) {
  // Заменяем / на - в имени пакета для безопасного имени файла
  const safeName = pkgInfo.name.replace('/', '-');
  const tarballName = `${safeName}-${pkgInfo.version}.tgz`;
  const tarballPath = path.join(os.tmpdir(), tarballName);
  
  try {
    // Создаём временную директорию
    const tmpDir = path.join(os.tmpdir(), 'mip-publish-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    // Копируем файлы
    const filesToPack = getFilesToPack(pkgInfo);
    for (const file of filesToPack) {
      const src = path.join(process.cwd(), file);
      const dest = path.join(tmpDir, file);
      
      if (fs.existsSync(src)) {
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
          // Копируем директорию рекурсивно
          copyDirectory(src, dest);
        } else {
          // Копируем файл
          const destDir = path.dirname(dest);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          fs.copyFileSync(src, dest);
        }
      }
    }

    // Создаём package.json для публикации
    const pkgJson = {
      name: pkgInfo.name,
      version: pkgInfo.version,
      description: pkgInfo.description,
      main: pkgInfo.main,
      files: pkgInfo.files,
      dependencies: pkgInfo.dependencies,
      scripts: pkgInfo.scripts,
      peerDependencies: pkgInfo.peerDependencies || {},
      repository: pkgInfo.repository
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

    // Создаём tarball
    execSync(`cd ${tmpDir} && tar -czf ${tarballPath} .`, { stdio: 'pipe' });

    // Очищаем
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return tarballPath;
  } catch (error) {
    console.log(chalk.red(`❌ Failed to create tarball: ${error.message}`));
    if (process.env.DEBUG) console.error(error);
    return null;
  }
}

/**
 * Рекурсивное копирование директории
 */
function copyDirectory(src, dest) {
  // Создаём целевую директорию
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Читаем содержимое исходной директории
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Рекурсивно копируем поддиректорию
      copyDirectory(srcPath, destPath);
    } else {
      // Копируем файл
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Получение списка файлов для упаковки
 */
function getFilesToPack(pkgInfo) {
  const defaultFiles = ['package.json', 'README.md', 'LICENSE', 'index.js', 'lib', 'src', 'dist'];
  const files = pkgInfo.files && pkgInfo.files.length > 0 ? pkgInfo.files : defaultFiles;
  
  // Нормализуем пути: убираем косую черту в конце
  const normalized = files
    .map(file => {
      // Убираем слеши в начале и конце
      let clean = file.replace(/^\/+/, '').replace(/\/+$/, '');
      return clean;
    })
    .filter(file => file.length > 0);
  
  // Фильтруем только существующие файлы
  const result = normalized.filter(file => {
    const fullPath = path.join(process.cwd(), file);
    return fs.existsSync(fullPath);
  });
  
  if (process.env.DEBUG) {
    console.log('[DEBUG] Files to pack:', result);
  }
  
  return result;
}

/**
 * Публикация в npm
 */
async function publishToNpm(pkgInfo, registryConfig, tarball, options) {
  console.log(chalk.gray('📤 Uploading to npm registry...'));

  try {
    let npmCmd = `npm publish ${tarball} --registry ${registryConfig.url}`;
    
    if (options.tag && options.tag !== 'latest') {
      npmCmd += ` --tag ${options.tag}`;
    }
    
    if (options.access) {
      npmCmd += ` --access ${options.access}`;
    }

    execSync(npmCmd, { stdio: 'inherit' });
  } catch (e) {
    throw new Error(`npm publish failed: ${e.message}`);
  }
}

/**
 * Публикация в GitHub Packages
 */
async function publishToGitHub(pkgInfo, registryConfig, tarball, options) {
  if (!registryConfig.token) {
    throw new Error('GitHub token required. Set token in registry config or GITHUB_TOKEN env');
  }

  console.log(chalk.gray('📤 Uploading to GitHub Packages...'));

  try {
    // Создаём временный .npmrc для GitHub
    const npmrcPath = path.join(os.tmpdir(), '.npmrc-github');
    const npmrc = `
//npm.pkg.github.com/:_authToken=${registryConfig.token}
registry=https://npm.pkg.github.com/
`;
    fs.writeFileSync(npmrcPath, npmrc);

    let npmCmd = `npm publish ${tarball} --registry ${registryConfig.url} --userconfig ${npmrcPath}`;
    
    if (options.tag && options.tag !== 'latest') {
      npmCmd += ` --tag ${options.tag}`;
    }
    
    if (options.access) {
      npmCmd += ` --access ${options.access}`;
    }

    execSync(npmCmd, { stdio: 'inherit' });
    fs.unlinkSync(npmrcPath);
  } catch (e) {
    throw new Error(`GitHub publish failed: ${e.message}`);
  }
}

/**
 * Публикация в GitLab Registry
 */
async function publishToGitLab(pkgInfo, registryConfig, tarball, options) {
  if (!registryConfig.token) {
    throw new Error('GitLab token required. Set token in registry config or GITLAB_TOKEN env');
  }

  console.log(chalk.gray('📤 Uploading to GitLab Registry...'));

  try {
    // Создаём временный .npmrc для GitLab
    const npmrcPath = path.join(os.tmpdir(), '.npmrc-gitlab');
    const registryUrl = registryConfig.url.replace(/^https?:\/\//, '');
    const npmrc = `
//${registryUrl}:_authToken=${registryConfig.token}
registry=${registryConfig.url}
`;
    fs.writeFileSync(npmrcPath, npmrc);

    let npmCmd = `npm publish ${tarball} --registry ${registryConfig.url} --userconfig ${npmrcPath}`;
    
    if (options.tag && options.tag !== 'latest') {
      npmCmd += ` --tag ${options.tag}`;
    }

    execSync(npmCmd, { stdio: 'inherit' });
    fs.unlinkSync(npmrcPath);
  } catch (e) {
    throw new Error(`GitLab publish failed: ${e.message}`);
  }
}

/**
 * Публикация в кастомный реестр (Verdaccio, Artifactory, etc.)
 */
async function publishToCustomRegistry(pkgInfo, registryConfig, tarball, options) {
  console.log(chalk.gray(`📤 Uploading to custom registry: ${registryConfig.url}`));

  try {
    let npmCmd = `npm publish ${tarball} --registry ${registryConfig.url}`;
    
    if (registryConfig.token) {
      // Создаём временный .npmrc с токеном
      const npmrcPath = path.join(os.tmpdir(), '.npmrc-custom');
      const registryUrl = registryConfig.url.replace(/^https?:\/\//, '');
      const npmrc = `
//${registryUrl}:_authToken=${registryConfig.token}
registry=${registryConfig.url}
`;
      fs.writeFileSync(npmrcPath, npmrc);
      npmCmd += ` --userconfig ${npmrcPath}`;
      
      execSync(npmCmd, { stdio: 'inherit' });
      fs.unlinkSync(npmrcPath);
    } else {
      execSync(npmCmd, { stdio: 'inherit' });
    }
  } catch (e) {
    throw new Error(`Custom registry publish failed: ${e.message}`);
  }
}

/**
 * Показать справку
 */
function showHelp() {
  console.log(`
${chalk.blue('📦 mip publish - Publish packages to registry')}

${chalk.bold('USAGE')}
  mip publish [options]

${chalk.bold('OPTIONS')}
  -r, --registry <name>   Registry to publish to (default: npm)
  -t, --tag <tag>         Tag for the package (default: latest)
  -b, --build             Run build script before publish
  -f, --force             Override existing package
  -d, --dry-run           Preview what will be published
  -a, --access <public|restricted>  Package access (default: public)

${chalk.bold('EXAMPLES')}
  ${chalk.gray('# Publish to npm')}
  mip publish

  ${chalk.gray('# Publish to GitHub Packages')}
  mip publish --registry github

  ${chalk.gray('# Publish with build and tag')}
  mip publish --build --tag beta

  ${chalk.gray('# Dry run')}
  mip publish --dry-run

  ${chalk.gray('# Force publish')}
  mip publish --force

${chalk.bold('REGISTRIES')}
  npm       - npm registry (default)
  github    - GitHub Packages
  gitlab    - GitLab Registry
  custom    - Custom registry (Verdaccio, Artifactory, etc.)

${chalk.bold('AUTHENTICATION')}
  npm    - NPM_TOKEN environment variable
  github - GitHub token from ~/.mip/registry.yml or GITHUB_TOKEN env
  gitlab - GitLab token from ~/.mip/registry.yml or GITLAB_TOKEN env
  custom - Registry token from ~/.mip/registry.yml

${chalk.bold('CONFIGURATION')}
  Add registry: mip registry add <name> <url> --token <token>
  Set default:  mip registry set-default <name>
`);
}

module.exports = { publish };