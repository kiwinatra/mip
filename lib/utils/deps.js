const fs = require('fs');
const path = require('path');

function getConfigPath(cwd = process.cwd()) {
    // Приоритет: mip.json > package.json
    const mipPath = path.join(cwd, 'mip.json');
    if (fs.existsSync(mipPath)) return mipPath;
    
    const npmPath = path.join(cwd, 'package.json');
    if (fs.existsSync(npmPath)) return npmPath;
    
    return null;
}

function readConfig(cwd = process.cwd()) {
    const configPath = getConfigPath(cwd);
    if (!configPath) return null;
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function writeConfig(config, cwd = process.cwd()) {
    const configPath = getConfigPath(cwd);
    if (!configPath) return;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function getDependencies(cwd = process.cwd()) {
    const config = readConfig(cwd);
    if (!config) return { dependencies: {}, devDependencies: {} };
    return {
        dependencies: config.dependencies || {},
        devDependencies: config.devDependencies || {}
    };
}

function getScripts(cwd = process.cwd()) {
    const config = readConfig(cwd);
    if (!config) return {};
    return config.scripts || {};
}

function addDependency(name, version, isDev = false, cwd = process.cwd()) {
    const config = readConfig(cwd);
    if (!config) return;
    
    const key = isDev ? 'devDependencies' : 'dependencies';
    if (!config[key]) config[key] = {};
    config[key][name] = version;
    
    writeConfig(config, cwd);
}

function removeDependency(name, cwd = process.cwd()) {
    const config = readConfig(cwd);
    if (!config) return;
    
    if (config.dependencies) delete config.dependencies[name];
    if (config.devDependencies) delete config.devDependencies[name];
    
    writeConfig(config, cwd);
}

module.exports = {
    getConfigPath,
    readConfig,
    writeConfig,
    getDependencies,
    getScripts,
    addDependency,
    removeDependency
};