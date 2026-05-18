#!/usr/bin/env node

const { UnixBuilder } = require('./build-unix.js');
const readline = require('readline');
const os = require('os');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const builder = new UnixBuilder();

function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function main() {
  const arch = os.arch();
  const isArm64 = arch === 'arm64';
  
  console.log('');
  builder.log('╔═══════════════════════════════════════════════════════════╗', 'green');
  builder.log(`║         🍎 MIP Builder for macOS (${arch}) 🍎               ║`, 'green');
  builder.log('╚═══════════════════════════════════════════════════════════╝', 'green');
  console.log('');

  let target, outputName;
  
  if (isArm64) {
    target = 'node18-macos-arm64';
    outputName = 'mip-macos-arm64';
    builder.log('🔍 Detected Apple Silicon (M1/M2/M3)', 'blue');
  } else {
    target = 'node18-macos-x64';
    outputName = 'mip-macos-x64';
    builder.log('🔍 Detected Intel Mac', 'blue');
  }

  const binary = builder.buildBinary(target, outputName);
  
  if (!binary) {
    builder.log('❌ Build failed', 'red');
    process.exit(1);
  }

  console.log('');
  builder.log('┌───────────────────────────────────────────────────────────┐', 'yellow');
  builder.log('│                    📋 INSTALLATION                        │', 'yellow');
  builder.log('└───────────────────────────────────────────────────────────┘', 'yellow');
  console.log('');
  builder.log('1. Install to ~/.local/bin (user, no sudo)', 'blue');
  builder.log('2. Install to /usr/local/bin (system, sudo required)', 'blue');
  builder.log('3. Skip installation (binary in dist/)', 'blue');
  console.log('');

  const choice = await question('Choose (1-3): ');
  console.log('');

  if (choice === '1') {
    await builder.installToUserBin(binary);
  } else if (choice === '2') {
    await builder.installToSystemBin(binary);
  } else {
    builder.log(`ℹ️  Binary saved to: ${binary}`, 'blue');
  }

  console.log('');
  builder.log('╔═══════════════════════════════════════════════════════════╗', 'green');
  builder.log('║                    ✨ INSTALLATION DONE ✨                  ║', 'green');
  builder.log('╚═══════════════════════════════════════════════════════════╝', 'green');
  console.log('');
  builder.log('💡 Test it:', 'yellow');
  builder.log('   mip --help', 'blue');
  builder.log('   mip init', 'blue');
  console.log('');

  rl.close();
}

main().catch(console.error);