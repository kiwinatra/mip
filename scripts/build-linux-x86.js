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




const { UnixBuilder } = require('./build-unix.js');
const readline = require('readline');

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
  console.log('');
  builder.log('╔═══════════════════════════════════════════════════════════╗', 'green');
  builder.log('║         🐧 MIP Builder for Linux x86 (32-bit) 🐧          ║', 'green');
  builder.log('╚═══════════════════════════════════════════════════════════╝', 'green');
  console.log('');

  const binary = builder.buildBinary('node18-linux-x86', 'mip-linux-x86');
  
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

  rl.close();
}

main().catch(console.error);