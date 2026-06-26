#!/usr/bin/env node
/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================

const CONFIG = {
  // Папки, которые нужно обработать
  includeDirs: [
    'bin',
    'lib',
    'scripts'
  ],
  // Папки, которые нужно исключить
  excludeDirs: [
    'node_modules',
    'dist',
    'docs',
    'examples',
    'tests',
    'test',
    'coverage',
    '.git',
    '.mip',
    '.mip_cache'
  ],
  // Расширения файлов для обработки
  extensions: ['.js', '.cjs', '.mjs'],
  // Создавать бэкап перед обработкой
  backup: true,
  // Расширение для бэкапа
  backupExt: '.backup'
};

// ==========================================
// ФУНКЦИИ
// ==========================================

function log(msg, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌'
  };
  console.log(`${icons[type] || '📌'} ${msg}`);
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (CONFIG.excludeDirs.includes(file)) continue;
      getAllFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (CONFIG.extensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

function removeComments(content) {
  const lines = content.split('\n');
  const result = [];
  let inBlockComment = false;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let newLine = '';
    let iPos = 0;

    while (iPos < line.length) {
      const char = line[iPos];
      const nextChar = line[iPos + 1] || '';

      // Обработка строк
      if ((char === '"' || char === "'" || char === '`') && !inBlockComment) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && line[iPos - 1] !== '\\') {
          inString = false;
        }
        newLine += char;
        iPos++;
        continue;
      }

      // Обработка многострочных комментариев
      if (!inString) {
        if (!inBlockComment && char === '/' && nextChar === '*') {
          inBlockComment = true;
          iPos += 2;
          continue;
        }
        if (inBlockComment && char === '*' && nextChar === '/') {
          inBlockComment = false;
          iPos += 2;
          continue;
        }
        if (inBlockComment) {
          iPos++;
          continue;
        }

        // Обработка однострочных комментариев
        if (char === '/' && nextChar === '/') {
          break;
        }
      }

      newLine += char;
      iPos++;
    }

    // Пропускаем пустые строки, которые были только комментариями
    if (newLine.trim() || !inBlockComment) {
      result.push(newLine);
    }
  }

  return result.join('\n');
}

function processFile(filePath) {
  try {
    log(`Processing: ${filePath}`, 'info');

    // Читаем файл
    const content = fs.readFileSync(filePath, 'utf8');

    // Создаём бэкап
    if (CONFIG.backup) {
      const backupPath = filePath + CONFIG.backupExt;
      fs.writeFileSync(backupPath, content);
    }

    // Удаляем комментарии
    const cleaned = removeComments(content);

    // Записываем файл
    fs.writeFileSync(filePath, cleaned);

    log(`  ✅ Done: ${filePath}`, 'success');

  } catch (err) {
    log(`  ❌ Error processing ${filePath}: ${err.message}`, 'error');
  }
}

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ
// ==========================================

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         🧹 MIP Comment Cleaner 🧹                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Проверяем аргументы командной строки
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const noBackup = args.includes('--no-backup');

  if (isDryRun) {
    log('DRY RUN MODE - No files will be modified', 'warn');
    console.log('');
  }

  if (noBackup) {
    CONFIG.backup = false;
    log('Backup disabled', 'warn');
    console.log('');
  }

  // Получаем список файлов
  const files = [];
  for (const dir of CONFIG.includeDirs) {
    if (fs.existsSync(dir)) {
      getAllFiles(dir, files);
    }
  }

  if (files.length === 0) {
    log('No files found to process', 'warn');
    process.exit(0);
  }

  log(`Found ${files.length} files to process`, 'info');
  console.log('');

  // Обрабатываем файлы
  let processed = 0;
  let failed = 0;

  for (const file of files) {
    if (isDryRun) {
      log(`[DRY RUN] Would process: ${file}`, 'info');
      continue;
    }

    try {
      processFile(file);
      processed++;
    } catch (err) {
      log(`  ❌ Failed: ${file}`, 'error');
      failed++;
    }
  }

  // Вывод результата
  console.log('');
  log('═'.repeat(60), 'info');
  log(`📊 Summary:`, 'info');
  log(`   Processed: ${processed} files`, 'success');
  log(`   Failed: ${failed} files`, failed > 0 ? 'error' : 'success');

  if (CONFIG.backup) {
    log(`   Backups: ${processed} files (${CONFIG.backupExt})`, 'info');
  }

  if (isDryRun) {
    log('   Mode: DRY RUN (no files modified)', 'warn');
  }

  log('═'.repeat(60), 'info');
  console.log('');
}

// ==========================================
// ЗАПУСК
// ==========================================

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});