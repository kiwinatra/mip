// THIS FILE IS NOT USED IN MAIN.

// Central Exports
// HACK: main code is in ./bin/mip.js

const fs = require('fs');
const path = require('path');

const loadedCommands = new Map();
const loadedUtils = new Map();
const loadedCore = new Map();

function loadModule(type, name) {
  const cache = type === 'cmd' ? loadedCommands : type === 'util' ? loadedUtils : loadedCore;

  if (!cache.has(name)) {
    try {
      let modulePath;
      if (type === 'cmd') modulePath = path.join(__dirname, 'commands', `${name}.js`);
      else if (type === 'util') modulePath = path.join(__dirname, 'utils', `${name}.js`);
      else modulePath = path.join(__dirname, 'core', `${name}.js`);

      if (fs.existsSync(modulePath)) {
        cache.set(name, require(modulePath));
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  }
  return cache.get(name);
}

// proxies
const commands = new Proxy(
  {},
  {
    get(_, cmdName) {
      const cmd = loadModule('cmd', cmdName);
      return cmd || null;
    },
  }
);

// utils
const utils = new Proxy(
  {},
  {
    get(_, utilName) {
      const util = loadModule('util', utilName);
      return util || null;
    },
  }
);

// core
const core = new Proxy(
  {},
  {
    get(_, coreName) {
      const mod = loadModule('core', coreName);
      return mod || null;
    },
  }
);

module.exports = {
  commands,
  utils,
  core,

  // fast links
  get install() {
    return commands.install;
  },
  get init() {
    return commands.init;
  },
  get list() {
    return commands.list;
  },
  get dedupe() {
    return commands.dedupe;
  },
  get superInstall() {
    return core.superInstall || commands.superInstall;
  },
};
