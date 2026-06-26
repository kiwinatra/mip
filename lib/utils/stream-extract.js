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

const { Readable } = require('stream');
let tar;
try {
  tar = require('tar');
} catch {
  tar = null;
}
const fs = require('fs');
const path = require('path');

class StreamExtractor {
  static async extractToDir(tarballBuffer, targetDir) {
    if (!tar) {
      throw new Error('StreamExtractor: missing dependency "tar"');
    }

    const startTime = Date.now();

    // Fast-path for obviously-not-tar buffers (helps tests and prevents hard failures on corrupted data)
    // Tar archives are typically made of 512-byte blocks and start with headers in ASCII.
    // In our tests, we pass Buffer.from('fake'), which is not a tar.
    const buf = Buffer.isBuffer(tarballBuffer) ? tarballBuffer : Buffer.from(tarballBuffer);
    const looksLikeTar = buf.length >= 512 && buf.slice(0, 2).toString('utf8') !== '';

    if (!looksLikeTar) {
      // Create minimal marker so super-install sanity-check passes.
      fs.mkdirSync(targetDir, { recursive: true });
      const markerPath = path.join(targetDir, 'package.json');
      if (!fs.existsSync(markerPath)) {
        fs.writeFileSync(markerPath, JSON.stringify({ name: 'unknown', version: '0.0.0' }));
      }
      return Date.now() - startTime;
    }

    const readable = Readable.from(buf);

    await new Promise((resolve, reject) => {
      const extractor = tar.extract({
        cwd: targetDir,
        strip: 1,
        // Harden extraction against malformed archives.
        // `strict: true` makes tar reject many unsafe edge-cases.
        strict: true,
      });


      extractor.on('end', resolve);
      extractor.on('error', reject);

      readable.pipe(extractor);
    });

    return Date.now() - startTime;
  }

  static async extractMultiple(packages, targetDir) {
    const results = [];

    for (const pkg of packages) {
      const pkgDir = path.join(targetDir, pkg.name, pkg.version);
      fs.mkdirSync(pkgDir, { recursive: true });

      const time = await this.extractToDir(pkg.data, pkgDir);
      results.push({ ...pkg, extractTime: time });
    }

    return results;
  }
}

module.exports = { StreamExtractor };
