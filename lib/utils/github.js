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

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function isGitHubUrl(packageName) {
  return packageName.includes('github:') || 
         packageName.includes('git+https://github.com') ||
         /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/.test(packageName);
}

function parseGitHubPackage(packageName) {
  let user, repo, branch = 'main';
  
  if (packageName.startsWith('github:')) {
    [, packageName] = packageName.split(':');
  }
  
  if (packageName.includes('#')) {
    [packageName, branch] = packageName.split('#');
  }
  
  [user, repo] = packageName.split('/');
  return { user, repo, branch };
}

async function installFromGitHub(packageName, targetDir) {
  const { user, repo, branch } = parseGitHubPackage(packageName);
  const repoUrl = `https://github.com/${user}/${repo}.git`;
  
  console.log(`  📦 Cloning ${user}/${repo}@${branch}...`);
  
  if (!fs.existsSync(targetDir)) {
    execSync(`git clone --depth 1 --branch ${branch} ${repoUrl} ${targetDir}`, {
      stdio: 'pipe'
    });
  }
  
  // Удаляем .git для экономии места
  fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true });
  
  return {
    name: repo,
    version: `github:${user}/${repo}#${branch}`,
    dependencies: {}
  };
}

module.exports = { isGitHubUrl, parseGitHubPackage, installFromGitHub };