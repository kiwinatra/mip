/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const { LRUCache } = require('lru-cache');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SuperCache {
  constructor(options = {}) {
    this.memCache = new LRUCache({
      max: options.maxMemoryItems || 1000,
      ttl: options.ttl || 1000 * 60 * 10,
      updateAgeOnGet: true,
    });

    this.diskCachePath = path.join(process.cwd(), '.mip', 'cache');
    this.stats = { hits: 0, misses: 0 };

    this.diskTtlMs = options.diskTtlMs || options.ttl || 1000 * 60 * 10;

    this.inFlight = new Map();

    if (!fs.existsSync(this.diskCachePath)) {
      fs.mkdirSync(this.diskCachePath, { recursive: true });
    }
  }

  /**
   * Generates a deterministic cache key from package name and version.
   * MD5 hash is used for speed and to produce filesystem-safe filenames.
   * 
   * @param {string} name - Package name
   * @param {string} version - Package version
   * @returns {string} MD5 hash as hex string
   */
  getCacheKey(name, version) {
    return crypto.createHash('md5').update(`${name}@${version}`).digest('hex');
  }

  /**
   * Returns the filesystem path for a cached item.
   * 
   * @param {string} cacheKey - Cache key from getCacheKey()
   * @returns {string} Full filesystem path
   */
  getDiskPath(cacheKey) {
    return path.join(this.diskCachePath, `${cacheKey}.json`);
  }

  /**
   * Reads a cached item from disk.
   * Performs TTL validation based on file modification time.
   * Invalid data (corrupted JSON, expired) returns null.
   * 
   * @param {string} cacheKey - Cache key from getCacheKey()
   * @returns {Promise<Object|null>} Parsed data or null
   */
  async readDisk(cacheKey) {
    const diskPath = this.getDiskPath(cacheKey);
    const stat = await fs.promises.stat(diskPath).catch(() => null);
    if (!stat) return null;

    if (this.diskTtlMs > 0) {
      const age = Date.now() - stat.mtimeMs;
      if (age > this.diskTtlMs) return null;
    }

    try {
      const raw = await fs.promises.readFile(diskPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Retrieves a cached item with two-level lookup:
   * 1. In-memory LRU cache (fastest)
   * 2. Disk cache (slow, async)
   * 
   * In-flight deduplication prevents multiple concurrent reads of the same
   * cache key from performing disk I/O in parallel. The second and subsequent
   * concurrent requests for the same key wait for the first request to complete.
   * 
   * @param {string} name - Package name
   * @param {string} version - Package version
   * @returns {Promise<Object|null>} Cached data or null
   */
  async get(name, version) {
    const key = this.getCacheKey(name, version);

    if (this.memCache.has(key)) {
      this.stats.hits++;
      return this.memCache.get(key);
    }

    if (this.inFlight.has(key)) {
      const data = await this.inFlight.get(key);
      if (data !== null) {
        this.stats.hits++;
        this.memCache.set(key, data);
      } else {
        this.stats.misses++;
      }
      return data;
    }

    const p = (async () => {
      const data = await this.readDisk(key);
      if (data !== null) this.memCache.set(key, data);
      return data;
    })();

    this.inFlight.set(key, p);
    try {
      const data = await p;
      if (data !== null) this.stats.hits++;
      else this.stats.misses++;
      return data;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Stores a cached item in both memory and disk.
   * Disk write is fire-and-forget (void Promise) to avoid blocking
   * on I/O. This prioritizes latency over durability.
   * 
   * @param {string} name - Package name
   * @param {string} version - Package version
   * @param {Object} data - Data to cache
   * @returns {Promise<void>}
   */
  async set(name, version, data) {
    const key = this.getCacheKey(name, version);

    this.memCache.set(key, data);

    const diskPath = this.getDiskPath(key);

    void fs.promises.writeFile(diskPath, JSON.stringify(data), 'utf8').catch(() => {});
  }

  /**
   * Returns cache statistics including hit rate and memory usage.
   * 
   * @returns {Object} Statistics object with hits, misses, hitRate, memorySize
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate.toFixed(1)}%`,
      memorySize: this.memCache.size,
      memoryItems: this.memCache.size,
    };
  }

  /**
   * Completely clears both memory and disk caches.
   * Deletes all files in the cache directory asynchronously.
   * 
   * @returns {Promise<void>}
   */
  async clear() {
    this.memCache.clear();
    try {
      const files = await fs.promises.readdir(this.diskCachePath);
      await Promise.all(
        files.map(f => fs.promises.unlink(path.join(this.diskCachePath, f)).catch(() => {}))
      );
    } catch {
      // ignore
    }
    this.stats = { hits: 0, misses: 0 };
  }
}

module.exports = { SuperCache };