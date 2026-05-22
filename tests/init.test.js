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


const TEST_DIR = 'tmp/test-init';

describe('mip init', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test('creates mip.json', () => {
    execSync(`${MIP} init`, { cwd: TEST_DIR });
    
    const mipJson = path.join(TEST_DIR, 'mip.json');
    expect(fs.existsSync(mipJson)).toBe(true);
    
    const config = JSON.parse(fs.readFileSync(mipJson, 'utf8'));
    expect(config.name).toBe('test-init');
    expect(config.version).toBe('1.0.0');
  });

  test('creates .mip directory', () => {
    execSync(`${MIP} init`, { cwd: TEST_DIR });
    
    const mipDir = path.join(TEST_DIR, '.mip');
    expect(fs.existsSync(mipDir)).toBe(true);
  });

  test('fails if already exists', () => {
    execSync(`${MIP} init`, { cwd: TEST_DIR });
    
    expect(() => {
      execSync(`${MIP} init`, { cwd: TEST_DIR });
    }).toThrow();
  });
});