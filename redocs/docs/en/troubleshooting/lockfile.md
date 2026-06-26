```markdown
---
title: "Lock File Issues"
description: "Problems with mip-lock.yml and how to solve them."
---

# Lock File Issues 🔒

`mip-lock.yml` is an important file that pins exact dependency versions. If it is corrupted or out of sync, problems can arise.

---

## 🔍 What is a lockfile?

`mip-lock.yml` is a file where MIP stores:

- Exact versions of all installed packages
- Tarball URLs
- SHA256 hashes for integrity verification
- The dependency tree

**Example:**

```yaml
version: 1.0.0
packages:
  lodash@4.17.21:
    version: 4.17.21
    resolved: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
    integrity: sha512-...
    dependencies: {}
```

---

## 🐛 Common issues

### 1. Lockfile not found

**Error:**
```
❌ Lockfile not found. Run mip install first
```

**Cause:** `mip-lock.yml` is missing or was deleted.

**Solution:**
```bash
# Create a lockfile
mip install
```

---

### 2. Lockfile corrupted

**Error:**
```
❌ Failed to parse lockfile
YAMLException: ...
```

**Cause:** The file is corrupted or contains invalid YAML.

**Solution:**
```bash
# Check the content
cat mip-lock.yml

# Delete and recreate
rm -f mip-lock.yml
mip install
```

---

### 3. `--frozen-lockfile` error

**Error:**
```
❌ Frozen lockfile check failed:
  • lodash: missing from lockfile
  • axios: extra in lockfile
💡 Run 'mip install' to update lockfile
```

**Cause:** `mip.yml` was changed but the lockfile was not updated.

**Solution:**
```bash
# Update the lockfile
mip install

# Commit the changes
git add mip-lock.yml
git commit -m "chore: update lockfile"
```

---

### 4. Version conflict in lockfile

**Error:**
```
❌ Version conflict in lockfile
```

**Cause:** The lockfile has conflicting versions of the same package.

**Solution:**
```bash
# Deduplicate
mip dedupe

# Or reinstall
rm -rf .mip node_modules
rm -f mip-lock.yml
mip install
```

---

### 5. Lockfile out of sync with .mip/

**Error:**
```
⚠️ Missing packages: lodash
```

**Cause:** A package is in the lockfile but missing from `.mip/`.

**Solution:**
```bash
# Reinstall all packages
mip install
```

---

## 🛠️ Recovery

### Full recovery

```bash
# Delete everything
rm -rf .mip node_modules
rm -f mip-lock.yml

# Install again
mip install

# Verify
mip list
```

### Update lockfile

```bash
# Update lockfile without installing
mip genlock
```

### Deduplicate

```bash
# Remove duplicate versions
mip dedupe
```

---

## 🔬 Lockfile verification

### View content

```bash
cat mip-lock.yml | grep -E '^  [a-z]'
```

### Check integrity

```bash
# Check SHA256 hashes
mip doctor
```

### Compare with mip.yml

```bash
# Check synchronization
mip ci --frozen-lockfile
```

---

## 🧹 Cleaning

### Delete lockfile

```bash
rm -f mip-lock.yml
```

### Recreate lockfile

```bash
mip install
```

### Clean and recreate

```bash
rm -f mip-lock.yml
rm -rf .mip
mip install
```

---

## 💡 Best practices

1. **Always commit `mip-lock.yml`** — ensures reproducibility
2. **Don't edit the lockfile manually** — use MIP commands
3. **Use `mip ci --frozen-lockfile` in CI** — checks synchronization
4. **Run `mip dedupe` periodically** — removes duplicates
5. **Keep the lockfile in the repository** — speeds up installation

---

## 🔗 Related pages

- [mip genlock](/commands/genlock) — lockfile generation
- [mip ci](/commands/ci) — install from lockfile
- [mip dedupe](/commands/dedupe) — deduplication
- [mip doctor](/commands/doctor) — diagnostics
```