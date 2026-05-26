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

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function exec(command) {
  if (!command) {
    console.log('Usage: mip exec <command>');
    console.log('Example: mip exec jest');
    return;
  }
  
  // find on mip too
  const mipDir = path.join(process.cwd(), '.mip');
  const binPaths = [];
  
  // as
  if (fs.existsSync(mipDir)) {
    const packages = fs.readdirSync(mipDir);
    for (const pkg of packages) {
      const pkgDir = path.join(mipDir, pkg);
      if (fs.statSync(pkgDir).isDirectory()) {
        const versions = fs.readdirSync(pkgDir);
        for (const version of versions) {
          // s i
          const nodeModulesBin = path.join(pkgDir, version, 'node_modules', '.bin', command);
          if (fs.existsSync(nodeModulesBin)) {
            binPaths.push(nodeModulesBin);
          }
          // s h
          const rootBin = path.join(pkgDir, version, '.bin', command);
          if (fs.existsSync(rootBin)) {
            binPaths.push(rootBin);
          }
        }
      }
    }
  }
  
  let executable;
  
  if (binPaths.length > 0) {
    // ot
    executable = binPaths[0];
    console.log(`🔧 Found in .mip: ${path.relative(process.cwd(), executable)}`);
  } else {
    // i w
    executable = command;
    console.log(`🔧 Using system command: ${command}`);
  }
  
  console.log(`\n✨ Executing: ${command}\n`);
  
  const child = spawn(executable, process.argv.slice(4), {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    env: process.env
  });
  
  child.on('close', (code) => {
    if (code !== 0) process.exit(code);
  });
}

module.exports = { exec };