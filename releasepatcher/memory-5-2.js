export class MemoryPatcher {
  constructor(options = {}) {
    this.options = {
      checkInterval: options.checkInterval || 1000,
      threshold: options.threshold || 512,
      alertOnLeak: options.alertOnLeak ?? true,
      autoGC: options.autoGC ?? false,
      gcThreshold: options.gcThreshold || 1024,
      logToConsole: options.logToConsole ?? true,
      logToFile: options.logToFile ?? false,
      logFilePath: options.logFilePath || './memory-leaks.log',
      trackObjects: options.trackObjects ?? true,
      maxHistorySize: options.maxHistorySize || 100,
      leakDetectionSensitivity: options.leakDetectionSensitivity || 1.5,
      sampleDuration: options.sampleDuration || 60000,
      attachToProcess: options.attachToProcess || process.pid,
      alertCallback: options.alertCallback || null,
    };

    this.metrics = [];
    this.leaks = [];
    this.objectTracking = new Map();
    this.intervals = [];
    this.attached = false;
    this.status = 'idle';
    this.startTime = null;
    this.baseline = null;
    this.growthRate = [];
  }

  attach() {
    if (this.attached) {
      this.log('MemoryPatcher already attached to process', 'warn');
      return false;
    }

    this.attached = true;
    this.status = 'attached';
    this.startTime = Date.now();
    this.startMonitoring();
    this.instrumentMemory();
    this.log(`MemoryPatcher attached to process ${this.options.attachToProcess}`, 'info');
    return true;
  }

  detach() {
    if (!this.attached) return false;

    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.attached = false;
    this.status = 'detached';
    this.log('MemoryPatcher detached from process', 'info');
    return true;
  }

  startMonitoring() {
    const interval = setInterval(() => this.checkMemory(), this.options.checkInterval);
    this.intervals.push(interval);

    if (this.options.trackObjects) {
      const trackInterval = setInterval(() => this.trackObjects(), this.options.checkInterval * 2);
      this.intervals.push(trackInterval);
    }

    const leakInterval = setInterval(() => this.detectLeaks(), this.options.sampleDuration);
    this.intervals.push(leakInterval);
  }

  checkMemory() {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotal = memoryUsage.heapTotal / 1024 / 1024;
    const rss = memoryUsage.rss / 1024 / 1024;
    const external = memoryUsage.external / 1024 / 1024;
    const arrayBuffers = memoryUsage.arrayBuffers / 1024 / 1024;

    const timestamp = Date.now();
    const metric = {
      timestamp,
      heapUsed,
      heapTotal,
      rss,
      external,
      arrayBuffers,
      delta:
        this.metrics.length > 0 ? heapUsed - this.metrics[this.metrics.length - 1].heapUsed : 0,
      growthRate: this.calculateGrowthRate(heapUsed),
    };

    this.metrics.push(metric);

    if (this.metrics.length > this.options.maxHistorySize) {
      this.metrics.shift();
    }

    if (heapUsed > this.options.threshold) {
      this.handleMemoryExceeded(metric);
    }

    if (this.options.autoGC && heapUsed > this.options.gcThreshold) {
      this.triggerGC();
    }

    if (metric.delta > this.options.threshold * 0.1) {
      this.logRapidGrowth(metric);
    }

    this.checkForLeakPatterns(metric);
  }

  calculateGrowthRate(currentUsage) {
    if (this.metrics.length === 0) return 0;

    const oldest = this.metrics[0];
    const timeDiff = (Date.now() - oldest.timestamp) / 1000;
    const usageDiff = currentUsage - oldest.heapUsed;

    return timeDiff > 0 ? usageDiff / timeDiff : 0;
  }

  handleMemoryExceeded(metric) {
    const alert = {
      type: 'MEMORY_THRESHOLD_EXCEEDED',
      timestamp: metric.timestamp,
      currentUsage: metric.heapUsed,
      threshold: this.options.threshold,
      rss: metric.rss,
      heapTotal: metric.heapTotal,
      growthRate: metric.growthRate,
      delta: metric.delta,
      uptime: (Date.now() - this.startTime) / 1000,
      recommendation: this.getRecommendation(metric),
    };

    this.leaks.push(alert);
    this.outputError(alert);

    if (this.options.alertCallback) {
      this.options.alertCallback(alert);
    }
  }

  getRecommendation(metric) {
    if (metric.growthRate > 10) {
      return 'CRITICAL: Rapid memory growth detected. Check for event listeners, closures, or circular references.';
    } else if (metric.delta > 50) {
      return 'WARNING: Large memory allocation detected in single interval. Review large object allocations.';
    } else if (metric.heapUsed > this.options.threshold * 1.5) {
      return 'URGENT: Memory usage critically high. Consider restarting process or investigating memory leaks.';
    }
    return 'Monitor memory usage. Check for accumulated data in caches or arrays.';
  }

  logRapidGrowth(metric) {
    const alert = {
      type: 'RAPID_MEMORY_GROWTH',
      timestamp: metric.timestamp,
      delta: metric.delta,
      currentUsage: metric.heapUsed,
      threshold: this.options.threshold,
      recommendation:
        'Sudden memory increase detected. Check for large data processing or memory allocations.',
    };

    this.outputError(alert);
  }

  detectLeaks() {
    if (this.metrics.length < 10) return;

    const recent = this.metrics.slice(-20);
    const older = this.metrics.slice(-40, -20);

    const recentAvg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.heapUsed, 0) / older.length;

    const growthFactor = recentAvg / olderAvg;

    if (
      growthFactor > this.options.leakDetectionSensitivity &&
      recentAvg > this.options.threshold * 0.7
    ) {
      const leakAlert = {
        type: 'MEMORY_LEAK_DETECTED',
        timestamp: Date.now(),
        growthFactor: growthFactor,
        olderAvg: olderAvg,
        recentAvg: recentAvg,
        sensitivity: this.options.leakDetectionSensitivity,
        recommendation: `Memory leak suspected: ${(growthFactor * 100).toFixed(1)}% growth over sample period. Check for accumulating objects, arrays, or closures.`,
        possibleCauses: this.identifyPossibleCauses(),
      };

      this.leaks.push(leakAlert);
      this.outputError(leakAlert);
    }
  }

  checkForLeakPatterns(metric) {
    this.growthRate.push({
      timestamp: metric.timestamp,
      value: metric.growthRate,
    });

    if (this.growthRate.length > 20) {
      this.growthRate.shift();
    }

    if (this.growthRate.length >= 10) {
      const rates = this.growthRate.map(g => g.value);
      const increasing = rates.every((val, i, arr) => i === 0 || val >= arr[i - 1]);

      if (increasing && rates[rates.length - 1] > rates[0] * 2) {
        const patternAlert = {
          type: 'CONSISTENT_MEMORY_GROWTH_PATTERN',
          timestamp: metric.timestamp,
          growthAcceleration: rates[rates.length - 1] - rates[0],
          recommendation:
            'Consistent memory growth pattern detected. Review data structures that grow unbounded.',
          details: 'Memory usage consistently increasing over time without stabilization',
        };

        this.outputError(patternAlert);
      }
    }
  }

  identifyPossibleCauses() {
    const causes = [];

    if (typeof global.gc === 'function') {
      const beforeGC = process.memoryUsage().heapUsed;
      global.gc();
      const afterGC = process.memoryUsage().heapUsed;
      const freed = (beforeGC - afterGC) / 1024 / 1024;

      if (freed < 10) {
        causes.push('Garbage collection freeing minimal memory - possible permanent references');
      }
    }

    if (this.objectTracking.size > 10000) {
      causes.push('Large number of tracked objects - possible object accumulation');
    }

    const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    const heapLimit = require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024;

    if (heapUsed > heapLimit * 0.8) {
      causes.push('Approaching heap limit - critical memory pressure');
    }

    return causes;
  }

  trackObjects() {
    if (!this.options.trackObjects) return;

    const heapStats = require('v8').getHeapStatistics();
    const heapSpaceStats = require('v8').getHeapSpaceStatistics();

    const tracking = {
      timestamp: Date.now(),
      totalHeapSize: heapStats.total_heap_size / 1024 / 1024,
      totalHeapExecutable: heapStats.total_heap_size_executable / 1024 / 1024,
      totalPhysicalSize: heapStats.total_physical_size / 1024 / 1024,
      totalAvailable: heapStats.total_available_size / 1024 / 1024,
      heapSizeLimit: heapStats.heap_size_limit / 1024 / 1024,
      mallocedMemory: heapStats.malloced_memory / 1024 / 1024,
      spaces: {},
    };

    for (const space of heapSpaceStats) {
      tracking.spaces[space.space_name] = {
        size: space.space_size / 1024 / 1024,
        used: space.space_used_size / 1024 / 1024,
        available: space.space_available_size / 1024 / 1024,
      };
    }

    this.objectTracking.set(tracking.timestamp, tracking);

    if (this.objectTracking.size > this.options.maxHistorySize) {
      const oldest = Array.from(this.objectTracking.keys())[0];
      this.objectTracking.delete(oldest);
    }

    this.checkObjectLeaks(tracking);
  }

  checkObjectLeaks(currentTracking) {
    const previous = Array.from(this.objectTracking.values())[this.objectTracking.size - 2];
    if (!previous) return;

    for (const spaceName in currentTracking.spaces) {
      const current = currentTracking.spaces[spaceName];
      const prev = previous.spaces[spaceName];

      if (current && prev) {
        const growth = current.used - prev.used;
        const growthPercent = prev.used > 0 ? (growth / prev.used) * 100 : 0;

        if (growth > 50 && growthPercent > 20) {
          const objectAlert = {
            type: 'HEAP_SPACE_GROWTH',
            timestamp: currentTracking.timestamp,
            space: spaceName,
            growth: growth,
            growthPercent: growthPercent,
            currentUsage: current.used,
            recommendation: `Heap space "${spaceName}" growing rapidly. Check for objects not being garbage collected in this space.`,
          };

          this.outputError(objectAlert);
        }
      }
    }
  }

  triggerGC() {
    if (typeof global.gc === 'function') {
      const before = process.memoryUsage().heapUsed / 1024 / 1024;
      global.gc();
      const after = process.memoryUsage().heapUsed / 1024 / 1024;
      const freed = before - after;

      this.log(`Manual GC triggered. Freed ${freed.toFixed(2)}MB`, 'info');

      if (freed < 5 && after > this.options.gcThreshold * 0.8) {
        const gcAlert = {
          type: 'INEFFECTIVE_GC',
          timestamp: Date.now(),
          freed: freed,
          remaining: after,
          recommendation:
            'Garbage collection ineffective. Likely memory leak with permanent references.',
        };
        this.outputError(gcAlert);
      }
    } else {
      this.log('GC not available. Run with --expose-gc flag to enable manual GC', 'warn');
    }
  }

  instrumentMemory() {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('FATAL ERROR') || message.includes('JavaScript heap out of memory')) {
        this.handleFatalError(message);
      }
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('deprecated') || message.includes('warning')) {
        this.checkWarningContext(message);
      }
      originalConsoleWarn.apply(console, args);
    };

    process.on('uncaughtException', error => {
      if (error.message.includes('heap') || error.message.includes('memory')) {
        this.handleMemoryException(error);
      }
    });

    process.on('warning', warning => {
      if (warning.name === 'DeprecationWarning' && warning.message.includes('memory')) {
        this.outputError({
          type: 'MEMORY_RELATED_WARNING',
          timestamp: Date.now(),
          warning: warning.message,
          recommendation: 'Review deprecation warnings related to memory management',
        });
      }
    });
  }

  handleFatalError(message) {
    const memorySnapshot = this.getMemorySnapshot();
    const fatalAlert = {
      type: 'FATAL_MEMORY_ERROR',
      timestamp: Date.now(),
      message: message,
      snapshot: memorySnapshot,
      recommendation:
        'Process crashed due to memory error. Increase memory limit or fix memory leak.',
      stack: new Error().stack,
    };

    this.outputError(fatalAlert);
    this.log(`FATAL: ${message}`, 'error');
  }

  handleMemoryException(error) {
    const exceptionAlert = {
      type: 'MEMORY_EXCEPTION',
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      memorySnapshot: this.getMemorySnapshot(),
      recommendation:
        'Unhandled memory-related exception caught. Review error and implement proper error handling.',
    };

    this.outputError(exceptionAlert);
  }

  checkWarningContext(message) {
    const memoryPatterns = [/memory/i, /heap/i, /leak/i, /allocation/i, /garbage/i, /collection/i];

    if (memoryPatterns.some(pattern => pattern.test(message))) {
      this.outputError({
        type: 'MEMORY_WARNING',
        timestamp: Date.now(),
        warning: message,
        recommendation: 'Investigate warning related to memory management',
      });
    }
  }

  getMemorySnapshot() {
    const usage = process.memoryUsage();
    const heapStats = require('v8').getHeapStatistics();

    return {
      rss: (usage.rss / 1024 / 1024).toFixed(2),
      heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2),
      heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2),
      external: (usage.external / 1024 / 1024).toFixed(2),
      heapSizeLimit: (heapStats.heap_size_limit / 1024 / 1024).toFixed(2),
      totalHeapSize: (heapStats.total_heap_size / 1024 / 1024).toFixed(2),
      mallocedMemory: (heapStats.malloced_memory / 1024 / 1024).toFixed(2),
      uptime: ((Date.now() - this.startTime) / 1000).toFixed(2),
    };
  }

  outputError(alert) {
    const formattedAlert = this.formatAlert(alert);

    if (this.options.logToConsole) {
      console.error('\x1b[31m%s\x1b[0m', formattedAlert);
    }

    if (this.options.logToFile) {
      this.writeToFile(formattedAlert);
    }

    this.emitAlert(alert);
  }

  formatAlert(alert) {
    const timestamp = new Date(alert.timestamp).toISOString();
    let output = `\n${'='.repeat(80)}\n`;
    output += `[MEMORY PATCHER] [${timestamp}] [${alert.type}]\n`;
    output += `${'='.repeat(80)}\n`;

    for (const [key, value] of Object.entries(alert)) {
      if (key !== 'type' && key !== 'timestamp') {
        output += `${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}\n`;
      }
    }

    output += `${'='.repeat(80)}\n`;
    return output;
  }

  writeToFile(content) {
    const fs = require('fs');
    try {
      fs.appendFileSync(this.options.logFilePath, content + '\n');
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  emitAlert(alert) {
    if (this.options.alertCallback) {
      this.options.alertCallback(alert);
    }
  }

  log(message, level = 'info') {
    if (!this.options.logToConsole) return;

    const prefix = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[32m';
    console.log(`${prefix}[MemoryPatcher] ${message}\x1b[0m`);
  }

  getMetrics() {
    return {
      status: this.status,
      attached: this.attached,
      uptime: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
      totalChecks: this.metrics.length,
      totalLeaks: this.leaks.length,
      currentMemory: this.getMemorySnapshot(),
      recentMetrics: this.metrics.slice(-10),
      recentLeaks: this.leaks.slice(-5),
      config: this.options,
    };
  }

  getLeaks() {
    return this.leaks;
  }

  clearLeaks() {
    this.leaks = [];
    this.log('Leak history cleared', 'info');
  }

  async generateReport() {
    const report = {
      generated: new Date().toISOString(),
      summary: {
        totalLeaks: this.leaks.length,
        monitoringDuration: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
        peakMemory: Math.max(...this.metrics.map(m => m.heapUsed)),
        averageMemory: this.metrics.reduce((sum, m) => sum + m.heapUsed, 0) / this.metrics.length,
        leakTypes: this.getLeakTypes(),
      },
      criticalAlerts: this.leaks.filter(
        l => l.type === 'FATAL_MEMORY_ERROR' || l.type === 'MEMORY_THRESHOLD_EXCEEDED'
      ),
      recommendations: this.generateRecommendations(),
      memoryTimeline: this.metrics.map(m => ({
        timestamp: m.timestamp,
        heapUsed: m.heapUsed,
        delta: m.delta,
      })),
    };

    return report;
  }

  getLeakTypes() {
    const types = {};
    for (const leak of this.leaks) {
      types[leak.type] = (types[leak.type] || 0) + 1;
    }
    return types;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.length > 0) {
      const avgGrowth = this.metrics[this.metrics.length - 1].growthRate;
      if (avgGrowth > 5) {
        recommendations.push(
          'High memory growth rate detected. Consider implementing data structure limits or pagination.'
        );
      }
    }

    const recentLeaks = this.leaks.slice(-5);
    if (recentLeaks.some(l => l.type === 'CONSISTENT_MEMORY_GROWTH_PATTERN')) {
      recommendations.push(
        'Consistent memory leak pattern detected. Review event listeners, closures, and global variables.'
      );
    }

    if (this.options.autoGC && this.metrics.length > 0) {
      const lastMetric = this.metrics[this.metrics.length - 1];
      if (lastMetric.heapUsed > this.options.gcThreshold) {
        recommendations.push(
          'Manual GC is enabled but memory remains high. Consider increasing GC threshold or fixing leaks.'
        );
      }
    }

    return recommendations;
  }

  async fixMemoryLeaks() {
    this.log('Attempting automatic memory leak fixes...', 'info');

    const fixes = [];

    if (typeof global.gc === 'function') {
      this.triggerGC();
      fixes.push('Manual garbage collection triggered');
    }

    const recommendations = this.generateRecommendations();
    fixes.push(...recommendations.map(r => `Recommendation: ${r}`));

    return {
      applied: fixes,
      timestamp: Date.now(),
      memoryAfter: this.getMemorySnapshot(),
    };
  }

  setThreshold(threshold) {
    this.options.threshold = threshold;
    this.log(`Memory threshold updated to ${threshold}MB`, 'info');
  }

  setAlertCallback(callback) {
    this.options.alertCallback = callback;
    this.log('Alert callback registered', 'info');
  }
}

export const attachMemoryPatcher = options => {
  const patcher = new MemoryPatcher(options);
  patcher.attach();
  return patcher;
};

export default MemoryPatcher;
