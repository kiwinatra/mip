---
title: "mip super-install — super-fast package installation"
description: "The super-install command uses multi-threaded downloading, HTTP/2, parallel extraction, and super-cache for the fastest possible dependency installation."
---

# mip super-install

::: callout info "What is this?" icon:zap
`mip super-install` is a high-performance alternative to the standard `mip install`. It uses **parallel downloading**, **HTTP/2**, **streaming extraction**, and **aggressive caching** to install packages an order of magnitude faster. Ideal for CI/CD, large projects, and situations where every second counts.
:::

## Syntax

```bash
mip super-install <packages...> [options]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `packages` | array | ✅ | List of packages to install (e.g., `express lodash`) |

## How it works

1. **Super-resolution** — uses `FastResolver` with aggressive caching for instant dependency resolution.

2. **Parallel downloading** — `ParallelDownloader` downloads up to 10 packages simultaneously using HTTP/2.

3. **Streaming extraction** — `StreamExtractor` extracts archives as they download, without waiting for all downloads to complete.

4. **Multi-threaded extraction** — uses all CPU cores for parallel package extraction.

5. **Super-cache** — `SuperCache` caches:
   - Downloaded tarball archives.
   - Extracted packages.
   - Resolution results.

6. **Lockfile update** — pins all installed versions.

## Technologies

| Component | Purpose | Advantage |
|-----------|---------|-----------|
| **FastResolver** | Dependency resolution | Aggressive caching, 10x faster |
| **ParallelDownloader** | Package downloading | Up to 10 packages at once |
| **HTTP/2 Agent** | Network requests | Multiplexing, faster than HTTP/1.1 |
| **StreamExtractor** | Extraction | Streaming processing without disk save |
| **SuperCache** | Caching | Intelligent multi-level caching |

## Examples

::: tabs
== tab "Install with super-speed"
```bash
mip super-install express lodash axios
```

**Output:**
```
🚀 SUPER FAST INSTALLATION MODE

📋 Resolving dependencies...
  ✅ Resolved 42 packages in 320ms

⬇️ Downloading packages...
  ████████████████████████████████████ 100% 42/42
  ✅ Downloaded 23.5 MB in 1.8s (13.1 MB/s)
  🧠 sha256 computed for 42 packages in 45ms

📦 Extracting packages...
  ✅ Extracted 42 packages in 890ms

⚡ TOTAL: 2.1s (20.0 packages/sec)
💾 Cache stats: { hits: 34, misses: 8, size: '45.2 MB' }
```
:::
== tab "Speed comparison"
```bash
time mip install express       # ~8.2s
time mip super-install express # ~1.5s
```
:::

## Common errors

::: callout warning "❌ Resolve failed" icon:alert-triangle
**Cause:** Package not found or version does not exist.

**Solution:**
1. Check the package name: `mip search <package>`
2. Check the version: `mip info <package>`
3. Fix the name or version.
:::

::: callout warning "❌ Download failed" icon:alert-circle
**Cause:** Network issues or the registry is unavailable.

**Solution:**
1. Check your internet connection.
2. Check registry availability: `mip doctor`
3. Try again later.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip super-install` is ideal for:
- **CI/CD** — saves minutes in every pipeline.
- **Large projects** — with thousands of dependencies.
- **Dev containers** — fast environment rebuilds.

**Best practices:**
1. Use `super-install` for cold installation.
2. Use `install` for interactive work (fewer resources).
3. Clear cache: `mip cache clean` if issues arise.
:::

## Related commands

- [mip install](/commands/install) — standard installation (slower but more stable).
- [mip ci](/commands/ci) — CI installation (optimized for stability).
- [mip cache clean](/commands/cache) — clear cache.

::: collapsible "🧠 Why is super-install so fast?"
Installation stage comparison:

| Stage | `install` | `super-install` |
|-------|-----------|-----------------|
| Resolution | Sequential, no cache | Parallel, aggressive caching |
| Download | One package at a time | Up to 10 packages at once (HTTP/2) |
| Extraction | One package at a time | Streaming + all CPU cores |
| Caching | Basic (tarball) | 3-level (resolution + tarball + extracted) |

**Result:** In large projects, `super-install` can be **5-10x faster** than regular installation.

**When not to use:**
- Small projects (overhead may outweigh benefits).
- Limited memory (extraction uses more RAM).
- Unstable connection (parallel downloads may worsen issues).
:::

::: collapsible "🔧 SuperInstaller architecture"
```javascript
class SuperInstaller {
  constructor() {
    this.resolver = new FastResolver();      // Caching resolver
    this.http2 = new Http2Agent();           // HTTP/2 connections
    this.downloader = new ParallelDownloader(); // Parallel downloading
    this.cache = new SuperCache();           // 3-level cache
  }

  async install(packages) {
    // 1. Super-resolution (cached)
    const tree = await this.resolver.resolveTree(packages);
    
    // 2. Parallel downloading (HTTP/2)
    const downloaded = await this.downloader.downloadPackages(tree);
    
    // 3. Streaming extraction (all cores)
    await this.extractPackages(downloaded);
    
    // 4. Lockfile update
    this.updateLockfile(tree);
  }
}
```

**Caching:**
1. **Level 1** — resolution (remembers versions).
2. **Level 2** — tarball archives (saves downloaded files).
3. **Level 3** — extracted packages (ready to use).
:::
