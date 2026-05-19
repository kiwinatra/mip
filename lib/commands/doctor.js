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
const { execSync } = require('child_process');

async function doctor() {
  console.log('🔍 Running diagnostics...\n');
  
  const issues = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1));
  if (major < 14) {
    issues.push(`⚠️ Node.js ${nodeVersion} (recommended: v18+)`);
  } else {
    console.log(`✅ Node.js ${nodeVersion}`);
  }
  
  // Check mip version
  const mipVersion = require('../../package.json').version;
  console.log(`✅ mip v${mipVersion}`);
  
  // Check ~/.mip directory
  const mipDir = path.join(require('os').homedir(), '.mip');
  if (!fs.existsSync(mipDir)) {
    issues.push(`⚠️ ~/.mip directory missing (will be created on first install)`);
  } else {
    console.log(`✅ ~/.mip exists`);
  }
  
  // Check PATH for global binaries
  const globalBin = path.join(mipDir, 'global', 'node_modules', '.bin');
  const pathHasGlobal = process.env.PATH.includes(globalBin);
  if (!pathHasGlobal) {
    issues.push(`⚠️ Global bin not in PATH: ${globalBin}`);
  } else {
    console.log(`✅ Global bin in PATH`);
  }
  
  // Check git
  try {
    execSync('git --version', { stdio: 'pipe' });
    console.log(`✅ Git installed`);
  } catch {
    issues.push(`⚠️ Git not found (required for GitHub packages)`);
  }
  
  // Check network
  try {
    execSync('curl -s https://registry.npmjs.org/ --max-time 3', { stdio: 'pipe' });
    console.log(`✅ Network: npm registry reachable`);
  } catch {
    issues.push(`⚠️ Cannot reach npm registry (check network)`);
  }
  
  // Check disk space
  // Simple check - try to write a temp file
  try {
    const testFile = path.join(require('os').tmpdir(), 'mip-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`✅ Disk writeable`);
  } catch {
    issues.push(`⚠️ Cannot write to disk (check permissions)`);
  }
  
  console.log(`\n📊 Summary: ${issues.length} warning(s)`);
  
  if (issues.length > 0) {
    console.log('\nIssues found:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    
    console.log('\n💡 Fix suggestions:');
    if (issues.some(i => i.includes('PATH'))) {
      console.log('  • Add to ~/.zshrc or ~/.bashrc:');
      console.log(`    export PATH="$PATH:${globalBin}"`);
    }
    if (issues.some(i => i.includes('Git'))) {
      console.log('  • Install git: https://git-scm.com/');
    }
  } else {
    console.log('\n✨ System is healthy!');
  }
}

module.exports = { doctor };