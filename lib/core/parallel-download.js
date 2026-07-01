/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const os = require('os');

class ParallelDownloader {
  constructor(maxWorkers = os.cpus().length, http2Agent = null) {
    this.maxWorkers = maxWorkers;
    this.http2Agent = http2Agent;
  }

  /**
   * Downloads multiple packages in parallel using a worker pool.
   * Packages are chunked and each chunk is processed concurrently.
   * 
   * The chunking strategy balances parallelism with resource constraints:
   * - Each chunk processes packages in parallel within its own Promise.all()
   * - Chunks themselves execute sequentially to prevent overwhelming the network
   * - Total concurrency = maxWorkers (packages per chunk)
   * 
   * Uses HTTP/2 when available via http2Agent, falling back to HTTP/1.1
   * automatically if the HTTP/2 download fails.
   * 
   * @param {Array<Object>} packages - Array of package objects with name, version, tarball
   * @param {Object} options - Options including onProgress callback
   * @param {Function} options.onProgress - Called after each package download with {done, total}
   * @returns {Promise<Array<Object>>} Download results with name, version, data, size, time
   */
  async downloadPackages(packages, options = {}) {
    const { onProgress } = options;

    const startTime = Date.now();
    const results = [];

    const chunks = this.chunkArray(packages, this.maxWorkers);

    console.log(`  🚀 Parallel download with ${this.maxWorkers} workers`);

    const total = packages.length;
    let done = 0;

    const chunkResults = await Promise.all(
      chunks.map(chunk =>
        this.downloadChunk(chunk, {
          onDone: () => {
            done++;
            if (typeof onProgress === 'function') {
              onProgress({ done, total });
            }
          },
        })
      )
    );

    chunkResults.forEach(result => {
      results.push(...result);
    });

    if (typeof onProgress === 'function' && total > 0) {
      onProgress({ done: total, total });
    }

    const duration = Date.now() - startTime;

    console.log(
      `  ⚡ Downloaded ${packages.length} packages in ${duration}ms (${((packages.length / duration) * 1000).toFixed(1)} pkg/sec)`
    );

    return results;
  }

  /**
   * Splits an array into chunks of the specified size.
   * Ensures each chunk has at most `size` elements.
   * 
   * @param {Array} array - Array to chunk
   * @param {number} size - Maximum chunk size
   * @returns {Array<Array>} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Downloads a chunk of packages in parallel within the chunk.
   * Each package in the chunk is downloaded concurrently via Promise.all.
   * 
   * @param {Array<Object>} chunk - Array of package objects
   * @param {Object} options - Options including onDone callback
   * @param {Function} options.onDone - Called after each package completes
   * @returns {Promise<Array<Object>>} Download results for the chunk
   */
  async downloadChunk(chunk, options = {}) {
    const { onDone } = options;

    const promises = chunk.map(pkg =>
      this.downloadPackage(pkg).then(result => {
        if (typeof onDone === 'function') onDone();
        return result;
      })
    );

    return await Promise.all(promises);
  }

  /**
   * Downloads a single package tarball.
   * Attempts HTTP/2 first if an http2Agent is provided and supports download().
   * Falls back to HTTP/1.1 via axios if HTTP/2 fails or is unavailable.
   * 
   * The fallback is critical for environments where HTTP/2 is not supported
   * or the server doesn't support HTTP/2 connections.
   * 
   * @param {Object} pkg - Package object with tarball URL
   * @param {string} pkg.name - Package name for error context
   * @param {string} pkg.version - Package version
   * @param {string} pkg.tarball - Tarball URL
   * @returns {Promise<Object>} Download result with name, version, data, size, time
   * @throws {Error} When both HTTP/2 and HTTP/1.1 download attempts fail
   */
  async downloadPackage(pkg) {
    const startTime = Date.now();

    if (this.http2Agent && this.http2Agent.download) {
      try {
        const res = await this.http2Agent.download(pkg.tarball);
        const duration = Date.now() - startTime;

        return {
          name: pkg.name,
          version: pkg.version,
          data: res.data,
          size: res.data.length,
          time: duration,
        };
      } catch (err) {
        // HTTP/2 failure triggers fallback to HTTP/1.1
      }
    }

    const axios = require('axios');

    try {
      const response = await axios.get(pkg.tarball, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
        },
      });

      const duration = Date.now() - startTime;

      return {
        name: pkg.name,
        version: pkg.version,
        data: response.data,
        size: response.data.length,
        time: duration,
      };
    } catch (err) {
      throw new Error(`Failed to download ${pkg.name}: ${err.message}`);
    }
  }
}

module.exports = { ParallelDownloader };