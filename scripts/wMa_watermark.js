#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const WATERMARK = `/*
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

`;

const EXTENSIONS = ['.js', '.sh', '.yml', '.yaml'];
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
  return content.includes('MInimal Package Manager') || 
         content.includes('kiwinatra/mip');
}

function addWatermark(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (hasWatermark(content)) {
    console.log(`⏭️  Skipping ${filePath} (already has watermark)`);
    return false;
  }
  
  const shebangMatch = content.match(/^#!.*\n/);
  let newContent = content;
  
  if (shebangMatch) {
    newContent = content.replace(shebangMatch[0], shebangMatch[0] + WATERMARK);
  } else {
    newContent = WATERMARK + content;
  }
  
  fs.writeFileSync(filePath, newContent);
  console.log(`✅ Watermark added to ${filePath}`);
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
      addWatermark(filePath);
    }
  }
}

console.log('💧 Adding watermark to all files...\n');
walk(process.cwd());
console.log('\n✨ Done!');