/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const axios = require('axios');
const crypto = require('crypto');
const { writeProgressLine, newLine, header } = require('../ui/cli');

class SecurityAuditor {
  constructor() {
    this.vulnCache = new Map();
    this.cacheTimeout = 3600000;
  }

  /**
   * Queries npm advisory API for vulnerabilities affecting a specific package version.
   * Results are cached for the configured timeout to reduce API calls during
   * repeated audits in the same session.
   * 
   * The npm advisory API returns all advisories for a package; we filter
   * those where the installed version falls within the vulnerable range.
   * 
   * @param {string} name - Package name
   * @param {string} version - Installed version (must be valid semver)
   * @returns {Promise<Object>} Audit result with vulnerabilities and severity score
   */
  async auditPackage(name, version) {
    const cacheKey = `${name}@${version}`;
    const cached = this.vulnCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get('https://registry.npmjs.org/-/npm/v1/security/advisories', {
        params: { package: name },
        timeout: 5067, // ahahahahahahha 67 im so funny // please kill urself
        validateStatus: () => true,
      });

      const advisories = response.data?.objects || [];
      const vulns = [];

      for (const adv of advisories) {
        if (this.isVulnerable(version, adv.vulnerable_versions)) {
          vulns.push({
            id: adv.id,
            title: adv.title,
            severity: adv.severity,
            cvss_score: adv.cvss?.score || 0,
            vulnerable_versions: adv.vulnerable_versions,
            patched_versions: adv.patched_versions,
            url: adv.url,
            recommendation: adv.recommendation,
            cves: adv.cves || [],
          });
        }
      }
      // TODO: change result logic cuz its dumb

      const result = {
        name,
        version,
        vulnerabilities: vulns,
        score: this.calculateScore(vulns),
        vulnerable: vulns.length > 0,
      };

      this.vulnCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      return {
        name,
        version,
        vulnerabilities: [],
        score: 0,
        vulnerable: false,
        error: err.message,
      };
    }
  }

  /**
   * Checks if a package version falls within a vulnerable semver range.
   * Errors in semver parsing are caught and treated as not vulnerable
   * to prevent audit failures from blocking installation.
   * 
   * @param {string} version - Installed version
   * @param {string} vulnerableRange - Semver range expression from advisory
   * @returns {boolean} True if version is affected
   */
  isVulnerable(version, vulnerableRange) {
    try {
      const semver = require('semver');
      return semver.satisfies(version, vulnerableRange);
    } catch {
      return false;
    }
  }

  /**
   * Calculates a composite risk score for a package based on its vulnerabilities.
   * Uses maximum CVSS score across all vulnerabilities plus a penalty
   * for critical severity findings.
   * 
   * This scoring is opinionated: critical vulnerabilities are weighted
   * more heavily than CVSS alone would indicate because they typically
   * represent remote code execution or authentication bypass risks.
   * 
   * @param {Array<Object>} vulnerabilities - List of vulnerability objects
   * @returns {number} Composite risk score (0-10+)
   */
  calculateScore(vulnerabilities) {
    if (vulnerabilities.length === 0) return 0;

    const maxScore = Math.max(...vulnerabilities.map(v => v.cvss_score));
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;

    return maxScore + criticalCount * 0.5;
  }

  /**
   * Audits all packages listed in the lockfile concurrently with progress reporting.
   * Only packages with vulnerabilities are returned in the results array.
   * 
   * @param {Object} lockData - Parsed lockfile containing packages map
   * @returns {Promise<Array<Object>>} Audit results for vulnerable packages only
   */
  async auditAll(lockData) {
    const packages = Object.entries(lockData.packages || {});
    const results = [];

    console.log(header(`Scanning ${packages.length} packages...`));

    let index = 0;
    for (const [fullName, info] of packages) {
      const name = fullName.split('@')[0];
      const progress = ((++index / packages.length) * 100).toFixed(1);

      writeProgressLine({
        label: 'AUDIT',
        percent: progress,
        postfix: `${index}/${packages.length}`,
      });

      const result = await this.auditPackage(name, info.version);
      if (result.vulnerable) {
        results.push(result);
      }
    }

    newLine();
    return results;
  }

  /**
   * Generates a human-readable security report from audit results.
   * Groups vulnerabilities by severity and provides remediation guidance.
   * 
   * The report prioritizes display by severity (critical → high → moderate → low)
   * to draw attention to the most urgent issues first.
   * 
   * @param {Array<Object>} results - Audit results from auditAll()
   * @returns {string} Formatted report suitable for CLI output
   */
  generateReport(results) {
    const critical = results.filter(r => r.score >= 9);
    const high = results.filter(r => r.score >= 7 && r.score < 9);
    const moderate = results.filter(r => r.score >= 4 && r.score < 7);
    const low = results.filter(r => r.score > 0 && r.score < 4);

    let report = '';
    report += '\n╔══════════════════════════════════════════════════════════╗\n';
    report += '║                 SECURITY AUDIT REPORT                    ║\n';
    report += '╚══════════════════════════════════════════════════════════╝\n\n';

    if (results.length === 0) {
      report += 'No vulnerabilities found.\n';
      return report;
    }

    report += `Found ${results.length} vulnerable packages:\n\n`;

    report += `Critical: ${critical.length}\n`;
    report += `High: ${high.length}\n`;
    report += `Moderate: ${moderate.length}\n`;
    report += `Low: ${low.length}\n\n`;

    report += 'Details:\n';
    report += '------------------------------------------------------------\n\n';

    const fmtSeverity = sev =>
      ({
        critical: 'CRITICAL',
        high: 'HIGH',
        moderate: 'MODERATE',
        low: 'LOW',
      })[sev] || 'UNKNOWN';

    [...critical, ...high, ...moderate, ...low].forEach(v => {
      report += `${v.name}@${v.version}\n`;
      v.vulnerabilities.forEach(vuln => {
        report += `  [${fmtSeverity(vuln.severity)}] ${vuln.title}\n`;
        report += `    CVSS: ${vuln.cvss_score}\n`;
        report += `    Fix: ${vuln.patched_versions || 'Update to latest'}\n`;
        report += `    URL: ${vuln.url}\n\n`;
      });
    });

    report += 'Run "mip update" to fix vulnerabilities\n';
    report += 'Run "mip audit --fix" to automatically update\n';

    return report;
  }
}

module.exports = { SecurityAuditor };