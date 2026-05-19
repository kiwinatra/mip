#!/usr/bin/env node
/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */


const fs = require('fs');
const path = require('path');

const WATERMARK_PATTERN = /\/\*\s*\n\s*\*\s*┌─+┐\s*\n[\s\S]*?└─+┘\s*\n\s*\*\//;

const EXTENSIONS = ['.js', '.json', '.md', '.sh', '.yml', '.yaml'];
const IGNORE_DIRS = ['node_modules', '.mip', 'dist', 'release', '.git'];

function shouldProcess(filePath) {
  const ext = path.extname(filePath);
  const dirName = path.basename(path.dirname(filePath));
  
  if (IGNORE_DIRS.includes(dirName)) return false;
  if (dirName.startsWith('.')) return false;
  if (!EXTENSIONS.includes(ext)) return false;
  
  return true;
}

function hasWatermark(content) {
  return WATERMARK_PATTERN.test(content);
}

function removeWatermark(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!hasWatermark(content)) {
    console.log(`⏭️  Skipping ${filePath} (no watermark)`);
    return false;
  }
  
  let newContent = content.replace(WATERMARK_PATTERN, '');
  newContent = newContent.replace(/^\s*\n/, '');
  
  fs.writeFileSync(filePath, newContent);
  console.log(`🔙 Watermark removed from ${filePath}`);
  return true;
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (shouldProcess(filePath)) {
      removeWatermark(filePath);
    }
  }
}

console.log('💧 Removing watermark from all files...\n');
walk(process.cwd());
console.log('\n✨ Done!');