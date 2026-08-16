/**
 * Professional logging utility with color support, file tracking, and multiple log levels
 * Optimized to only output when DEBUG=1 environment variable is set
 * @module logger
 * @example
 * const log = require('./logger');
 * log.info('Server started'); // Only shows if DEBUG=1
 * log.error('Failed', { showFile: true });
 */

const path = require('path');

// Check if debug mode is enabled
const IS_DEBUG = process.env.DEBUG === '1';

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

// Default color mappings
const DEFAULT_COLORS = {
  error: COLORS.brightRed,
  warn: COLORS.brightYellow,
  info: COLORS.brightGreen,
  debug: COLORS.brightCyan,
  success: COLORS.brightGreen,
};

// Quick no-op functions for when DEBUG=0 (minimal overhead)
const noop = () => {};
const noopReturn = (fn) => fn;

// If not in debug mode, export empty functions
if (!IS_DEBUG) {
  module.exports = {
    log: noop,
    error: console.error.bind(console), // Always show errors
    warn: console.warn.bind(console),   // Always show warnings
    info: noop,
    debug: noop,
    success: noop,
    group: noop,
    separator: noop,
    table: noop,
    time: noopReturn,
    colors: COLORS,
    defaultColors: DEFAULT_COLORS,
    levels: { error: 0, warn: 1, info: 2, success: 3, debug: 4 },
    isDebug: false,
  };
  return;
}

/**
 * Gets current timestamp
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').slice(0, 23);
}

/**
 * Gets caller file info from stack trace
 * @param {number} depth - Stack depth
 * @returns {string} File name and line number
 */
function getCallerFile(depth = 3) {
  const stack = new Error().stack?.split('\n') || [];
  
  const callerLine = stack.find((line, index) => {
    if (index < depth) return false;
    return !line.includes('logger.js') && !line.includes('node_modules');
  });

  if (!callerLine) return 'unknown';

  const match = callerLine.match(/\((.+):(\d+):(\d+)\)/);
  if (match) {
    return `${path.basename(match[1])}:${match[2]}`;
  }
  return 'unknown';
}

/**
 * Core logging function
 */
function log(level, message, options = {}) {
  let color = null;
  let showFile = false;
  let prefix = null;
  let depth = 4;

  if (typeof options === 'string') {
    color = options;
  } else if (typeof options === 'boolean') {
    showFile = options;
  } else if (options && typeof options === 'object') {
    color = options.color || null;
    showFile = options.showFile || false;
    prefix = options.prefix || null;
    depth = options.depth || 4;
  }

  // Skip debug messages unless explicitly enabled
  if (level === 'debug' && process.env.DEBUG_VERBOSE !== '1') {
    return;
  }

  const timestamp = getTimestamp();
  const fileInfo = showFile ? ` [${getCallerFile(depth)}]` : '';
  const colorCode = color || DEFAULT_COLORS[level] || COLORS.white;
  const resetCode = COLORS.reset;
  
  let msg = message instanceof Error ? message.stack || message.message : String(message);
  const prefixText = prefix ? `[${prefix}] ` : '';
  const logEntry = `${timestamp} ${prefixText}${msg}${fileInfo}`;

  const consoleMethod = level === 'error' ? console.error : 
                        level === 'warn' ? console.warn : 
                        console.log;

  consoleMethod(`${colorCode}%s${resetCode}`, logEntry);

  if (message instanceof Error && level === 'error') {
    console.error(message);
  }
}

// Create level-specific functions
function error(message, options = {}) {
  if (typeof options === 'boolean' || typeof options === 'string') {
    options = { showFile: options };
  }
  log('error', message, { ...options, color: options.color || DEFAULT_COLORS.error });
}

function warn(message, options = {}) {
  if (typeof options === 'boolean' || typeof options === 'string') {
    options = { showFile: options };
  }
  log('warn', message, { ...options, color: options.color || DEFAULT_COLORS.warn });
}

function info(message, options = {}) {
  if (typeof options === 'boolean' || typeof options === 'string') {
    options = { showFile: options };
  }
  log('info', message, { ...options, color: options.color || DEFAULT_COLORS.info });
}

function debug(message, options = {}) {
  if (typeof options === 'boolean' || typeof options === 'string') {
    options = { showFile: options };
  }
  log('debug', message, { ...options, color: options.color || DEFAULT_COLORS.debug });
}

function success(message, options = {}) {
  if (typeof options === 'boolean' || typeof options === 'string') {
    options = { showFile: options };
  }
  log('success', message, { ...options, color: options.color || DEFAULT_COLORS.success });
}

// Utility functions (only work in debug mode)
function group(title, fn, options = {}) {
  if (!IS_DEBUG) return;
  const color = options.color || COLORS.brightBlue;
  console.log(`${color}┌── ${title}${COLORS.reset}`);
  console.log(`${color}│${COLORS.reset}`);
  if (typeof fn === 'function') fn();
  console.log(`${color}└── ${title}${COLORS.reset}`);
  console.log('');
}

function separator(char = '-', length = 50, color = COLORS.gray) {
  if (!IS_DEBUG) return;
  console.log(`${color}${char.repeat(length)}${COLORS.reset}`);
}

function table(title, data, options = {}) {
  if (!IS_DEBUG) return;
  const color = options.color || COLORS.brightBlue;
  const padding = options.padding || 2;
  
  console.log(`${color}╔══ ${title} ══${COLORS.reset}`);
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log('  (empty)');
    console.log(`${color}╚══════════════════╝${COLORS.reset}`);
    return;
  }

  const items = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ key, value }));
  let columns = options.columns;
  
  if (!columns && items.length > 0) {
    columns = Object.keys(items[0]);
  }
  
  if (!columns || columns.length === 0) {
    console.log('  (no columns)');
    return;
  }

  const colWidths = columns.map(col => {
    const maxLength = Math.max(
      col.length,
      ...items.map(item => String(item[col] || '').length)
    );
    return maxLength + padding;
  });

  const headerLine = columns.map((col, i) => col.padEnd(colWidths[i])).join('│');
  
  console.log(`${color}${'─'.repeat(headerLine.length + columns.length - 1)}${COLORS.reset}`);
  console.log(`${color}${headerLine}${COLORS.reset}`);
  console.log(`${color}${'─'.repeat(headerLine.length + columns.length - 1)}${COLORS.reset}`);

  items.forEach(item => {
    const rowLine = columns.map((col, i) => {
      const value = String(item[col] !== undefined ? item[col] : '');
      return value.padEnd(colWidths[i]);
    }).join('│');
    console.log(rowLine);
  });

  console.log(`${color}${'─'.repeat(headerLine.length + columns.length - 1)}${COLORS.reset}`);
  console.log(`${color}╚══════════════════╝${COLORS.reset}`);
}

function time(label, fn, options = {}) {
  if (!IS_DEBUG) {
    return typeof fn === 'function' ? fn() : fn;
  }

  if (typeof label !== 'string') throw new Error('Label must be a string');
  if (typeof fn !== 'function') throw new Error('Second argument must be a function');

  const startTime = process.hrtime.bigint();

  try {
    const result = fn();
    
    if (result && typeof result.then === 'function') {
      return result.then((value) => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        info(`⏱ ${label} completed in ${duration.toFixed(2)}ms`, options);
        return value;
      }).catch((err) => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        error(`⏱ ${label} failed after ${duration.toFixed(2)}ms`, options);
        throw err;
      });
    }
    
    const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    info(`⏱ ${label} completed in ${duration.toFixed(2)}ms`, options);
    return result;
    
  } catch (err) {
    const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    error(`⏱ ${label} failed after ${duration.toFixed(2)}ms`, options);
    throw err;
  }
}

// Export only what's needed
module.exports = {
  log,
  error,
  warn,
  info,
  debug,
  success,
  group,
  separator,
  table,
  time,
  colors: COLORS,
  defaultColors: DEFAULT_COLORS,
  levels: { error: 0, warn: 1, info: 2, success: 3, debug: 4 },
  isDebug: IS_DEBUG,
};