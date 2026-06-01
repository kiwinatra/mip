export class RuntimeMemoryPatcher {
    constructor(options = {}) {
        this.options = {
            checkInterval: options.checkInterval || 500,
            threshold: options.threshold || 512,
            criticalThreshold: options.criticalThreshold || 1024,
            heapLimit: options.heapLimit || 2048,
            autoHeapDump: options.autoHeapDump ?? true,
            heapDumpPath: options.heapDumpPath || './heapdumps',
            alertOnLeak: options.alertOnLeak ?? true,
            autoRestart: options.autoRestart ?? false,
            restartCommand: options.restartCommand || null,
            logToConsole: options.logToConsole ?? true,
            logToFile: options.logToFile ?? true,
            logFilePath: options.logFilePath || './runtime-memory.log',
            trackGarbageCollection: options.trackGarbageCollection ?? true,
            trackAllocations: options.trackAllocations ?? false,
            allocationSampleRate: options.allocationSampleRate || 0.01,
            generateFlamegraph: options.generateFlamegraph ?? false,
            memoryPressureLevels: options.memoryPressureLevels || {
                low: 0.3,
                medium: 0.6,
                high: 0.8,
                critical: 0.95
            },
            callbacks: options.callbacks || {}
        };

        this.runtime = {
            isRunning: false,
            intervals: [],
            metrics: [],
            allocations: [],
            gcEvents: [],
            pressureEvents: [],
            heapSnapshots: [],
            restartCount: 0,
            lastRestart: null,
            uptime: 0,
            startTime: null
        };

        this.memoryPressure = 'low';
        this.allocationTracker = null;
        this.gcTracker = null;
        this.inspector = null;
    }

    async start() {
        if (this.runtime.isRunning) {
            this.log('Runtime patcher already running', 'warn');
            return false;
        }

        this.runtime.isRunning = true;
        this.runtime.startTime = Date.now();
        
        await this.initializeInspector();
        this.startMemoryMonitoring();
        this.startGCTracking();
        
        if (this.options.trackAllocations) {
            this.startAllocationTracking();
        }
        
        this.setupMemoryPressureHandling();
        this.setupProcessHandlers();
        
        this.log('Runtime memory patcher started', 'info');
        return true;
    }

    async initializeInspector() {
        try {
            const inspector = await import('inspector');
            if (inspector.url()) {
                this.inspector = inspector;
                this.log('Inspector session initialized', 'debug');
            }
        } catch (error) {
            this.log(`Inspector not available: ${error.message}`, 'warn');
        }
    }

    startMemoryMonitoring() {
        const interval = setInterval(() => this.checkRuntimeMemory(), this.options.checkInterval);
        this.runtime.intervals.push(interval);
    }

    checkRuntimeMemory() {
        const memory = process.memoryUsage();
        const heapUsedMB = memory.heapUsed / 1024 / 1024;
        const heapTotalMB = memory.heapTotal / 1024 / 1024;
        const rssMB = memory.rss / 1024 / 1024;
        const externalMB = memory.external / 1024 / 1024;
        
        const heapLimitMB = this.options.heapLimit;
        const pressure = heapUsedMB / heapLimitMB;
        
        const metric = {
            timestamp: Date.now(),
            heapUsedMB,
            heapTotalMB,
            rssMB,
            externalMB,
            pressure,
            heapUsedPercent: (pressure * 100).toFixed(2),
            uptime: (Date.now() - this.runtime.startTime) / 1000,
            eventLoopLag: this.measureEventLoopLag()
        };
        
        this.runtime.metrics.push(metric);
        
        if (this.runtime.metrics.length > 10000) {
            this.runtime.metrics = this.runtime.metrics.slice(-5000);
        }
        
        this.updateMemoryPressure(pressure, metric);
        
        if (heapUsedMB > this.options.threshold) {
            this.handleMemoryThreshold(metric);
        }
        
        if (heapUsedMB > this.options.criticalThreshold) {
            this.handleCriticalMemory(metric);
        }
        
        this.detectAnomalies(metric);
        this.emitMetric(metric);
    }

    measureEventLoopLag() {
        const start = Date.now();
        setImmediate(() => {
            const lag = Date.now() - start;
            return lag;
        });
        return 0;
    }

    updateMemoryPressure(pressure, metric) {
        let newPressure = this.memoryPressure;
        
        if (pressure >= this.options.memoryPressureLevels.critical) {
            newPressure = 'critical';
        } else if (pressure >= this.options.memoryPressureLevels.high) {
            newPressure = 'high';
        } else if (pressure >= this.options.memoryPressureLevels.medium) {
            newPressure = 'medium';
        } else {
            newPressure = 'low';
        }
        
        if (newPressure !== this.memoryPressure) {
            this.memoryPressure = newPressure;
            this.runtime.pressureEvents.push({
                timestamp: Date.now(),
                from: this.memoryPressure,
                to: newPressure,
                pressure,
                heapUsedMB: metric.heapUsedMB
            });
            
            this.log(`Memory pressure changed: ${this.memoryPressure} -> ${newPressure}`, 'warn');
            this.handlePressureChange(newPressure);
        }
    }

    handleMemoryThreshold(metric) {
        const alert = {
            type: 'RUNTIME_MEMORY_THRESHOLD',
            timestamp: metric.timestamp,
            heapUsedMB: metric.heapUsedMB,
            threshold: this.options.threshold,
            pressure: metric.pressure,
            recommendation: this.getRuntimeRecommendation(metric)
        };
        
        this.outputAlert(alert);
        
        if (this.options.autoHeapDump && metric.pressure > 0.7) {
            this.captureHeapSnapshot('threshold');
        }
    }

    handleCriticalMemory(metric) {
        const criticalAlert = {
            type: 'CRITICAL_MEMORY_PRESSURE',
            timestamp: metric.timestamp,
            heapUsedMB: metric.heapUsedMB,
            criticalThreshold: this.options.criticalThreshold,
            heapLimit: this.options.heapLimit,
            pressure: metric.pressure,
            recommendation: 'IMMEDIATE ACTION REQUIRED: Process approaching heap limit',
            action: this.options.autoRestart ? 'Auto-restart will be triggered' : 'Manual intervention required'
        };
        
        this.outputAlert(criticalAlert);
        
        if (this.options.autoHeapDump) {
            this.captureHeapSnapshot('critical');
        }
        
        if (this.options.autoRestart && this.runtime.restartCount < 3) {
            this.initiateRuntimeRestart();
        }
        
        this.forceGarbageCollection();
    }

    startGCTracking() {
        if (!this.options.trackGarbageCollection) return;
        
        const gcStats = () => {
            const before = process.memoryUsage().heapUsed;
            const startTime = Date.now();
            
            if (typeof global.gc === 'function') {
                global.gc();
                const after = process.memoryUsage().heapUsed;
                const freed = (before - after) / 1024 / 1024;
                const duration = Date.now() - startTime;
                
                this.runtime.gcEvents.push({
                    timestamp: Date.now(),
                    freedMB: freed,
                    duration,
                    beforeMB: before / 1024 / 1024,
                    afterMB: after / 1024 / 1024,
                    efficiency: before > 0 ? (freed / (before / 1024 / 1024)) * 100 : 0
                });
                
                if (this.runtime.gcEvents.length > 1000) {
                    this.runtime.gcEvents.shift();
                }
                
                if (freed < 10 && (after / 1024 / 1024) > this.options.threshold * 0.7) {
                    this.outputAlert({
                        type: 'INEFFECTIVE_GC',
                        timestamp: Date.now(),
                        freedMB: freed,
                        remainingMB: after / 1024 / 1024,
                        recommendation: 'Garbage collection ineffective. Check for persistent references.'
                    });
                }
            }
        };
        
        const gcInterval = setInterval(gcStats, this.options.checkInterval * 10);
        this.runtime.intervals.push(gcInterval);
    }

    startAllocationTracking() {
        if (!this.options.trackAllocations) return;
        
        const allocations = [];
        let lastCheck = Date.now();
        
        const trackInterval = setInterval(() => {
            const now = Date.now();
            const delta = now - lastCheck;
            const rate = allocations.length / (delta / 1000);
            
            if (allocations.length > 0) {
                const allocationAlert = {
                    type: 'ALLOCATION_RATE',
                    timestamp: now,
                    allocationsPerSecond: rate.toFixed(2),
                    totalAllocations: allocations.length,
                    samplePeriod: delta,
                    recommendation: rate > 10000 ? 'Extremely high allocation rate detected. Review object creation patterns.' : null
                };
                
                if (rate > 10000) {
                    this.outputAlert(allocationAlert);
                }
                
                this.runtime.allocations.push({
                    timestamp: now,
                    rate,
                    count: allocations.length
                });
                
                allocations.length = 0;
            }
            
            lastCheck = now;
        }, 1000);
        
        this.runtime.intervals.push(trackInterval);
        
        if (this.inspector && this.inspector.console) {
            this.inspector.console.on('Console.messageAdded', (message) => {
                if (message.message && message.message.includes('allocation')) {
                    allocations.push(message);
                }
            });
        }
    }

    setupMemoryPressureHandling() {
        const memoryPressureHandler = () => {
            const currentMetric = this.runtime.metrics[this.runtime.metrics.length - 1];
            if (currentMetric && currentMetric.pressure > 0.85) {
                this.log('System memory pressure detected', 'warn');
                this.reduceMemoryFootprint();
            }
        };
        
        process.on('memoryPressure', memoryPressureHandler);
        this.runtime.memoryPressureHandler = memoryPressureHandler;
    }

    setupProcessHandlers() {
        const unhandledRejectionHandler = (reason, promise) => {
            this.outputAlert({
                type: 'UNHANDLED_REJECTION',
                timestamp: Date.now(),
                reason: reason?.toString() || 'Unknown',
                memorySnapshot: this.getRuntimeSnapshot(),
                recommendation: 'Unhandled rejection may indicate memory management issues'
            });
        };
        
        const uncaughtExceptionHandler = (error) => {
            this.outputAlert({
                type: 'UNCAUGHT_EXCEPTION',
                timestamp: Date.now(),
                error: error.message,
                stack: error.stack,
                memorySnapshot: this.getRuntimeSnapshot(),
                recommendation: 'Process crashed. Check for memory-related exceptions.'
            });
            
            if (error.message.includes('heap') || error.message.includes('memory')) {
                this.captureHeapSnapshot('crash');
            }
        };
        
        process.on('unhandledRejection', unhandledRejectionHandler);
        process.on('uncaughtException', uncaughtExceptionHandler);
        
        this.runtime.handlers = { unhandledRejectionHandler, uncaughtExceptionHandler };
    }

    detectAnomalies(metric) {
        if (this.runtime.metrics.length < 10) return;
        
        const recent = this.runtime.metrics.slice(-10);
        const older = this.runtime.metrics.slice(-30, -10);
        
        const recentGrowth = recent[recent.length - 1].heapUsedMB - recent[0].heapUsedMB;
        const olderGrowth = older[older.length - 1].heapUsedMB - older[0].heapUsedMB;
        
        if (recentGrowth > olderGrowth * 2 && recentGrowth > 100) {
            this.outputAlert({
                type: 'ACCELERATING_MEMORY_GROWTH',
                timestamp: metric.timestamp,
                recentGrowth,
                olderGrowth,
                currentUsage: metric.heapUsedMB,
                recommendation: 'Memory growth accelerating. Possible exponential leak.'
            });
        }
        
        const gcEfficiency = this.runtime.gcEvents.slice(-5);
        if (gcEfficiency.length >= 3) {
            const avgEfficiency = gcEfficiency.reduce((sum, e) => sum + e.efficiency, 0) / gcEfficiency.length;
            if (avgEfficiency < 5 && metric.pressure > 0.6) {
                this.outputAlert({
                    type: 'LOW_GC_EFFICIENCY',
                    timestamp: metric.timestamp,
                    avgEfficiency,
                    currentPressure: metric.pressure,
                    recommendation: 'Garbage collection not freeing memory. Check for lingering references.'
                });
            }
        }
    }

    async captureHeapSnapshot(reason) {
        if (!this.inspector) {
            this.log('Heap snapshot not available without inspector', 'warn');
            return null;
        }
        
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            if (!fs.existsSync(this.options.heapDumpPath)) {
                fs.mkdirSync(this.options.heapDumpPath, { recursive: true });
            }
            
            const filename = path.join(
                this.options.heapDumpPath,
                `heapdump-${Date.now()}-${reason}.heapsnapshot`
            );
            
            const session = new this.inspector.Session();
            session.connect();
            
            session.on('HeapProfiler.addHeapSnapshotChunk', (message) => {
                fs.appendFileSync(filename, message.params.chunk);
            });
            
            session.post('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
            
            setTimeout(() => {
                session.disconnect();
                this.runtime.heapSnapshots.push({
                    timestamp: Date.now(),
                    filename,
                    reason,
                    size: fs.statSync(filename).size / 1024 / 1024
                });
                
                this.log(`Heap snapshot captured: ${filename}`, 'info');
            }, 1000);
            
            return filename;
        } catch (error) {
            this.log(`Failed to capture heap snapshot: ${error.message}`, 'error');
            return null;
        }
    }

    forceGarbageCollection() {
        if (typeof global.gc === 'function') {
            const before = process.memoryUsage().heapUsed / 1024 / 1024;
            global.gc();
            global.gc();
            const after = process.memoryUsage().heapUsed / 1024 / 1024;
            this.log(`Forced GC: freed ${(before - after).toFixed(2)}MB`, 'info');
            return before - after;
        } else {
            this.log('GC not available. Run with --expose-gc', 'warn');
            return 0;
        }
    }

    reduceMemoryFootprint() {
        this.log('Attempting to reduce memory footprint', 'warn');
        
        const actions = [];
        
        const freed = this.forceGarbageCollection();
        actions.push(`Forced GC freed ${freed.toFixed(2)}MB`);
        
        if (this.runtime.metrics.length > 1000) {
            this.runtime.metrics = this.runtime.metrics.slice(-500);
            actions.push('Trimmed metrics history');
        }
        
        if (this.runtime.allocations.length > 1000) {
            this.runtime.allocations = this.runtime.allocations.slice(-500);
            actions.push('Trimmed allocations history');
        }
        
        this.outputAlert({
            type: 'MEMORY_FOOTPRINT_REDUCTION',
            timestamp: Date.now(),
            actions,
            currentMemory: this.getRuntimeSnapshot()
        });
        
        return actions;
    }

    async initiateRuntimeRestart() {
        this.runtime.restartCount++;
        this.runtime.lastRestart = Date.now();
        
        this.log(`Initiating runtime restart (attempt ${this.runtime.restartCount})`, 'error');
        
        await this.captureHeapSnapshot('prerestart');
        
        if (this.options.restartCommand) {
            const { exec } = await import('child_process');
            exec(this.options.restartCommand, (error) => {
                if (error) {
                    this.log(`Restart command failed: ${error.message}`, 'error');
                } else {
                    this.log('Process restart initiated', 'info');
                }
            });
        } else {
            this.log('No restart command configured. Manual restart required.', 'error');
        }
    }

    getRuntimeRecommendation(metric) {
        const recommendations = [];
        
        if (metric.pressure > 0.8) {
            recommendations.push('CRITICAL: Reduce memory usage immediately');
            recommendations.push('Consider implementing pagination or streaming');
        }
        
        if (metric.heapUsedMB > this.options.threshold) {
            recommendations.push('Review data structures and caching strategies');
            recommendations.push('Implement LRU caches or bounded queues');
        }
        
        const growth = this.calculateGrowthTrend();
        if (growth > 10) {
            recommendations.push(`High memory growth trend: ${growth.toFixed(2)} MB/s`);
            recommendations.push('Check for event listener leaks or unbounded collections');
        }
        
        return recommendations;
    }

    calculateGrowthTrend() {
        if (this.runtime.metrics.length < 10) return 0;
        
        const recent = this.runtime.metrics.slice(-10);
        const timeSpan = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000;
        const growth = recent[recent.length - 1].heapUsedMB - recent[0].heapUsedMB;
        
        return timeSpan > 0 ? growth / timeSpan : 0;
    }

    getRuntimeSnapshot() {
        const memory = process.memoryUsage();
        return {
            heapUsedMB: (memory.heapUsed / 1024 / 1024).toFixed(2),
            heapTotalMB: (memory.heapTotal / 1024 / 1024).toFixed(2),
            rssMB: (memory.rss / 1024 / 1024).toFixed(2),
            externalMB: (memory.external / 1024 / 1024).toFixed(2),
            pressure: this.memoryPressure,
            uptime: ((Date.now() - this.runtime.startTime) / 1000).toFixed(2),
            restartCount: this.runtime.restartCount,
            gcEvents: this.runtime.gcEvents.length,
            totalMetrics: this.runtime.metrics.length
        };
    }

    outputAlert(alert) {
        const formatted = this.formatRuntimeAlert(alert);
        
        if (this.options.logToConsole) {
            const color = alert.type.includes('CRITICAL') ? '\x1b[31m' : 
                         alert.type.includes('THRESHOLD') ? '\x1b[33m' : '\x1b[35m';
            console.error(`${color}${formatted}\x1b[0m`);
        }
        
        if (this.options.logToFile) {
            this.writeToRuntimeLog(formatted);
        }
        
        if (this.options.callbacks.onAlert) {
            this.options.callbacks.onAlert(alert);
        }
    }

    formatRuntimeAlert(alert) {
        const timestamp = new Date(alert.timestamp).toISOString();
        let output = `\n[${timestamp}] [RUNTIME] [${alert.type}]\n`;
        output += `${'-'.repeat(60)}\n`;
        
        for (const [key, value] of Object.entries(alert)) {
            if (key !== 'type' && key !== 'timestamp') {
                output += `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
            }
        }
        
        return output;
    }

    writeToRuntimeLog(content) {
        const fs = require('fs');
        try {
            fs.appendFileSync(this.options.logFilePath, content + '\n');
        } catch (error) {
            console.error(`Failed to write log: ${error.message}`);
        }
    }

    emitMetric(metric) {
        if (this.options.callbacks.onMetric) {
            this.options.callbacks.onMetric(metric);
        }
    }

    handlePressureChange(newPressure) {
        if (newPressure === 'high' || newPressure === 'critical') {
            this.reduceMemoryFootprint();
        }
        
        if (this.options.callbacks.onPressureChange) {
            this.options.callbacks.onPressureChange(newPressure, this.memoryPressure);
        }
    }

    async getRuntimeReport() {
        const currentSnapshot = this.getRuntimeSnapshot();
        const growthTrend = this.calculateGrowthTrend();
        
        return {
            timestamp: Date.now(),
            runtime: {
                isRunning: this.runtime.isRunning,
                uptime: currentSnapshot.uptime,
                restartCount: this.runtime.restartCount,
                lastRestart: this.runtime.lastRestart
            },
            memory: currentSnapshot,
            metrics: {
                total: this.runtime.metrics.length,
                gcEvents: this.runtime.gcEvents.length,
                allocations: this.runtime.allocations.length,
                pressureEvents: this.runtime.pressureEvents.length,
                heapSnapshots: this.runtime.heapSnapshots.length
            },
            trends: {
                growthRateMBps: growthTrend,
                averagePressure: this.calculateAveragePressure(),
                gcEfficiency: this.calculateAverageGCEfficiency()
            },
            alerts: {
                recent: this.runtime.pressureEvents.slice(-5),
                critical: this.runtime.pressureEvents.filter(e => e.to === 'critical').length
            },
            recommendations: this.generateRuntimeRecommendations()
        };
    }

    calculateAveragePressure() {
        if (this.runtime.metrics.length === 0) return 0;
        const sum = this.runtime.metrics.reduce((s, m) => s + m.pressure, 0);
        return sum / this.runtime.metrics.length;
    }

    calculateAverageGCEfficiency() {
        if (this.runtime.gcEvents.length === 0) return 0;
        const sum = this.runtime.gcEvents.reduce((s, e) => s + e.efficiency, 0);
        return sum / this.runtime.gcEvents.length;
    }

    generateRuntimeRecommendations() {
        const recommendations = [];
        const avgPressure = this.calculateAveragePressure();
        
        if (avgPressure > 0.7) {
            recommendations.push('Consistently high memory pressure. Consider increasing heap limit or optimizing memory usage.');
        }
        
        const growthTrend = this.calculateGrowthTrend();
        if (growthTrend > 5) {
            recommendations.push('Persistent memory growth detected. Implement proper cleanup and disposal patterns.');
        }
        
        const avgGCEff = this.calculateAverageGCEfficiency();
        if (avgGCEff < 10) {
            recommendations.push('Garbage collection efficiency is low. Review object lifecycle management.');
        }
        
        if (this.runtime.restartCount > 2) {
            recommendations.push('Multiple restarts occurred. Investigate root cause of memory issues.');
        }
        
        return recommendations;
    }

    async stop() {
        if (!this.runtime.isRunning) return false;
        
        this.runtime.intervals.forEach(clearInterval);
        this.runtime.intervals = [];
        
        if (this.runtime.handlers) {
            process.removeListener('unhandledRejection', this.runtime.handlers.unhandledRejectionHandler);
            process.removeListener('uncaughtException', this.runtime.handlers.uncaughtExceptionHandler);
        }
        
        if (this.runtime.memoryPressureHandler) {
            process.removeListener('memoryPressure', this.runtime.memoryPressureHandler);
        }
        
        this.runtime.isRunning = false;
        this.log('Runtime memory patcher stopped', 'info');
        
        return true;
    }

    log(message, level = 'info') {
        if (!this.options.logToConsole) return;
        
        const prefix = level === 'error' ? '\x1b[31m' : 
                      level === 'warn' ? '\x1b[33m' : 
                      level === 'debug' ? '\x1b[36m' : '\x1b[32m';
        
        console.log(`${prefix}[RuntimeMemoryPatcher] ${message}\x1b[0m`);
    }
}

export const createRuntimePatcher = async (options) => {
    const patcher = new RuntimeMemoryPatcher(options);
    await patcher.start();
    return patcher;
};

export default RuntimeMemoryPatcher;