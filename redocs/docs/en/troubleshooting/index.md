---
title: "Installation Errors"
description: "Problems encountered when installing packages and how to solve them."
---

# Installation Errors 📦

The most common issues that occur when installing packages and how to solve them.

---

## 🔍 General diagnostics

### Check the environment

```bash
mip doctor
```

### Check the lockfile

```bash
cat mip-lock.yml
```

### Check the cache

```bash
mip cache size
mip cache size --global
```

---

## 🐛 Common errors

### 1. `mip-lock.yml` not found

**Error:**
```
❌ Lockfile not found. Run mip install first
```

**Cause:** The lockfile is missing or was deleted.

**Solution:**
```bash
mip install
```

---

### 2. Package not found in registry

**Error:**
```
❌ Package not found: some-package
```

**Cause:** The package does not exist in the registry.

**Solution:**
```bash
# Check the name
mip search some-package

# Verify the package exists
mip info some-package
```

---

### 3. Version not found

**Error:**
```
❌ Version not found: some-package@99.99.99
```

**Cause:** A non-existent version was specified.

**Solution:**
```bash
# View available versions
mip info some-package
```

---

### 4. Permission denied

**Error:**
```
❌ EACCES: permission denied
```

**Cause:** No write permissions for `.mip/` or `node_modules/`.

**Solution:**
```bash
# Fix permissions
sudo chown -R $(whoami) .

# Or delete and recreate
rm -rf node_modules .mip
mip install
```

---

### 5. SSL error

**Error:**
```
❌ UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

**Cause:** SSL certificate issues.

**Solution:**
```bash
# Temporarily disable strict verification
NODE_TLS_REJECT_UNAUTHORIZED=0 mip install

# Or update Node.js
```

---

### 6. Package already installed

**Error:**
```
✅ Package already installed
```

**This is not an error.** The package is already there.

**Solution:**
```bash
# Force reinstall
mip install lodash --force
```

---

### 7. No free space

**Error:**
```
❌ ENOSPC: no space left on device
```

**Cause:** Disk space is full.

**Solution:**
```bash
# Clear cache
mip cache clean
mip cache clean --global

# Remove old packages
mip uninstall <package>

# Check size
mip cache size
mip cache size --global
```

---

### 8. Dependency conflict

**Error:**
```
❌ Peer dependency conflict
```

**Cause:** The package requires a different version of a dependency.

**Solution:**
```bash
# Install the required version
mip install lodash@4.17.20

# Or update all packages
mip update
```

---

## 🧹 Cleaning and reinstalling

### Full reinstall

```bash
# Clean everything
rm -rf node_modules .mip
rm -f mip-lock.yml
mip cache clean

# Install again
mip install
```

### Cache only

```bash
mip cache clean
mip install
```

### Lockfile only

```bash
rm -f mip-lock.yml
mip install
```

---

## 🛠️ Debugging

### Enable debug mode

```bash
DEBUG=1 mip install lodash
```

### Check logs

```bash
# Logs are printed to the console
# For logger plugins:
cat mip.log
```

### Check versions

```bash
mip --version
node --version
```

---

## 🔗 Related pages

- [Network & Registries](/troubleshooting/network) — network issues
- [Lock Files](/troubleshooting/lockfile) — lockfile issues
- [mip doctor](/commands/doctor) — environment diagnostics
- [mip cache](/commands/cache) — cache management
