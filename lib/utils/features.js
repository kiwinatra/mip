/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

// ==========================================
// DEFAULT FEATURES CONFIGURATION
// ==========================================

const DEFAULT_FEATURES = {
  // === GLOBAL TOGGLE ===
  // Если false - вся система модификаций выключена, работаем как обычный MIP
  'config.enabled': true,
  'motd.enabled': true,

  // === Install & Update ===
  'install.parallel': true,
  'install.forceReinstall': false,
  'install.saveExact': false,
  'install.skipIntegrityCheck': false,
  'install.dryRun': false,
  'install.ignoreScripts': false,
  'install.ignoreOptional': false,
  'install.ignoreEngines': false,
  'install.ignorePlatform': false,

  'update.checkForUpdates': true,
  'update.autoUpdate': false,
  'update.prerelease': false,
  'update.major': false,
  'update.minor': true,
  'update.patch': true,

  // === Security & Audit ===
  'audit.enabled': true,
  'audit.fixAutomatically': false,
  'audit.ignoreDev': false,
  'audit.ignoreLow': true,
  'audit.ignoreModerate': false,
  'audit.ignoreHigh': false,
  'audit.ignoreCritical': false,
  'audit.parallelScan': true,
  'audit.timeout': 5000,

  // === Caching ===
  'cache.enabled': true,
  'cache.maxSize': 500,
  'cache.ttl': 86400,
  'cache.cleanOnExit': false,
  'cache.path': '~/.mip/cache',
  'cache.compress': false,

  // === Performance ===
  'performance.parallelDownloads': 5,
  'performance.useHardlinks': false,
  'performance.optimizeSymlinks': true,
  'performance.useMemoryCache': true,
  'performance.throttle': false,
  'performance.maxSockets': 15,

  // === Logging & Debug ===
  'logging.level': 'info',
  'logging.color': true,
  'logging.timestamp': false,
  'logging.showStack': false,
  'logging.file': null,
  'logging.maxSize': '10MB',

  // === Interactivity ===
  'interactive.promptOnInstall': false,
  'interactive.promptOnDelete': true,
  'interactive.promptOnUpdate': true,
  'interactive.promptOnAudit': false,
  'interactive.promptOnDedupe': true,
  'interactive.autoConfirm': false,

  // === Registries ===
  'registry.default': 'npm',
  'registry.fallbackToNpm': true,
  'registry.strictSSL': true,
  'registry.timeout': 30000,
  'registry.retryCount': 3,
  'registry.userAgent': 'mip',
  'registry.cacheMetadata': true,

  // === Dependency Resolution ===
  'dependency.resolutionStrategy': 'semver',
  'dependency.dedupeOnInstall': true,
  'dependency.hoist': false,
  'dependency.workspaceProtocol': true,
  'dependency.allowConflicts': false,
  'dependency.ignorePeerDependencies': false,
  'dependency.optionalDependencies': true,

  // === Git & Integration ===
  'git.enabled': true,
  'git.branch': 'main',
  'git.ssh': false,
  'git.depth': 1,
  'git.privateToken': null,
  'git.cloneTimeout': 60000,

  // === Monorepo (Workspaces) ===
  'monorepo.autoLink': true,
  'monorepo.hoistWorkspaces': false,
  'monorepo.ignoreWorkspaceRoot': false,
  'monorepo.runScriptsInOrder': true,
  'monorepo.parallelScripts': false,

  // === Doctor (Diagnostics) ===
  'doctor.checkNodeVersion': true,
  'doctor.checkDiskSpace': true,
  'doctor.checkGitHubToken': true,
  'doctor.autoFix': false,
  'doctor.checkNetwork': true,
  'doctor.checkPermissions': true,
  'doctor.checkSymlinks': true,
  'doctor.checkManifest': true,

  // === Server (mip server) ===
  'server.port': 3000,
  'server.host': 'localhost',
  'server.autoOpen': false,
  'server.refreshInterval': 3000,
  'server.darkTheme': true,
  'server.authToken': null,
  'server.enableCors': true,

  // === CLI Behavior ===
  'cli.suggestCommands': true,
  'cli.autoComplete': true,
  'cli.pager': false,
  'cli.confirmExit': false,
  'cli.showTimings': false,
  'cli.noColor': false,
  'cli.quiet': false,

  // === Plugins ===
  'plugins.autoLoad': true,
  'plugins.allowUnsecure': false,
  'plugins.path': './plugins',
  'plugins.allowGlobal': false,
  'plugins.verbose': false,

  // === Internationalization ===
  'i18n.language': 'en',
  'i18n.fallback': 'en',
  'i18n.loadCustom': true,

  // === Experimental Features ===
  'experimental.enabled': false,
  'experimental.useNewResolver': false,
  'experimental.fastGlob': false,
  'experimental.parallelExtract': false,
  'experimental.symlinkCache': false,
};

// ==========================================
// FEATURE DESCRIPTIONS (for --genconfig)
// ==========================================

const FEATURE_DESCRIPTIONS = {
  'config.enabled': 'Master switch - disable all feature modifications',
  'motd.enabled': 'Show Message of the Day with quotes and tips',

  'install.parallel': 'Install multiple packages in parallel for faster execution',
  'install.forceReinstall': 'Always reinstall packages even if already in global store',
  'install.saveExact': 'Save exact versions to config (without ^ and ~)',
  'install.skipIntegrityCheck': 'Skip package integrity checks (faster but less secure)',
  'install.dryRun': 'Simulation mode - shows what would be installed without making changes',
  'install.ignoreScripts': 'Do not run install scripts from package.json',
  'install.ignoreOptional': 'Ignore optionalDependencies',
  'install.ignoreEngines': 'Ignore engines check in package.json',
  'install.ignorePlatform': 'Ignore os/cpu checks in package.json',

  'update.checkForUpdates': 'Automatically check for new MIP versions on startup',
  'update.autoUpdate': 'Automatically update packages on startup (without confirmation)',
  'update.prerelease': 'Allow installation of pre-release versions (alpha, beta, rc)',
  'update.major': 'Allow major version updates (may break code)',
  'update.minor': 'Allow minor version updates',
  'update.patch': 'Allow patch updates',

  'audit.enabled': 'Enable security audit for packages',
  'audit.fixAutomatically': 'Automatically fix found vulnerabilities',
  'audit.ignoreDev': 'Ignore devDependencies during audit',
  'audit.ignoreLow': 'Ignore low severity vulnerabilities',
  'audit.ignoreModerate': 'Ignore moderate severity vulnerabilities',
  'audit.ignoreHigh': 'Ignore high severity vulnerabilities',
  'audit.ignoreCritical': 'Ignore critical severity vulnerabilities (dangerous!)',
  'audit.parallelScan': 'Scan packages in parallel for faster execution',
  'audit.timeout': 'Registry request timeout for audit (ms)',

  'cache.enabled': 'Use cache for downloaded packages',
  'cache.maxSize': 'Maximum cache size in MB',
  'cache.ttl': 'Cache time-to-live in seconds (86400 = 1 day)',
  'cache.cleanOnExit': 'Clear cache when MIP exits',
  'cache.path': 'Cache directory path',
  'cache.compress': 'Compress cache to save disk space',

  'performance.parallelDownloads': 'Number of parallel package downloads',
  'performance.useHardlinks': 'Use hard links instead of symlinks (saves disk space)',
  'performance.optimizeSymlinks': 'Optimize symlink creation',
  'performance.useMemoryCache': 'Cache package metadata in memory',
  'performance.throttle': 'Limit download speed (useful for slow networks)',
  'performance.maxSockets': 'Maximum number of sockets for downloads',

  'logging.level': 'Log level: silent | error | warn | info | debug | trace',
  'logging.color': 'Colored console output',
  'logging.timestamp': 'Show timestamps in logs',
  'logging.showStack': 'Show full error stack traces',
  'logging.file': 'Log file path (null = stdout only)',
  'logging.maxSize': 'Maximum log file size',

  'interactive.promptOnInstall': 'Ask for confirmation before installing',
  'interactive.promptOnDelete': 'Ask for confirmation before deleting',
  'interactive.promptOnUpdate': 'Ask for confirmation before updating',
  'interactive.promptOnAudit': 'Ask for confirmation before running audit',
  'interactive.promptOnDedupe': 'Ask for confirmation before deduplication',
  'interactive.autoConfirm': 'Auto-confirm all prompts (for CI)',

  'registry.default': 'Default package registry',
  'registry.fallbackToNpm': 'Fall back to npm if custom registry is unavailable',
  'registry.strictSSL': 'Validate registry SSL certificates',
  'registry.timeout': 'Registry request timeout (ms)',
  'registry.retryCount': 'Number of retry attempts on error',
  'registry.userAgent': 'User-Agent for registry requests',
  'registry.cacheMetadata': 'Cache package metadata from registry',

  'dependency.resolutionStrategy': 'Version resolution strategy: semver | exact | latest',
  'dependency.dedupeOnInstall': 'Automatically deduplicate dependencies on install',
  'dependency.hoist': 'Hoist dependencies to top level (like npm)',
  'dependency.workspaceProtocol': 'Use workspace: protocol for local packages',
  'dependency.allowConflicts': 'Allow conflicting versions (may cause errors)',
  'dependency.ignorePeerDependencies': 'Ignore peerDependencies',
  'dependency.optionalDependencies': 'Install optionalDependencies',

  'git.enabled': 'Use Git for cloning repositories',
  'git.branch': 'Default Git branch',
  'git.ssh': 'Use SSH instead of HTTPS for Git',
  'git.depth': 'Clone depth (1 = only latest commit)',
  'git.privateToken': 'Token for private repository access',
  'git.cloneTimeout': 'Repository clone timeout (ms)',

  'monorepo.autoLink': 'Automatically link local packages in workspace',
  'monorepo.hoistWorkspaces': 'Hoist workspace dependencies to root level',
  'monorepo.ignoreWorkspaceRoot': 'Ignore root package.json in workspace',
  'monorepo.runScriptsInOrder': 'Run workspace scripts in order',
  'monorepo.parallelScripts': 'Run workspace scripts in parallel',

  'doctor.checkNodeVersion': 'Check Node.js version in mip doctor',
  'doctor.checkDiskSpace': 'Check free disk space',
  'doctor.checkGitHubToken': 'Check for GITHUB_TOKEN presence',
  'doctor.autoFix': 'Automatically fix issues in mip doctor',
  'doctor.checkNetwork': 'Check network availability',
  'doctor.checkPermissions': 'Check file permissions',
  'doctor.checkSymlinks': 'Check symlink integrity',
  'doctor.checkManifest': 'Check manifest integrity',

  'server.port': 'Port for web server (mip server)',
  'server.host': 'Host for web server',
  'server.autoOpen': 'Auto-open browser when server starts',
  'server.refreshInterval': 'Dashboard refresh interval (ms)',
  'server.darkTheme': 'Use dark theme in dashboard',
  'server.authToken': 'Authentication token for dashboard',
  'server.enableCors': 'Enable CORS for dashboard',

  'cli.suggestCommands': 'Suggest similar commands on error',
  'cli.autoComplete': 'Enable terminal autocompletion',
  'cli.pager': 'Use pager for long output',
  'cli.confirmExit': 'Ask for confirmation on exit',
  'cli.showTimings': 'Show command execution time',
  'cli.noColor': 'Disable colors in output',
  'cli.quiet': 'Minimal output (errors only)',

  'plugins.autoLoad': 'Auto-load plugins from plugins directory',
  'plugins.allowUnsecure': 'Allow installing untrusted plugins',
  'plugins.path': 'Path to plugins directory',
  'plugins.allowGlobal': 'Allow global plugins installation',
  'plugins.verbose': 'Show verbose plugin output',

  'i18n.language': 'Interface language (en, ru, etc.)',
  'i18n.fallback': 'Fallback language if selected is unavailable',
  'i18n.loadCustom': 'Load custom language packs',

  'experimental.enabled': 'Enable experimental features (caution!)',
  'experimental.useNewResolver': 'Use new dependency resolver',
  'experimental.fastGlob': 'Use fast glob for file searching',
  'experimental.parallelExtract': 'Extract archives in parallel',
  'experimental.symlinkCache': 'Cache symlink information',
};

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * Get path to features config file
 */
function getFeaturesConfigPath(cwd = process.cwd()) {
  const mipConfigPath = path.join(cwd, '.mip', 'config.yml');
  if (fs.existsSync(mipConfigPath)) {
    return mipConfigPath;
  }

  const rootConfigPath = path.join(cwd, 'mip.config.yml');
  if (fs.existsSync(rootConfigPath)) {
    return rootConfigPath;
  }

  const mipYmlPath = path.join(cwd, 'mip.yml');
  if (fs.existsSync(mipYmlPath)) {
    try {
      const content = yaml.load(fs.readFileSync(mipYmlPath, 'utf8'));
      if (content && content.features) {
        return mipYmlPath;
      }
    } catch {}
  }

  return null;
}

/**
 * Load all features from config
 * Если config.enabled = false - возвращаем пустой объект (все фичи выключены)
 */
function loadFeatures(cwd = process.cwd()) {
  const configPath = getFeaturesConfigPath(cwd);
  let features = { ...DEFAULT_FEATURES };

  if (configPath) {
    try {
      const content = yaml.load(fs.readFileSync(configPath, 'utf8'));
      
      if (content && content.features) {
        features = { ...features, ...content.features };
      } else if (content) {
        features = { ...features, ...content };
      }
    } catch (error) {
      console.log(`⚠️ Failed to load features config: ${error.message}`);
    }
  }

  // 👇 ГЛАВНОЕ: если config.enabled === false - возвращаем пустой объект
  // Support both formats:
  // 1) flat key: "config.enabled: false"
  // 2) nested object: "config: { enabled: false }"
  // js-yaml returns YAML map values as nested objects, not flat keys.
  // Support both formats used across repo/tests:
  // - flat: "config.enabled: false" (key stored as 'config.enabled')
  // - nested: "config: { enabled: false }" (map stored as features.config.enabled)
  if (
    features['config.enabled'] === false ||
    (features.config && typeof features.config === 'object' && features.config.enabled === false)
  ) {
    // Keep config switch info but return empty set so callers treat all features as disabled.
    return {};
  }

  return features;
}

/**
 * Get specific feature value
 * Если фичи выключены глобально - всегда возвращаем дефолтное значение
 */
function getFeature(key, cwd = process.cwd()) {
  const features = loadFeatures(cwd);
  // Если features пустой (config.enabled = false) - возвращаем дефолт
  if (Object.keys(features).length === 0 && features.constructor === Object) {
    return DEFAULT_FEATURES[key];
  }
  return features[key] !== undefined ? features[key] : DEFAULT_FEATURES[key];
}

/**
 * Set feature value
 * Если config.enabled = false - нельзя менять фичи
 */
function setFeature(key, value, cwd = process.cwd()) {
  // Проверяем, включены ли фичи
  const currentFeatures = loadFeatures(cwd);
  if (Object.keys(currentFeatures).length === 0 && currentFeatures.constructor === Object) {
    console.log('⚠️ Features are disabled (config.enabled: false)');
    console.log('   Enable them first: mip config set features.config.enabled true');
    return false;
  }

  const configPath = getFeaturesConfigPath(cwd) || path.join(cwd, '.mip', 'config.yml');
  
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
    } catch {}
  }

  if (configPath.endsWith('mip.yml')) {
    if (!config.features) config.features = {};
    config.features[key] = value;
  } else {
    config[key] = value;
  }

  fs.writeFileSync(configPath, yaml.dump(config, { indent: 2 }));
  return true;
}

/**
 * Reset feature to default value
 */
function resetFeature(key, cwd = process.cwd()) {
  const configPath = getFeaturesConfigPath(cwd);
  if (!configPath) return false;

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
    } catch {}
  }

  if (configPath.endsWith('mip.yml') && config.features) {
    delete config.features[key];
  } else {
    delete config[key];
  }

  fs.writeFileSync(configPath, yaml.dump(config, { indent: 2 }));
  return true;
}

/**
 * Generate full config file with all features (for mip --genconfig)
 */
function generateConfigFile(cwd = process.cwd()) {
  const configPath = path.join(cwd, 'mip.config.yml');
  
  if (fs.existsSync(configPath)) {
    console.log(`⚠️ Config file already exists: ${configPath}`);
    console.log('   Use --force to overwrite');
    return false;
  }

  let yamlContent = `# ────────────────────────────────────────────────
# MIP Features Configuration
# Generated: ${new Date().toISOString()}
# ────────────────────────────────────────────────
# Documentation: https://mipdocs.fwh.is/features
#
# Master switch - set to false to disable ALL feature modifications
# config.enabled: true
#
# To enable/disable a feature:
#   mip config set features.install.parallel true
# Or edit this file manually
# ────────────────────────────────────────────────

`;

  const categories = {};
  for (const [key, value] of Object.entries(DEFAULT_FEATURES)) {
    const category = key.split('.')[0];
    if (!categories[category]) categories[category] = {};
    categories[category][key] = value;
  }

  for (const [category, items] of Object.entries(categories)) {
    yamlContent += `\n# === ${category.toUpperCase()} ===\n`;
    for (const [key, value] of Object.entries(items)) {
      const desc = FEATURE_DESCRIPTIONS[key] || '';
      yamlContent += `${key}: ${value}  # ${desc}\n`;
    }
  }

  fs.writeFileSync(configPath, yamlContent, 'utf8');
  return configPath;
}

/**
 * Check if feature is enabled
 * Если фичи выключены глобально - всегда возвращаем false
 */
function isFeatureEnabled(key, cwd = process.cwd()) {
  const features = loadFeatures(cwd);
  if (Object.keys(features).length === 0 && features.constructor === Object) {
    return false;
  }

  // If global switch disabled, treat all features as disabled.
  if (loadFeatures(cwd)['config.enabled'] === false) {
    return false;
  }

  return features[key] === true;
}

/**
 * Check if feature is disabled
 */
function isFeatureDisabled(key, cwd = process.cwd()) {
  const features = loadFeatures(cwd);
  if (Object.keys(features).length === 0 && features.constructor === Object) {
    return true;
  }
  return features[key] === false;
}

/**
 * Get all feature descriptions
 */
function getFeatureDescriptions() {
  return { ...FEATURE_DESCRIPTIONS };
}

/**
 * Get all feature keys
 */
function getAllFeatureKeys() {
  return Object.keys(DEFAULT_FEATURES);
}

/**
 * Get all features with their values and descriptions
 */
function getAllFeaturesWithDescriptions(cwd = process.cwd()) {
  const features = loadFeatures(cwd);
  const result = [];

  for (const key of Object.keys(DEFAULT_FEATURES)) {
    result.push({
      key,
      value: features[key],
      default: DEFAULT_FEATURES[key],
      description: FEATURE_DESCRIPTIONS[key] || 'No description',
      isDefault: features[key] === DEFAULT_FEATURES[key]
    });
  }

  return result;
}

/**
 * Print all features in readable format
 */
function printFeatures(cwd = process.cwd()) {
  const features = loadFeatures(cwd);
  
  // 👇 Если фичи выключены - показываем сообщение
  if (Object.keys(features).length === 0 && features.constructor === Object) {
    console.log('\n⚠️ Features are currently DISABLED');
    console.log('   Set "config.enabled: true" in mip.config.yml');
    console.log('   Or run: mip config set features.config.enabled true\n');
    return;
  }

  const descriptions = FEATURE_DESCRIPTIONS;

  console.log('\n📋 MIP Features Configuration\n');
  console.log('═'.repeat(70));

  let currentCategory = '';
  for (const [key, value] of Object.entries(features).sort()) {
    const category = key.split('.')[0];
    if (category !== currentCategory) {
      currentCategory = category;
      console.log(`\n${'▸'.padStart(2)} ${category.toUpperCase()}`);
      console.log('─'.repeat(70));
    }

    const status = value === true ? '✅' : value === false ? '❌' : '⚪';
    const desc = descriptions[key] || '';
    const defaultValue = DEFAULT_FEATURES[key];
    const isDefault = value === defaultValue;

    console.log(
      `  ${status} ${key.padEnd(30)} ${String(value).padEnd(10)} ${isDefault ? '(default)' : ''}`
    );
    if (desc) {
      console.log(`     ${' '.repeat(34)}${desc}`);
    }
  }

  console.log('\n═'.repeat(70));
  console.log(`\n💡 To change a feature: mip config set features.<key> <value>`);
  console.log(`💡 To disable ALL features: mip config set features.config.enabled false`);
  console.log(`📄 Config file: ${getFeaturesConfigPath(process.cwd()) || 'not found'}`);
}

/**
 * Проверка, включена ли система фич глобально
 */
function isFeaturesEnabled(cwd = process.cwd()) {
  const configPath = getFeaturesConfigPath(cwd);
  if (!configPath) return true;

  const loaded = loadFeatures(cwd);

  // When loadFeatures returns empty object - global switch is disabled.
  if (Object.keys(loaded).length === 0 && loaded.constructor === Object) return false;

  // Support both representations.
  if (loaded['config.enabled'] === false) return false;
  if (loaded.config && typeof loaded.config === 'object' && loaded.config.enabled === false) return false;

  return true;
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  DEFAULT_FEATURES,
  FEATURE_DESCRIPTIONS,
  getFeaturesConfigPath,
  loadFeatures,
  getFeature,
  setFeature,
  resetFeature,
  generateConfigFile,
  isFeatureEnabled,
  isFeatureDisabled,
  isFeaturesEnabled, // 👈 НОВАЯ ФУНКЦИЯ
  getFeatureDescriptions,
  getAllFeatureKeys,
  getAllFeaturesWithDescriptions,
  printFeatures,
};