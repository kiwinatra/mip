const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIP = 'node bin/mip.js';

describe('mip version', () => {
  test('shows version', () => {
    const output = execSync(`${MIP} --version`).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });
});