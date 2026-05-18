const fs = require('fs');
const path = require('path');

function updateDependencies(name, version, isDev = false) {
  const pkgPath = path.join(process.cwd(), 'mip.json');
  const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  const depType = isDev ? 'devDependencies' : 'dependencies';
  
  if (!config[depType]) {
    config[depType] = {};
  }
  
  config[depType][name] = version;
  
  fs.writeFileSync(pkgPath, JSON.stringify(config, null, 2));
}

function removeDependency(name) {
  const pkgPath = path.join(process.cwd(), 'mip.json');
  const config = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  delete config.dependencies?.[name];
  delete config.devDependencies?.[name];
  
  fs.writeFileSync(pkgPath, JSON.stringify(config, null, 2));
}

module.exports = { updateDependencies, removeDependency };