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

const { LRUCache } = require('lru-cache');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SuperCache {
  constructor(options = {}) {
    // Встроенный LRU кеш в памяти
    this.memCache = new LRUCache({
      max: options.maxMemoryItems || 1000,
      ttl: options.ttl || 1000 * 60 * 10, // 10 минут
      updateAgeOnGet: true,
    });

    this.diskCachePath = path.join(process.cwd(), '.mip', 'cache');
    this.stats = { hits: 0, misses: 0 };

    // TTL для диска (чтобы не отдавать устаревшие данные)
    this.diskTtlMs = options.diskTtlMs || options.ttl || 1000 * 60 * 10;

    // Чтобы при параллельных запросах к одному key не делать много I/O на диске
    this.inFlight = new Map(); // cacheKey -> Promise<any>

    if (!fs.existsSync(this.diskCachePath)) {
      fs.mkdirSync(this.diskCachePath, { recursive: true });
    }
  }

  getCacheKey(name, version) {
    return crypto.createHash('md5').update(`${name}@${version}`).digest('hex');
  }

  getDiskPath(cacheKey) {
    return path.join(this.diskCachePath, `${cacheKey}.json`);
  }

  async readDisk(cacheKey) {
    const diskPath = this.getDiskPath(cacheKey);
    const stat = await fs.promises.stat(diskPath).catch(() => null);
    if (!stat) return null;

    // Если файл старее TTL — считаем кэшем невалидным
    if (this.diskTtlMs > 0) {
      const age = Date.now() - stat.mtimeMs;
      if (age > this.diskTtlMs) return null;
    }

    try {
      const raw = await fs.promises.readFile(diskPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null; // поврежденный файл
    }
  }

  async get(name, version) {
    const key = this.getCacheKey(name, version);

    // Проверяем память (быстрее всего)
    if (this.memCache.has(key)) {
      this.stats.hits++;
      return this.memCache.get(key);
    }

    // Проверяем диск (async, с in-flight дедупом)
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

  async set(name, version, data) {
    const key = this.getCacheKey(name, version);

    // Сохраняем в память
    this.memCache.set(key, data);

    // Сохраняем на диск асинхронно (не блокируем запрос)
    const diskPath = this.getDiskPath(key);

    // Не ждём запись, но фиксируем ошибки молча
    void fs.promises.writeFile(diskPath, JSON.stringify(data), 'utf8').catch(() => {});
  }

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
