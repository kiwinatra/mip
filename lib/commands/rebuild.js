/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const store = require('../utils/store');
const { loadLangForCwd, getI18n } = require('../i18n');
const {
  header,
  success,
  warn,
  error,
  dim,
  info,
  packageName,
  version,
  bold,
  green,
  red,
  yellow,
  cyan,
} = require('../ui');

// ==========================================
// PRIORITY ORDER FOR BUILD SCRIPTS
// ==========================================
const BUILD_SCRIPT_PRIORITY = ['install', 'rebuild', 'preinstall', 'build'];

// ==========================================
// MAIN REBUILD FUNCTION
// ==========================================

async function rebuild(packages, options = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const { force = false, dryRun = false, quiet = false, script: customScript = null } = options;

  // Step 1: Read lockfile
  const lockData = readLockfile();
  if (!lockData) {
    console.error(error('❌ mip-lock.yml not found or cannot be parsed'));
    process.exit(1);
  }

  const lockPackages = lockData.packages || {};
  const allPackageKeys = Object.keys(lockPackages);

  if (allPackageKeys.length === 0) {
    console.log(warn('⚠️ No packages found in mip-lock.yml'));
    return;
  }

  // Step 2: Determine target packages
  let targetKeys;
  if (packages && packages.length > 0) {
    // Filter only requested packages that exist in lockfile
    targetKeys = packages.filter(pkgName => {
      const found = allPackageKeys.some(key => key.startsWith(`${pkgName}@`));
      if (!found) {
        console.log(warn(`⚠️ Package "${pkgName}" not found in mip-lock.yml. Skipping.`));
      }
      return found;
    }).map(pkgName => {
      return allPackageKeys.find(key => key.startsWith(`${pkgName}@`));
    });
  } else {
    targetKeys = allPackageKeys;
  }

  if (targetKeys.length === 0) {
    console.log(warn('⚠️ No packages to rebuild'));
    return;
  }

  if (!quiet) {
    console.log(header(`🔨 Rebuilding ${targetKeys.length} package(s)...`));
    console.log('');
  }

  // Step 3: Process each package
  let rebuilt = 0;
  let skipped = 0;
  let errors = 0;

  for (const pkgKey of targetKeys) {
    const pkgInfo = lockPackages[pkgKey];
    const pkgName = pkgKey.split('@')[0];
    const pkgVersion = pkgInfo.version;

    // Get store path for the package
    const storePath = store.getPackageStorePath(pkgName, pkgVersion);
    const packageDir = path.join(storePath, 'package');

    // Check if store path exists
    if (!fs.existsSync(packageDir)) {
      if (!quiet) {
        console.log(warn(`⚠️ Package "${pkgName}@${pkgVersion}" not found in global store at:`));
        console.log(dim(`   ${packageDir}`));
      }
      skipped++;
      continue;
    }

    // Read package.json from store
    const pkgJsonPath = path.join(packageDir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      if (!quiet) {
        console.log(warn(`⚠️ Package "${pkgName}@${pkgVersion}" has no package.json in store`));
      }
      skipped++;
      continue;
    }

    let pkgJson;
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    } catch {
      if (!quiet) {
        console.log(error(`❌ Failed to parse package.json for "${pkgName}@${pkgVersion}"`));
      }
      errors++;
      continue;
    }

    // Check for build scripts
    const scripts = pkgJson.scripts || {};
    let foundScript = null;

    if (customScript) {
      // If custom script specified, use it directly
      if (scripts[customScript]) {
        foundScript = customScript;
      } else {
        if (!quiet) {
          console.log(warn(`⚠️ Package "${pkgName}@${pkgVersion}" has no script "${customScript}"`));
        }
        if (force) {
          foundScript = customScript;
        } else {
          skipped++;
          continue;
        }
      }
    } else {
      // Check priority order
      for (const scriptName of BUILD_SCRIPT_PRIORITY) {
        if (scripts[scriptName]) {
          foundScript = scriptName;
          break;
        }
      }
    }

    // No script found
    if (!foundScript) {
      if (force) {
        // With --force, try "rebuild" as default
        foundScript = 'rebuild';
      } else {
        if (!quiet) {
          console.log(warn(`⚠️ Package "${packageName(pkgName)}@${version(pkgVersion)}" has no build scripts. Skipping.`));
        }
        skipped++;
        continue;
      }
    }

    // Dry run
    if (dryRun) {
      console.log(info(`🔧 Would rebuild "${pkgName}@${pkgVersion}" (${foundScript})`));
      rebuilt++;
      continue;
    }

    // Execute build script
    if (!quiet) {
      console.log(info(`🔧 Rebuilding "${pkgName}@${pkgVersion}" (${foundScript})...`));
    }

    try {
      await runBuildScript(packageDir, foundScript, pkgName, pkgVersion, quiet);
      if (!quiet) {
        console.log(success(`✅ Rebuilt: ${packageName(pkgName)}@${version(pkgVersion)}`));
      }
      rebuilt++;
    } catch (err) {
      console.log(error(`❌ Error: ${pkgName}@${pkgVersion}: ${err.message}`));
      errors++;
    }

    console.log('');
  }

  // Step 4: Summary
  if (!dryRun) {
    console.log(header(`✅ Done. Rebuilt: ${green(String(rebuilt))}, Skipped: ${yellow(String(skipped))}, Errors: ${red(String(errors))}.`));
  } else {
    console.log(header(`🔍 Dry-run complete. Would rebuild: ${green(String(rebuilt))}, Skipped: ${yellow(String(skipped))}`));
  }
}

// ==========================================
// READ LOCKFILE
// ==========================================

function readLockfile() {
  const lockPath = path.join(process.cwd(), 'mip-lock.yml');
  
  if (!fs.existsSync(lockPath)) {
    // Try JSON format as fallback
    const jsonLockPath = path.join(process.cwd(), 'mip-lock.json');
    if (fs.existsSync(jsonLockPath)) {
      try {
        return JSON.parse(fs.readFileSync(jsonLockPath, 'utf8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    return yaml.load(fs.readFileSync(lockPath, 'utf8'));
  } catch {
    return null;
  }
}

// ==========================================
// RUN BUILD SCRIPT IN PACKAGE DIRECTORY
// ==========================================

function runBuildScript(cwd, scriptName, pkgName, pkgVersion, quiet) {
  return new Promise((resolve, reject) => {
    // Set up local npm cache to avoid polluting global npm cache
    const npmCacheDir = path.join(process.cwd(), '.npm-cache');
    if (!fs.existsSync(npmCacheDir)) {
      fs.mkdirSync(npmCacheDir, { recursive: true });
    }

    const env = {
      ...process.env,
      npm_config_cache: npmCacheDir,
      MIP_REBUILD: 'true',
      MIP_PACKAGE_NAME: pkgName,
      MIP_PACKAGE_VERSION: pkgVersion,
    };

    const child = spawn('npm', ['run', scriptName], {
      cwd,
      env,
      stdio: quiet ? 'ignore' : 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const err = new Error(`command exited with code ${code}`);
        err.code = code;
        reject(err);
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start build: ${err.message}`));
    });
  });
}

// ==========================================
// EXPORT
// ==========================================

module.exports = { rebuild };

