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

const CONFIG = {
  backupExt: '.backup',
  includeDirs: ['bin', 'lib', 'scripts'],
  excludeDirs: ['node_modules', 'dist', 'docs', 'examples', 'tests', 'test', 'coverage', '.git', '.mip', '.mip_cache']
};

function log(msg, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };
  console.log(`${icons[type] || '📌'} ${msg}`);
}

function findAllBackups(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (CONFIG.excludeDirs.includes(file)) continue;
      findAllBackups(filePath, fileList);
    } else if (file.endsWith(CONFIG.backupExt)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function restoreBackup(backupPath) {
  try {
    const originalPath = backupPath.replace(CONFIG.backupExt, '');
    if (!fs.existsSync(originalPath)) {
      log(`  ⚠️ Original not found: ${originalPath}`, 'warn');
      return false;
    }
    fs.copyFileSync(backupPath, originalPath);
    log(`  ✅ Restored: ${originalPath}`, 'success');
    return true;
  } catch (err) {
    log(`  ❌ Failed: ${err.message}`, 'error');
    return false;
  }
}

function removeBackup(backupPath) {
  try {
    fs.unlinkSync(backupPath);
    log(`  🗑️ Removed: ${backupPath}`, 'info');
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         🔄 MIP Backup Restorer 🔄                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const args = process.argv.slice(2);
  const keepBackups = args.includes('--keep-backups');
  const dryRun = args.includes('--dry-run');

  if (dryRun) log('DRY RUN MODE - No files will be modified', 'warn');

  const backups = [];
  for (const dir of CONFIG.includeDirs) {
    if (fs.existsSync(dir)) findAllBackups(dir, backups);
  }

  if (backups.length === 0) {
    log('No backup files found', 'warn');
    process.exit(0);
  }

  log(`Found ${backups.length} backup files`, 'info');
  console.log('');

  let restored = 0, failed = 0;

  for (const backup of backups) {
    if (dryRun) {
      log(`[DRY RUN] Would restore: ${backup.replace(CONFIG.backupExt, '')}`, 'info');
      continue;
    }
    const success = restoreBackup(backup);
    if (success) {
      restored++;
      if (!keepBackups) removeBackup(backup);
    } else {
      failed++;
    }
  }

  console.log('');
  log('═'.repeat(60), 'info');
  log(`📊 Restored: ${restored} files`, 'success');
  log(`   Failed: ${failed} files`, failed > 0 ? 'error' : 'success');
  if (dryRun) log('   Mode: DRY RUN (no files modified)', 'warn');
  log('═'.repeat(60), 'info');
  console.log('');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});