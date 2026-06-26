module.exports = {
  env: {
    node: true,
    
    commonjs: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-undef': 'off',
    'no-case-declarations': 'off',
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-empty': 'off',
    'no-redeclare': 'off'
  },
  globals: {
    Promise: 'readonly',
    Map: 'readonly',
    Set: 'readonly',
    Proxy: 'readonly',
    globalThis: 'readonly',
    Worker: 'readonly',
    isMainThread: 'readonly',
    parentPort: 'readonly'
  }
};