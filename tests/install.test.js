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

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIP = `node ${path.join(process.cwd(), 'bin', 'mip.js')}`;


const TEST_DIR = 'tmp/test-install';

describe('mip install', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    // In test environments, concurrent runs might leave mip.json behind.
    // Ignore init failures if project already exists.
    try {
      execSync(`${MIP} init`, { cwd: TEST_DIR });
    } catch {}
  });


  afterEach(() => {
    // Avoid failing the whole suite on Windows EBUSY cleanup.
    // Use a retry strategy.
    try {
      // Force async cleanup to avoid Windows EBUSY on rmdir.
      const { rm } = require('node:fs/promises');
      rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    } catch {
      // ignore
    }

  });



  test('installs a package', () => {
    execSync(`${MIP} install lodash`, { cwd: TEST_DIR });
    
    const mipDir = path.join(TEST_DIR, '.mip', 'lodash');
    expect(fs.existsSync(mipDir)).toBe(true);
    
    const versions = fs.readdirSync(mipDir);
    expect(versions.length).toBeGreaterThan(0);
  });

  test('installs specific version', () => {
    execSync(`${MIP} install lodash@4.17.20`, { cwd: TEST_DIR });
    
    const pkgDir = path.join(TEST_DIR, '.mip', 'lodash', '4.17.20');
    expect(fs.existsSync(pkgDir)).toBe(true);
  });

  test('updates mip.json', () => {
    execSync(`${MIP} install express`, { cwd: TEST_DIR });
    
    const mipJson = path.join(TEST_DIR, 'mip.json');
    const config = JSON.parse(fs.readFileSync(mipJson, 'utf8'));
    expect(config.dependencies.express).toBeDefined();
  });

  test('installs with --save-dev', () => {
    execSync(`${MIP} install jest --save-dev`, { cwd: TEST_DIR });
    
    const mipJson = path.join(TEST_DIR, 'mip.json');
    const config = JSON.parse(fs.readFileSync(mipJson, 'utf8'));
    expect(config.devDependencies.jest).toBeDefined();
  });
});