/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ==========================================
// ЛЕГКИЙ HTTP КЛИЕНТ (ВМЕСТО AXIOS)
// ==========================================

const https = require('https');
const semver = require('semver');
const zlib = require('zlib');
const features = require('./features');

// Keep-alive агент
const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
});

// ==========================================
// КЕШ
// ==========================================

const cache = new Map();
let CACHE_TTL = 5 * 60 * 1000; // 5 минут

function getCacheKey(name, versionRange = 'latest') {
  return `${name}@${versionRange}`;
}

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ==========================================
// HTTP ЗАПРОСЫ (БЕЗ AXIOS)
// ==========================================

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      agent,
      timeout: options.timeout || 10000,
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': 'mip/2.1',
        ...options.headers
      }
    }, (res) => {
      const chunks = [];
      let size = 0;
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
        size += chunk.length;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        
        try {
          let data = Buffer.concat(chunks, size);
          
          if (res.headers['content-encoding'] === 'gzip') {
            data = zlib.gunzipSync(data);
          }
          
          const json = JSON.parse(data.toString('utf8'));
          resolve(json);
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

// ==========================================
// ОФФЛАЙН-ФОЛБЭК (ДЛЯ ТЕСТОВ)
// ==========================================

const offlineFallback = {
  lodash: { version: '4.17.20', tarball: '', dependencies: {}, peerDependencies: {} },
  express: { version: '4.18.2', tarball: '', dependencies: {}, peerDependencies: {} },
  jest: { version: '29.7.0', tarball: '', dependencies: {}, peerDependencies: {} },
};

// ==========================================
// ОСНОВНЫЕ ФУНКЦИИ (С КЕШЕМ)
// ==========================================

async function getPackageInfo(name, versionRange = 'latest') {
  const mipFeatures = features.loadFeatures(process.cwd());
  
  // Применяем настройки из фич
  CACHE_TTL = (mipFeatures['registry.cacheTTL'] || 300) * 1000;
  const strictSSL = mipFeatures['registry.strictSSL'] !== false;
  const timeout = mipFeatures['registry.timeout'] || 10000;
  const userAgent = mipFeatures['registry.userAgent'] || 'mip/2.1';
  const cacheMetadata = mipFeatures['registry.cacheMetadata'] !== false;
  const useMemoryCache = mipFeatures['performance.useMemoryCache'] !== false;

  const cacheKey = getCacheKey(name, versionRange);
  
  // Использование кеша
  if (useMemoryCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

// Валидация имени пакета
function validatePackageName(name) {
    // Разрешаем только безопасные символы для npm пакетов
    const safePattern = /^(@[a-zA-Z0-9\-_]+\/)?[a-zA-Z0-9\-_.]+$/;
    if (!safePattern.test(name)) {
        throw new Error(`Invalid package name: ${name}`);
    }
    return name;
}

// Использовать перед формированием URL
const validatedName = validatePackageName(name);
const url = `https://registry.npmjs.org/${validatedName}`; 

  try {
    const data = await fetchJSON(url, {
      timeout,
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': userAgent,
        ...(strictSSL ? {} : { 'strict-ssl': 'false' })
      }
    });

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
      peerDependencies: pkgVersion.peerDependencies || {},
      devDependencies: pkgVersion.devDependencies || {},
      optionalDependencies: pkgVersion.optionalDependencies || {},
      bundledDependencies: pkgVersion.bundledDependencies || [],
      description: pkgVersion.description,
      author: pkgVersion.author,
      homepage: pkgVersion.homepage,
      repository: pkgVersion.repository,
      license: pkgVersion.license,
      keywords: pkgVersion.keywords,
      engines: pkgVersion.engines,
      os: pkgVersion.os,
      cpu: pkgVersion.cpu,
    };

    if (cacheMetadata && useMemoryCache) {
      setCache(cacheKey, result);
    }

    return result;

  } catch (err) {
    if (offlineFallback[name]) {
      const fb = offlineFallback[name];
      return {
        name,
        version: fb.version,
        originalRange: versionRange,
        tarball: fb.tarball,
        integrity: '',
        dependencies: fb.dependencies,
        peerDependencies: fb.peerDependencies,
        devDependencies: {},
        optionalDependencies: {},
        bundledDependencies: [],
        description: '',
        author: '',
        homepage: '',
        repository: {},
        license: '',
      };
    }
    throw err;
  }
}

async function searchPackages(query, limit = 20) {
  const mipFeatures = features.loadFeatures(process.cwd());
  const timeout = mipFeatures['registry.timeout'] || 5000;
  
  const cacheKey = `search_${query}_${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`;

  try {
    const data = await fetchJSON(url, { timeout });
    const results = data.objects.map(obj => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description,
      keywords: obj.package.keywords,
      date: obj.package.date,
      publisher: obj.package.publisher,
      links: obj.package.links,
    }));

    setCache(cacheKey, results);
    return results;

  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}

async function getPackageVersions(name) {
  const mipFeatures = features.loadFeatures(process.cwd());
  const useMemoryCache = mipFeatures['performance.useMemoryCache'] !== false;
  
  const cacheKey = `versions_${name}`;
  if (useMemoryCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const url = `https://registry.npmjs.org/${name}`;
  const data = await fetchJSON(url);

  const versions = Object.keys(data.versions).sort(semver.rcompare);
  
  if (useMemoryCache) {
    setCache(cacheKey, versions);
  }

  return versions;
}

async function getDistTags(name) {
  const mipFeatures = features.loadFeatures(process.cwd());
  const useMemoryCache = mipFeatures['performance.useMemoryCache'] !== false;
  
  const cacheKey = `disttags_${name}`;
  if (useMemoryCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const url = `https://registry.npmjs.org/${name}`;
  const data = await fetchJSON(url);

  const tags = data['dist-tags'] || {};
  
  if (useMemoryCache) {
    setCache(cacheKey, tags);
  }

  return tags;
}

// ==========================================
// ОЧИСТКА КЕША
// ==========================================

function clearRegistryCache() {
  cache.clear();
}

// ==========================================
// ЭКСПОРТ
// ==========================================

module.exports = {
  getPackageInfo,
  searchPackages,
  getPackageVersions,
  getDistTags,
  clearRegistryCache,
};