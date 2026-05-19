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

const fs = require('fs');
const path = require('path');
const os = require('os');

function link(packageName) {
  const globalLinkDir = path.join(os.homedir(), '.mip-links');
  
  if (!packageName) {
    // Создаем ссылку из текущего пакета
    const pkgPath = path.join(process.cwd(), 'mip.json');
    if (!fs.existsSync(pkgPath)) {
      console.log('❌ No mip.json found in current directory');
      console.log('💡 Run "mip init" first');
      return;
    }
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const linkPath = path.join(globalLinkDir, pkg.name);
    
    fs.mkdirSync(globalLinkDir, { recursive: true });
    
    if (fs.existsSync(linkPath)) {
      fs.unlinkSync(linkPath);
    }
    
    fs.symlinkSync(process.cwd(), linkPath, 'junction');
    console.log(`✅ Created global link: ${pkg.name} -> ${process.cwd()}`);
    return;
  }
  
  // Устанавливаем связанный пакет в текущий проект
  const linkPath = path.join(globalLinkDir, packageName);
  
  if (!fs.existsSync(linkPath)) {
    console.log(`❌ No global link found for "${packageName}"`);
    console.log('\n📦 Available links:');
    
    if (fs.existsSync(globalLinkDir)) {
      const links = fs.readdirSync(globalLinkDir);
      links.forEach(link => {
        const target = fs.readlinkSync(path.join(globalLinkDir, link));
        console.log(`  • ${link} -> ${target}`);
      });
    }
    return;
  }
  
  const target = fs.readlinkSync(linkPath);
  const targetPkgPath = path.join(target, 'mip.json');
  
  if (!fs.existsSync(targetPkgPath)) {
    console.log(`❌ Linked package is invalid (no mip.json)`);
    return;
  }
  
  const targetPkg = JSON.parse(fs.readFileSync(targetPkgPath, 'utf8'));
  const modulesDir = path.join(process.cwd(), 'node_modules');
  const installPath = path.join(modulesDir, packageName);
  
  fs.mkdirSync(modulesDir, { recursive: true });
  
  if (fs.existsSync(installPath)) {
    fs.rmSync(installPath, { recursive: true, force: true });
  }
  
  fs.symlinkSync(target, installPath, 'junction');
  
  // Добавляем в mip.json как linked dependency
  const projectPkgPath = path.join(process.cwd(), 'mip.json');
  if (fs.existsSync(projectPkgPath)) {
    const projectPkg = JSON.parse(fs.readFileSync(projectPkgPath, 'utf8'));
    if (!projectPkg.linkedDependencies) projectPkg.linkedDependencies = {};
    projectPkg.linkedDependencies[packageName] = target;
    fs.writeFileSync(projectPkgPath, JSON.stringify(projectPkg, null, 2));
  }
  
  console.log(`✅ Linked ${packageName}@${targetPkg.version} -> ${target}`);
}

module.exports = { link };