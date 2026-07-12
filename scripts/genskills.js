#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Игнорируемые директории и файлы
const IGNORED_DIRS = [
  'node_modules',
  '.mip',
  '.git',
  'build',
  'dist',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'tmp',
  'temp',
  '.vscode',
  '.idea',
  '__pycache__',
  '.pytest_cache'
];

const IGNORED_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'thumbs.db',
  'desktop.ini'
];

// Известные файлы и их описания
const KNOWN_FILES = {
  // Системные файлы
  '.dockerignore': 'Docker ignore file - specifies which files to exclude from Docker builds',
  '.editorconfig': 'EditorConfig configuration - maintains consistent coding styles',
  '.env': 'Environment variables configuration file',
  '.env.example': 'Example environment variables template',
  '.eslintrc': 'ESLint configuration - JavaScript linting rules',
  '.eslintrc.js': 'ESLint configuration (JavaScript) - JavaScript linting rules',
  '.eslintrc.json': 'ESLint configuration (JSON) - JavaScript linting rules',
  '.gitattributes': 'Git attributes - defines attributes for pathnames',
  '.gitignore': 'Git ignore file - specifies intentionally untracked files',
  '.gitmodules': 'Git submodules configuration',
  '.gkitignore': 'GKit ignore file - specifies files to ignore in GKit builds',
  '.mipattributes': 'MIP attributes configuration',
  '.mipignore': 'MIP ignore file - specifies files to ignore in MIP builds',
  '.npmignore': 'NPM ignore file - specifies files to exclude from npm package',
  '.prettierrc': 'Prettier configuration - code formatter settings',
  '.prettierrc.js': 'Prettier configuration (JavaScript) - code formatter settings',
  
  // Файлы документации
  'AUTHORS': 'List of project authors/contributors',
  'CHANGELOG': 'Project changelog - records all notable changes',
  'CHANGELOG.md': 'Project changelog (Markdown) - records all notable changes',
  'CONTRIBUTING': 'Contributing guidelines for the project',
  'CONTRIBUTING.md': 'Contributing guidelines (Markdown) for the project',
  'LICENSE': 'Project license file',
  'LICENSE.md': 'Project license file (Markdown)',
  'README': 'Project README - main documentation file',
  'README.md': 'Project README (Markdown) - main documentation file',
  'README.MD': 'Project README (Markdown) - main documentation file',
  
  // Конфигурационные файлы
  'Dockerfile': 'Docker configuration file - defines how to build the Docker image',
  'Makefile': 'Make build automation file - defines build tasks and rules',
  'CMakeLists.txt': 'CMake build configuration file',
  
  // CI/CD и деплоймент
  '.github/workflows/ci.yml': 'GitHub Actions CI workflow - continuous integration configuration',
  '.github/workflows/deploy.yml': 'GitHub Actions deploy workflow - deployment configuration',
  '.github/workflows/npm-publish.yml': 'GitHub Actions NPM publish workflow - publishes package to NPM',
  '.github/workflows/npm-publish-github-packages.yml': 'GitHub Actions NPM publish workflow - publishes package to GitHub Packages',
  '.gitlab-ci.yml': 'GitLab CI/CD configuration file',
  '.travis.yml': 'Travis CI configuration file',
  
  // Конфигурация проектов
  'package.json': 'NPM package configuration - defines dependencies and scripts',
  'tsconfig.json': 'TypeScript configuration file',
  'tsconfig.build.json': 'TypeScript build configuration',
  'webpack.config.js': 'Webpack configuration - module bundler settings',
  'webpack.config.ts': 'Webpack configuration (TypeScript) - module bundler settings',
  'vite.config.js': 'Vite configuration - build tool settings',
  'vite.config.ts': 'Vite configuration (TypeScript) - build tool settings',
  'rollup.config.js': 'Rollup configuration - module bundler settings',
  'jest.config.js': 'Jest testing framework configuration',
  'jest.config.ts': 'Jest testing framework configuration (TypeScript)',
  'babel.config.js': 'Babel configuration - JavaScript compiler settings',
  '.babelrc': 'Babel configuration - JavaScript compiler settings',
  
  // Другие известные файлы
  'Procfile': 'Process file - defines application processes for deployment',
  'nginx.conf': 'Nginx web server configuration',
  'docker-compose.yml': 'Docker Compose configuration - defines multi-container Docker applications',
  'docker-compose.yaml': 'Docker Compose configuration - defines multi-container Docker applications'
};

// Получение всех файлов в директории (рекурсивно)
function getAllFiles(dirPath, basePath = dirPath) {
  const files = [];
  
  function traverse(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(basePath, fullPath);
        
        // Проверяем, не игнорируется ли директория
        if (stat.isDirectory()) {
          const dirName = path.basename(fullPath);
          if (IGNORED_DIRS.includes(dirName)) {
            continue;
          }
          traverse(fullPath);
        } else {
          // Проверяем, не игнорируется ли файл
          if (IGNORED_FILES.includes(item)) {
            continue;
          }
          // Игнорируем бинарные файлы
          const ext = path.extname(item).toLowerCase();
          const binaryExts = ['.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz'];
          if (binaryExts.includes(ext)) {
            continue;
          }
          files.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`[skills-files] Error reading directory ${currentPath}: ${err.message}`);
    }
  }
  
  traverse(dirPath);
  return files;
}

// Проверка, является ли файл известным
function isKnownFile(filePath) {
  return KNOWN_FILES[filePath] !== undefined;
}

// Получение описания для известного файла
function getKnownFileDescription(filePath) {
  return KNOWN_FILES[filePath] || null;
}

// Генерация содержимого FILESKILLS.md
function generateMarkdown(dirPath, descriptions, knownDescriptions, allFiles) {
  let markdown = `# FILESKILLS.md\n\n`;
  markdown += `> **USE THIS LIST FOR FAST UNDERSTAND WHAT THE FILE IS FOR.**\n\n`;
  markdown += `> **PATH = usage**\n\n`;
  
  // Объединяем все описания
  const allDescriptions = { ...knownDescriptions, ...descriptions };
  
  if (Object.keys(allDescriptions).length === 0) {
    markdown += `*No files were documented.*\n\n`;
    return markdown;
  }
  
  markdown += `## 📋 File Descriptions\n\n`;
  
  // Группируем файлы по директориям для удобства
  const groupedFiles = {};
  
  for (const [filePath, description] of Object.entries(allDescriptions)) {
    const dirName = path.dirname(filePath);
    if (!groupedFiles[dirName]) {
      groupedFiles[dirName] = [];
    }
    groupedFiles[dirName].push({ 
      file: path.basename(filePath), 
      description,
      isKnown: knownDescriptions[filePath] !== undefined
    });
  }

  // Сортируем директории
  const sortedDirs = Object.keys(groupedFiles).sort();
  
  for (const dir of sortedDirs) {
    if (dir !== '.') {
      markdown += `### 📁 ${dir}/\n\n`;
    } else {
      markdown += `### 📁 Root Directory\n\n`;
    }
    
    const files = groupedFiles[dir].sort((a, b) => a.file.localeCompare(b.file));
    
    for (const { file, description, isKnown } of files) {
      const fullPath = dir === '.' ? file : `${dir}/${file}`;
      const icon = isKnown ? '🔍 ' : '📝 ';
      markdown += `- ${icon}**\`${fullPath}\`** = ${description}\n`;
    }
    markdown += `\n`;
  }

  // Добавляем информацию о файлах, которые были пропущены (неизвестные и без описания)
  const relativeAllFiles = allFiles.map(f => path.relative(dirPath, f));
  const documentedFiles = Object.keys(allDescriptions);
  const skippedFiles = relativeAllFiles.filter(f => !documentedFiles.includes(f));

  if (skippedFiles.length > 0) {
    markdown += `## ⏭️ Skipped Files (no description provided)\n\n`;
    markdown += `*These files were not automatically recognized and you skipped them:*\n\n`;
    
    // Группируем пропущенные файлы по директориям
    const skippedGrouped = {};
    for (const file of skippedFiles) {
      const dir = path.dirname(file);
      if (!skippedGrouped[dir]) {
        skippedGrouped[dir] = [];
      }
      skippedGrouped[dir].push(file);
    }
    
    const sortedSkippedDirs = Object.keys(skippedGrouped).sort();
    for (const dir of sortedSkippedDirs) {
      const displayDir = dir === '.' ? 'Root' : dir;
      markdown += `### ${displayDir}\n`;
      for (const file of skippedGrouped[dir].sort()) {
        markdown += `- \`${file}\`\n`;
      }
      markdown += `\n`;
    }
  }

  // Добавляем статистику
  markdown += `## 📊 Statistics\n\n`;
  markdown += `- **Total files scanned:** ${allFiles.length}\n`;
  markdown += `- **Files automatically recognized:** ${Object.keys(knownDescriptions).length}\n`;
  markdown += `- **Files manually documented:** ${Object.keys(descriptions).length}\n`;
  markdown += `- **Files skipped:** ${skippedFiles.length}\n`;
  markdown += `\n`;

  markdown += `---\n`;
  markdown += `*Generated by skills-files script*\n`;
  markdown += `*Path: ${dirPath}*\n`;
  markdown += `*Generated: ${new Date().toLocaleString()}*\n`;
  
  return markdown;
}

// Функция для интерактивного опроса
async function askQuestions(files, dirPath) {
  const fileDescriptions = {};
  const knownFiles = [];
  const unknownFiles = [];
  
  // Разделяем известные и неизвестные файлы
  for (const file of files) {
    const relativePath = path.relative(dirPath, file);
    if (isKnownFile(relativePath)) {
      knownFiles.push(file);
    } else {
      unknownFiles.push(file);
    }
  }
  
  console.log(`\n📝 Starting interactive documentation...\n`);
  console.log(`🔍 ${knownFiles.length} files will be automatically documented`);
  console.log(`❓ ${unknownFiles.length} files require your input\n`);
  
  // Создаем интерфейс для ввода с консоли
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Функция для опроса каждого неизвестного файла
  const askQuestion = (file) => {
    return new Promise((resolve) => {
      const relativePath = path.relative(dirPath, file);
      rl.question(`❓ What is ${relativePath} for? (press Enter to skip): `, (answer) => {
        if (answer.trim()) {
          fileDescriptions[relativePath] = answer.trim();
        }
        resolve();
      });
    });
  };

  // Опрашиваем только неизвестные файлы
  for (let i = 0; i < unknownFiles.length; i++) {
    const file = unknownFiles[i];
    const relativePath = path.relative(dirPath, file);
    console.log(`\n[${i + 1}/${unknownFiles.length}]`);
    await askQuestion(file);
  }

  rl.close();
  return fileDescriptions;
}

// Основная функция
async function createFileDocumentation(dirPath) {
  // Проверяем существование директории
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ Directory not found: ${dirPath}`);
    process.exit(1);
  }

  if (!fs.statSync(dirPath).isDirectory()) {
    console.error(`❌ Path is not a directory: ${dirPath}`);
    process.exit(1);
  }

  console.log(`\n🔍 Scanning directory: ${dirPath}`);
  console.log(`📁 Getting list of files...`);
  
  const allFiles = getAllFiles(dirPath);
  console.log(`✅ Found ${allFiles.length} files to document\n`);
  
  if (allFiles.length === 0) {
    console.log(`⚠️  No files found to document.`);
    return;
  }

  // Собираем известные файлы и их описания
  const knownDescriptions = {};
  let knownCount = 0;
  for (const file of allFiles) {
    const relativePath = path.relative(dirPath, file);
    const knownDesc = getKnownFileDescription(relativePath);
    if (knownDesc) {
      knownDescriptions[relativePath] = knownDesc;
      knownCount++;
    }
  }
  
  console.log(`🔍 Automatically recognized ${knownCount} known files`);
  
  // Опрашиваем пользователя только о неизвестных файлах
  const userDescriptions = await askQuestions(allFiles, dirPath);

  // Генерируем FILESKILLS.md
  const outputPath = path.join(dirPath, 'FILESKILLS.md');
  const content = generateMarkdown(
    dirPath, 
    userDescriptions, 
    knownDescriptions, 
    allFiles
  );
  
  try {
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`\n✅ FILESKILLS.md created successfully at: ${outputPath}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Automatically recognized: ${Object.keys(knownDescriptions).length} files`);
    console.log(`   - Manually documented: ${Object.keys(userDescriptions).length} files`);
    console.log(`   - Skipped: ${allFiles.length - Object.keys(knownDescriptions).length - Object.keys(userDescriptions).length} files`);
  } catch (err) {
    console.error(`❌ Error writing file: ${err.message}`);
    process.exit(1);
  }
}

// Парсинг аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 Skills-Files Documentation Generator

Usage:
  node skills-files.js [directory]

Arguments:
  directory    Path to the directory to document (default: current directory)

Options:
  --help, -h   Show this help message

Features:
  🔍 Automatically recognizes and documents common files:
     - System files (.gitignore, .dockerignore, etc.)
     - Documentation files (README, LICENSE, CHANGELOG, etc.)
     - Configuration files (package.json, webpack.config.js, etc.)
     - CI/CD files (.github/workflows/*.yml, etc.)
  
  ❓ Only asks about unknown files

Examples:
  node skills-files.js ./my-project
  node skills-files.js
  node skills-files.js --help
`);
    process.exit(0);
  }
  
  const dirPath = args[0] || process.cwd();
  return { dirPath };
}

// Запуск
async function main() {
  try {
    const { dirPath } = parseArgs();
    console.log(`\n🚀 Starting skills-files documentation generator\n`);
    await createFileDocumentation(dirPath);
    console.log(`\n✨ Done!`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

// Запускаем скрипт
if (require.main === module) {
  main();
}

module.exports = {
  getAllFiles,
  generateMarkdown,
  createFileDocumentation,
  KNOWN_FILES,
  isKnownFile
};