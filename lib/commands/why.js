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
  if (depth > 5 || visited.has(packageName)) return [];
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

  if (!packageName) {
    console.log(t('commands.why.usage'));
    return;
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

  if (!pkgInfo && dependents.length === 0) {
    console.log(t('commands.why.not_found', { package: packageName }));
    return;
  }

  // Заголовок
  console.log(colorize(`\n📦 Why is ${packageName} installed?\n`, 'bold'));

  if (pkgInfo) {
    console.log(
      `  ${colorize('Version:', 'bold')} ${colorize(pkgInfo.version, 'green')}`
    );
    console.log(
      `  ${colorize('Resolved:', 'bold')} ${colorize(pkgInfo.resolved, 'gray')}\n`
    );
  }

  if (dependents.length > 0) {
    if (showTree) {
      // 🔥 ДЕРЕВО ЗАВИСИМОСТЕЙ
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
      console.log(colorize(`  Required by (${dependents.length}):`, 'bold'));

      // Сначала показываем прямые зависимости, потом транзитивные
      const direct = dependents.filter(d => d.direct);
      const transitive = dependents.filter(d => !d.direct);

      if (direct.length > 0) {
        console.log(colorize('    📦 Direct dependencies:', 'green'));
        direct.forEach(dep => {
          console.log(
            `      └── ${colorize(dep.name, 'bold')} ${colorize(
              `(requires ${dep.requiredVersion})`,
              'gray'
            )}`
          );
        });
      }

      if (transitive.length > 0) {
        console.log(colorize('    📁 Transitive dependencies:', 'gray'));
        transitive.forEach(dep => {
          console.log(
            `      └── ${colorize(dep.name, 'bold')} ${colorize(
              `(requires ${dep.requiredVersion})`,
              'gray'
            )}`
          );
        });
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
  if (!showTree && dependents.length > 1) {
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