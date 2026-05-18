const axios = require('axios');
const semver = require('semver');
const https = require('https');

// Keep-alive агент для быстрых повторных запросов
const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10
});

// Простой кеш в памяти
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getPackageInfo(name, versionRange = 'latest') {
  const cacheKey = `${name}@${versionRange}`;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  const url = `https://registry.npmjs.org/${name}`;
  
  const response = await axios.get(url, {
    timeout: 10000,
    httpsAgent: agent,
    headers: { 'Accept-Encoding': 'gzip' }
  });
  
  const data = response.data;
  const versions = Object.keys(data.versions).sort(semver.rcompare);
  
  let targetVersion;
  
  if (versionRange === 'latest') {
    targetVersion = data['dist-tags'].latest;
  } else if (semver.valid(versionRange)) {
    targetVersion = versions.find(v => v === versionRange);
  } else {
    targetVersion = semver.maxSatisfying(versions, versionRange);
  }
  
  if (!targetVersion) {
    throw new Error(`Version "${versionRange}" not found for ${name}`);
  }
  
  const pkgVersion = data.versions[targetVersion];
  
  const result = {
    name,
    version: targetVersion,
    originalRange: versionRange,
    tarball: pkgVersion.dist.tarball,
    integrity: pkgVersion.dist.integrity,
    dependencies: pkgVersion.dependencies || {},
    description: pkgVersion.description
  };
  
  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  
  return result;
}

module.exports = { getPackageInfo };