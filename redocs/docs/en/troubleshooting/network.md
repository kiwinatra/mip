---
title: "Network & Registries"
description: "Problems with networks, registries, and how to solve them."
---

# Network & Registries 🌐

Network issues are among the most common problems when working with package managers. Here's how to fix them in MIP.

---

## 🔍 Diagnostics

### Check internet

```bash
# Check registry availability
curl -I https://registry.npmjs.org/

# Check DNS
nslookup registry.npmjs.org

# Check ping
ping -c 4 registry.npmjs.org
```

### Check in MIP

```bash
# Environment diagnostics
mip doctor
```

---

## 🐛 Common problems

### 1. Cannot connect to registry

**Error:**
```
❌ Failed to fetch: https://registry.npmjs.org/
Error: connect ETIMEDOUT
```

**Cause:** Internet issues or the registry is unavailable.

**Solution:**
```bash
# Check internet
ping 8.8.8.8

# Check registry
curl -I https://registry.npmjs.org/

# Try again later
```

---

### 2. Slow download speed

**Symptom:** Packages download very slowly.

**Cause:** Slow internet, DNS issues, or region.

**Solution:**
```bash
# Use a mirror
mip install lodash --registry https://registry.npmmirror.com

# Or specify another registry in config
```

---

### 3. SSL certificate error

**Error:**
```
❌ UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

**Cause:** SSL certificate problems.

**Solution:**
```bash
# Temporarily disable verification (not for production!)
NODE_TLS_REJECT_UNAUTHORIZED=0 mip install

# Or update Node.js
```

---

### 4. Rate limit exceeded

**Error:**
```
❌ 429 Too Many Requests
```

**Cause:** Too many requests to the registry.

**Solution:**
```bash
# Use GITHUB_TOKEN for GitHub API
export GITHUB_TOKEN=ghp_xxxxx

# Or use cache
mip install --offline
```

---

### 5. Cannot connect to GitHub API

**Error:**
```
❌ GitHub API request failed: 403
```

**Cause:** GitHub API rate limit exceeded.

**Solution:**
```bash
# Set a token
export GITHUB_TOKEN=ghp_xxxxx

# Or use a different registry
mip install lodash --registry https://registry.npmjs.org/
```

---

### 6. Proxy

**Symptom:** Requests don't work due to a corporate proxy.

**Cause:** Proxy is not configured.

**Solution:**
```bash
# Configure proxy
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# Now mip will use the proxy
```

---

## 🔧 Registry configuration

### Use a different registry

```bash
# Specify a registry for a specific command
mip install lodash --registry https://registry.npmmirror.com

# Specify a registry in config
# In mip.yml:
registry: https://registry.npmmirror.com
```

### Popular registries

| Registry | URL | Region |
|----------|-----|--------|
| npm (official) | `https://registry.npmjs.org/` | Global |
| npmmirror | `https://registry.npmmirror.com` | China |

---

## 🌐 Offline mode

### Work without internet

After the first installation, MIP can work offline:

```bash
mip install --offline
```

### Caching

MIP caches packages in `~/.mip/store/`. If a package is already in the cache, it will not be downloaded again.

---

## 🔍 Network debugging

### Enable logs

```bash
# Enable debug
DEBUG=1 mip install lodash
```

### Check connection

```bash
# Check registry
curl -v https://registry.npmjs.org/lodash

# Check GitHub API
curl -v https://api.github.com/repos/kiwinatra/mip
```

---

## 🛠️ Quick fixes

### Everything broken due to network

```bash
# Try again later
# Or use a different registry
mip install lodash --registry https://registry.npmmirror.com

# Or use cache
mip install --offline
```

### Proxy

```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
mip install lodash
```

### GitHub token

```bash
export GITHUB_TOKEN=ghp_xxxxx
mip repo kiwinatra/mip
```

---

## 🔗 Related pages

- [Installation Errors](/troubleshooting/installation) — installation issues
- [Lock Files](/troubleshooting/lockfile) — lockfile issues
- [mip doctor](/commands/doctor) — environment diagnostics
