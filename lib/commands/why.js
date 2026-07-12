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
const features = require('../utils/features');

// ==========================================
// ЦВЕТА
// ==========================================

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function buildTree(dependents, packageName, depth = 0, visited = new Set()) {
  const mipFeatures = features.loadFeatures(process.cwd());
  const maxDepth = mipFeatures['why.maxDepth'] || 5;
  
  if (depth > maxDepth || visited.has(packageName)) return [];
  visited.add(packageName);

  const result = [];
  const indent = '  '.repeat(depth);

  for (const dep of dependents) {
    const icon = dep.direct ? '📦' : '📁';
    const versionColor = dep.direct ? 'green' : 'gray';
    result.push(
      `${indent}${colorize('└──', 'gray')} ${icon} ${colorize(dep.name, 'bold')}${colorize(
        `@${dep.version}`,
        versionColor
      )} ${colorize(`(requires ${dep.requiredVersion})`, 'gray')}`
    );

    if (dep.children && dep.children.length > 0) {
      const childTree = buildTree(dep.children, dep.name, depth + 1, visited);
      result.push(...childTree);
    }
  }
  return result;
}

async function why(packageName) {
  const cwd = process.cwd();
  const { t } = getI18n(loadLangForCwd(cwd));
  const mipFeatures = features.loadFeatures(cwd);

  // Проверка включен ли why
  if (mipFeatures['why.enabled'] === false) {
    console.log('ℹ️ Why command is disabled (why.enabled: false)');
    return;
  }

  if (!packageName) {
    console.log(t('commands.why.usage'));
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnWhy'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`🔍 Why is "${packageName}" installed? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  // Проверяем lock-файлы (YAML приоритет)
  const yamlLockPath = path.join(cwd, 'mip-lock.yml');
  const jsonLockPath = path.join(cwd, 'mip-lock.json');
  let lockData = null;

  if (fs.existsSync(yamlLockPath)) {
    try {
      lockData = yaml.load(fs.readFileSync(yamlLockPath, 'utf8'));
    } catch {
      // игнорируем
    }
  }

  if (!lockData && fs.existsSync(jsonLockPath)) {
    try {
      lockData = JSON.parse(fs.readFileSync(jsonLockPath, 'utf8'));
    } catch {
      // игнорируем
    }
  }

  if (!lockData) {
    console.log(t('commands.why.install_first'));
    return;
  }

  // Проверяем флаг --tree
  const showTree = process.argv.includes('--tree') || process.argv.includes('-t');
  const showJson = process.argv.includes('--json');

  // Находим сам пакет
  let pkgInfo = null;
  for (const [fullName, info] of Object.entries(lockData.packages || {})) {
    if (fullName.startsWith(packageName + '@')) {
      pkgInfo = { fullName, ...info };
      break;
    }
  }

  // Строим дерево зависимостей
  const dependents = [];
  const directDependents = [];

  // Ищем кто зависит от этого пакета
  for (const [fullName, info] of Object.entries(lockData.packages || {})) {
    if (info.dependencies && info.dependencies[packageName]) {
      const dep = {
        name: fullName,
        version: info.version,
        requiredVersion: info.dependencies[packageName],
        direct: false,
        children: [],
      };
      dependents.push(dep);

      // Проверяем, есть ли этот пакет в mip.yml (прямая зависимость)
      const configPath = path.join(cwd, 'mip.yml');
      if (fs.existsSync(configPath)) {
        try {
          const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
          if (
            (config.dependencies && config.dependencies[fullName.split('@')[0]]) ||
            (config.devDependencies && config.devDependencies[fullName.split('@')[0]])
          ) {
            dep.direct = true;
            directDependents.push(dep);
          }
        } catch {}
      }
    }
  }

  // JSON вывод
  if (showJson) {
    const result = {
      package: packageName,
      info: pkgInfo || null,
      dependents: dependents,
      directDependents: directDependents,
      count: dependents.length,
      isDirect: dependents.some(d => d.direct)
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!pkgInfo && dependents.length === 0) {
    console.log(t('commands.why.not_found', { package: packageName }));
    return;
  }

  // Заголовок
  console.log(colorize(`\n📦 Why is ${packageName} installed?\n`, 'bold'));

  // Показываем только если включено
  if (mipFeatures['why.showVersion'] !== false && pkgInfo) {
    console.log(
      `  ${colorize('Version:', 'bold')} ${colorize(pkgInfo.version, 'green')}`
    );
    console.log(
      `  ${colorize('Resolved:', 'bold')} ${colorize(pkgInfo.resolved, 'gray')}\n`
    );
  }

  // Проверка на дубликаты
  if (mipFeatures['why.checkDuplicates'] !== false) {
    const versions = new Set();
    for (const [fullName, info] of Object.entries(lockData.packages || {})) {
      if (fullName.startsWith(packageName + '@')) {
        versions.add(info.version);
      }
    }
    if (versions.size > 1) {
      console.log(colorize(`  ⚠️ Multiple versions found: ${Array.from(versions).join(', ')}`, 'yellow'));
      console.log(colorize('  💡 Run mip dedupe to resolve conflicts\n', 'gray'));
    }
  }

  if (dependents.length > 0) {
    if (showTree) {
      // ДЕРЕВО ЗАВИСИМОСТЕЙ
      console.log(colorize('  Dependency tree:', 'bold'));
      console.log(colorize('  ─────────────────', 'gray'));

      // Строим дерево
      const treeLines = buildTree(dependents, packageName);
      for (const line of treeLines) {
        console.log(`  ${line}`);
      }
      console.log('');
    } else {
      // Обычный список
      const depCount = dependents.length;
      console.log(colorize(`  Required by (${depCount}):`, 'bold'));

      // Сначала показываем прямые зависимости, потом транзитивные
      const direct = dependents.filter(d => d.direct);
      const transitive = dependents.filter(d => !d.direct);

      // Ограничение количества вывода
      const maxDisplay = mipFeatures['why.maxDisplay'] || 20;

      if (direct.length > 0) {
        console.log(colorize('    📦 Direct dependencies:', 'green'));
        const displayDirect = direct.slice(0, maxDisplay);
        displayDirect.forEach(dep => {
          console.log(
            `      └── ${colorize(dep.name, 'bold')} ${colorize(
              `(requires ${dep.requiredVersion})`,
              'gray'
            )}`
          );
        });
        if (direct.length > maxDisplay) {
          console.log(colorize(`      ... and ${direct.length - maxDisplay} more`, 'gray'));
        }
      }

      if (transitive.length > 0) {
        console.log(colorize('    📁 Transitive dependencies:', 'gray'));
        const displayTransitive = transitive.slice(0, maxDisplay);
        displayTransitive.forEach(dep => {
          console.log(
            `      └── ${colorize(dep.name, 'bold')} ${colorize(
              `(requires ${dep.requiredVersion})`,
              'gray'
            )}`
          );
        });
        if (transitive.length > maxDisplay) {
          console.log(colorize(`      ... and ${transitive.length - maxDisplay} more`, 'gray'));
        }
      }
      console.log('');
    }
  } else if (pkgInfo) {
    console.log(
      `  ${colorize('✅', 'green')} ${colorize('Direct dependency', 'green')} ${colorize(
        '(listed in mip.yml)',
        'gray'
      )}`
    );
    console.log('');
  }

  // Подсказка
  if (!showTree && dependents.length > 1 && mipFeatures['why.showTreeHint'] !== false) {
    console.log(
      colorize('💡 Tip:', 'yellow') +
        colorize(' Use ', 'gray') +
        colorize('mip why <package> --tree', 'bold') +
        colorize(' to see the full dependency tree', 'gray')
    );
    console.log('');
  }
}

module.exports = { why };