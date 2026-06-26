---
title: "MIP Glossary"
description: "A brief dictionary of terms used in MIP and the package manager ecosystem."
---

# Glossary 📚

A collection of key terms used in MIP and package managers.

---

## 🔤 A–Z

### API
**Application Programming Interface** — a set of methods available to plugins for interacting with MIP.

### Audit
Security check of dependencies. MIP checks packages against known vulnerabilities via the npm advisory database.

---

## 🅱️ B

### Bin
Executable files added to `PATH` when a package is installed. In MIP, they are located in `~/.mip/store/<name>/<version>/node_modules/.bin/`.

### Branch
A Git branch. MIP uses `--branch` in the `repo` command to browse a specific branch.

---

## 🅲️ C

### Cache
Temporary data storage to speed up repeated operations. In MIP: `SuperCache` (3 levels: memory, disk, in-flight), and the global cache `~/.mip/store/`.

### CI
**Continuous Integration** — continuous integration. The `mip ci` command is optimized for CI environments.

### CLI
**Command Line Interface** — command line interface. MIP is a CLI tool.

### CVSS
**Common Vulnerability Scoring System** — vulnerability scoring system. Used in `mip audit`.

---

## 🅳️ D

### Dedupe
Deduplication — removing duplicate package versions. Command: `mip dedupe`.

### Dependency
A package required by another package to work.

### Dependency Tree
The graph of all dependencies of a package, including transitive ones.

### Dev Dependency
A dependency only needed for development (testing, building). Stored in `devDependencies` in `mip.yml`.

---

## 🅴️ E

### Exec
Running a binary from an installed package. Command: `mip exec`.

### Exports
A section in `package.json` that defines the public paths of a package.

---

## 🅵️ F

### Fallback
A backup option. For example, `LegacyFallback` in MIP.

### Frozen Lockfile
A lockfile in a frozen state. With `mip ci --frozen-lockfile`, installation fails if the lockfile is not synced with `mip.yml`.

---

## 🅶️ G

### Global Install
Global installation — a package becomes available from anywhere. In MIP: `mip global install`.

### Global Store
The global package storage at `~/.mip/store/`. All packages are stored once and shared across all projects.

### GitHub API
API for working with GitHub. Used in the `repo` command.

---

## 🅷️ H

### Hook
A place in the code where plugins can execute their logic. In MIP: `beforeInstall`, `afterInstall`, `onError`, and others.

### HTTP/2
A protocol for faster loading. MIP uses HTTP/2 for parallel package downloads.

---

## 🅸️ I

### i18n
**Internationalization** — internationalization. In MIP: support for 10 languages.

### Integrity
Package integrity. SHA256 hashes are stored in `mip-lock.yml` for verification.

### Install
Package installation. Command: `mip install`.

---

## 🅻️ L

### Legacy
An outdated package. In MIP: `mip legacy` for working with them.

### Lockfile
A file with pinned package versions. In MIP: `mip-lock.yml`.

### LRU Cache
A cache that removes old entries when full. Used in `SuperCache`.

---

## 🅼️ M

### MIP
**MInimal Package Manager** — a minimalistic package manager.

### MIP Cache
MIP cache — located in `.mip/cache/` (local) and `~/.mip/store/` (global).

### MIP Lock
Lockfile — `mip-lock.yml`.

### MIP Store
Global package storage — `~/.mip/store/`.

### Manifest
The manifest — `.mip/manifest.json`, stores information about installed packages.

### Monorepo
A monorepository — a project with multiple packages in one repository. In MIP: `mip workspaces`.

---

## 🅽️ N

### Node.js
The JavaScript runtime environment. MIP is written in Node.js.

### Node Modules
The folder with installed packages. In MIP, symlinks to the global cache are used instead of `node_modules`.

### npm
**Node Package Manager** — the original package manager for Node.js.

---

## 🅾️ O

### Options
Command-line flags. For example, `--save-dev`, `--force`.

### Outdated
An outdated package (a newer version is available). Command: `mip outdated`.

---

## 🅿️ P

### Package
A unit of code distribution in MIP.

### Package.json
A file with package metadata. MIP supports it for npm compatibility.

### Parallel Download
Downloading multiple packages simultaneously.

### PATH
An environment variable listing folders with executable files.

### Peer Dependency
A dependency that a package expects from its parent. In MIP: `PeerResolver`.

### Plugin
An extension of MIP functionality.

### Plugin Manager
Manages plugin loading and registration.

---

## 🆁️ R

### Registry
A package registry — for example, `registry.npmjs.org`.

### Resolved
The tarball URL of a package, pinned in the lockfile.

### Resolver
A component that resolves dependency versions.

---

## 🆂️ S

### Semver
**Semantic Versioning** — semantic versioning (MAJOR.MINOR.PATCH).

### Sidebar
The sidebar in the documentation.

### SPA
**Single Page Application** — single-page application. MIP documentation runs in SPA mode.

### Stream Extract
Streaming extraction — extracting a tarball without saving to disk.

### Super Cache
Three-level cache in MIP (memory → disk → in-flight).

### Symlink
A symbolic link. MIP uses them to connect `node_modules/` with the global cache.

---

## 🆃️ T

### Tarball
A `.tgz` archive containing a package.

### TUI
**Text User Interface** — text user interface. For example, `mip repo` in TUI mode.

---

## 🆄️ U

### Uninstall
Package removal. Command: `mip uninstall`.

### Update
Package update. Command: `mip update`.

---

## 🆅️ V

### Vulnerability
A flaw in a package that can be exploited by an attacker.

---

## 🆆️ W

### Workspace
A workspace — a separate package in a monorepository. Command: `mip workspaces`.

### Why
Why is a package installed? Command: `mip why`.

---

## ❓ Questions?

If you've encountered a term not listed in the glossary — [let us know](https://github.com/kiwinatra/mip/issues). We'll add it! 📝
