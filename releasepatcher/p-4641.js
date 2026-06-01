export class ProcessManager {
    constructor(config = {}) {
        this.config = this.mergeConfigs(this.defaultConfig, config);
        this.processes = new Map();
        this.hooks = new Map();
        this.metrics = new Map();
        this.listeners = new Map();
        this.state = 'idle';
    }

    get defaultConfig() {
        return {
            maxConcurrent: 5,
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 30000,
            memoryLimit: 512,
            cpuLimit: 100,
            logLevel: 'info',
            autoRestart: false,
            restartDelay: 2000,
            gracefulShutdown: true,
            shutdownTimeout: 10000,
            environment: 'production',
            workingDirectory: process.cwd(),
            umask: 0o22,
            detached: false,
            stdio: 'pipe',
            killSignal: 'SIGTERM',
            windowsHide: true,
            shell: false,
            cwd: process.cwd(),
            env: { ...process.env },
            argv0: null,
            serialization: 'json',
            cleanup: true,
            monitorInterval: 1000,
            heartbeatInterval: 5000,
            maxMemoryRestart: 1024,
            maxCpuRestart: 200,
            errorThreshold: 5,
            errorWindow: 60000
        };
    }

    mergeConfigs(defaults, custom) {
        const result = { ...defaults };
        for (const key in custom) {
            if (custom[key] && typeof custom[key] === 'object' && !Array.isArray(custom[key])) {
                result[key] = this.mergeConfigs(result[key] || {}, custom[key]);
            } else {
                result[key] = custom[key];
            }
        }
        return result;
    }

    async spawn(name, command, args = [], options = {}) {
        if (this.processes.size >= this.config.maxConcurrent) {
            throw new Error(`Maximum concurrent processes limit reached: ${this.config.maxConcurrent}`);
        }

        const processOptions = this.buildProcessOptions(options);
        const startTime = Date.now();
        
        const { spawn } = await import('child_process');
        const child = spawn(command, args, processOptions);
        
        const processRecord = {
            name,
            pid: child.pid,
            process: child,
            status: 'starting',
            startTime,
            restartCount: 0,
            errorCount: 0,
            lastError: null,
            options: processOptions,
            metrics: {
                cpu: [],
                memory: [],
                uptime: 0
            }
        };

        this.processes.set(name, processRecord);
        await this.executeHook('onSpawn', { name, pid: child.pid });
        
        this.attachEventHandlers(child, processRecord);
        this.startMonitoring(name);
        
        return { pid: child.pid, name };
    }

    buildProcessOptions(options) {
        return {
            cwd: options.cwd || this.config.cwd,
            env: { ...this.config.env, ...options.env },
            argv0: options.argv0 || this.config.argv0,
            stdio: options.stdio || this.config.stdio,
            detached: options.detached ?? this.config.detached,
            uid: options.uid,
            gid: options.gid,
            shell: options.shell ?? this.config.shell,
            windowsHide: options.windowsHide ?? this.config.windowsHide,
            windowsVerbatimArguments: options.windowsVerbatimArguments || false,
            timeout: options.timeout || this.config.timeout,
            killSignal: options.killSignal || this.config.killSignal
        };
    }

    attachEventHandlers(child, record) {
        child.on('spawn', () => {
            record.status = 'running';
            this.log('info', `Process ${record.name} spawned with PID ${child.pid}`);
            this.executeHook('onStart', { name: record.name, pid: child.pid });
        });

        child.on('error', (error) => {
            record.status = 'error';
            record.lastError = error.message;
            record.errorCount++;
            this.log('error', `Process ${record.name} error: ${error.message}`);
            this.executeHook('onError', { name: record.name, error, pid: child.pid });
            this.handleProcessFailure(record);
        });

        child.on('exit', (code, signal) => {
            record.status = 'exited';
            record.exitCode = code;
            record.exitSignal = signal;
            this.log('info', `Process ${record.name} exited with code ${code}, signal ${signal}`);
            this.executeHook('onExit', { name: record.name, code, signal, pid: child.pid });
            
            if (this.config.autoRestart && code !== 0 && record.restartCount < this.config.retryAttempts) {
                this.restartProcess(record.name);
            }
        });

        child.on('close', (code, signal) => {
            this.log('debug', `Process ${record.name} closed with code ${code}, signal ${signal}`);
            this.executeHook('onClose', { name: record.name, code, signal });
        });

        child.on('disconnect', () => {
            this.log('warn', `Process ${record.name} disconnected`);
            this.executeHook('onDisconnect', { name: record.name });
        });

        if (child.stdout) {
            child.stdout.on('data', (data) => {
                this.handleOutput(record.name, 'stdout', data);
            });
        }

        if (child.stderr) {
            child.stderr.on('data', (data) => {
                this.handleOutput(record.name, 'stderr', data);
            });
        }
    }

    handleOutput(name, stream, data) {
        const output = data.toString();
        this.executeHook('onOutput', { name, stream, data: output });
        
        if (this.config.logLevel === 'debug' || stream === 'stderr') {
            this.log(stream === 'stderr' ? 'error' : 'info', `[${name}] ${output.trim()}`);
        }
    }

    async kill(name, signal = null) {
        const record = this.processes.get(name);
        if (!record) {
            throw new Error(`Process ${name} not found`);
        }

        const killSignal = signal || record.options.killSignal || this.config.killSignal;
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                if (record.process.killed) {
                    resolve(true);
                } else {
                    record.process.kill('SIGKILL');
                    resolve(true);
                }
            }, this.config.shutdownTimeout);

            record.process.once('exit', () => {
                clearTimeout(timeout);
                resolve(true);
            });

            record.process.kill(killSignal);
            this.log('info', `Sent ${killSignal} to process ${name}`);
            this.executeHook('onKill', { name, signal: killSignal });
        });
    }

    async stop(name) {
        const record = this.processes.get(name);
        if (!record) {
            throw new Error(`Process ${name} not found`);
        }

        if (this.config.gracefulShutdown) {
            await this.sendMessage(name, { type: 'shutdown', graceful: true });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await this.kill(name);
        this.processes.delete(name);
        this.stopMonitoring(name);
        this.log('info', `Process ${name} stopped`);
        
        return true;
    }

    async restartProcess(name) {
        const record = this.processes.get(name);
        if (!record) {
            throw new Error(`Process ${name} not found`);
        }

        this.log('info', `Restarting process ${name}, attempt ${record.restartCount + 1}`);
        
        await this.kill(name);
        await new Promise(resolve => setTimeout(resolve, this.config.restartDelay));
        
        const newRecord = await this.spawn(
            name, 
            record.process.spawnfile || record.process.spawnargs[0],
            record.process.spawnargs.slice(1),
            record.options
        );
        
        newRecord.restartCount = record.restartCount + 1;
        this.processes.set(name, newRecord);
        
        return newRecord;
    }

    async handleProcessFailure(record) {
        const errorWindow = this.config.errorWindow;
        const threshold = this.config.errorThreshold;
        
        const recentErrors = record.errorCount;
        
        if (recentErrors >= threshold) {
            this.log('error', `Process ${record.name} exceeded error threshold (${threshold})`);
            this.executeHook('onThresholdExceeded', { name: record.name, errors: recentErrors });
            
            if (this.config.autoRestart) {
                await this.restartProcess(record.name);
                record.errorCount = 0;
            }
        }
    }

    async sendMessage(name, message) {
        const record = this.processes.get(name);
        if (!record || !record.process.connected) {
            throw new Error(`Process ${name} is not connected`);
        }
        
        const serialized = this.config.serialization === 'json' 
            ? JSON.stringify(message)
            : message;
            
        record.process.send(serialized);
        this.log('debug', `Sent message to ${name}`);
    }

    startMonitoring(name) {
        const interval = setInterval(async () => {
            const record = this.processes.get(name);
            if (!record || record.status !== 'running') {
                clearInterval(interval);
                return;
            }
            
            await this.collectMetrics(name);
            this.checkResourceLimits(name);
        }, this.config.monitorInterval);
        
        if (!this.monitors) this.monitors = new Map();
        this.monitors.set(name, interval);
    }

    stopMonitoring(name) {
        if (this.monitors && this.monitors.has(name)) {
            clearInterval(this.monitors.get(name));
            this.monitors.delete(name);
        }
    }

    async collectMetrics(name) {
        const record = this.processes.get(name);
        if (!record) return;
        
        const pid = record.pid;
        
        try {
            const { memoryUsage, cpuUsage } = await this.getProcessMetrics(pid);
            
            record.metrics.memory.push({ time: Date.now(), value: memoryUsage });
            record.metrics.cpu.push({ time: Date.now(), value: cpuUsage });
            
            if (record.metrics.memory.length > 100) record.metrics.memory.shift();
            if (record.metrics.cpu.length > 100) record.metrics.cpu.shift();
            
            record.metrics.uptime = (Date.now() - record.startTime) / 1000;
            
            this.metrics.set(name, {
                memory: memoryUsage,
                cpu: cpuUsage,
                uptime: record.metrics.uptime,
                timestamp: Date.now()
            });
            
            this.executeHook('onMetrics', { name, metrics: this.metrics.get(name) });
        } catch (error) {
            this.log('debug', `Failed to collect metrics for ${name}: ${error.message}`);
        }
    }

    async getProcessMetrics(pid) {
        return new Promise((resolve, reject) => {
            if (process.platform === 'win32') {
                resolve({ memoryUsage: 0, cpuUsage: 0 });
                return;
            }
            
            try {
                const memoryUsage = process.memoryUsage().rss / 1024 / 1024;
                const cpuUsage = process.cpuUsage();
                const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
                resolve({ memoryUsage, cpuUsage: cpuPercent });
            } catch (error) {
                reject(error);
            }
        });
    }

    checkResourceLimits(name) {
        const metrics = this.metrics.get(name);
        if (!metrics) return;
        
        if (metrics.memory > this.config.maxMemoryRestart) {
            this.log('warn', `Process ${name} exceeded memory limit: ${metrics.memory}MB / ${this.config.maxMemoryRestart}MB`);
            this.executeHook('onMemoryExceeded', { name, memory: metrics.memory });
            
            if (this.config.autoRestart) {
                this.restartProcess(name);
            }
        }
        
        if (metrics.cpu > this.config.maxCpuRestart) {
            this.log('warn', `Process ${name} exceeded CPU limit: ${metrics.cpu}% / ${this.config.maxCpuRestart}%`);
            this.executeHook('onCpuExceeded', { name, cpu: metrics.cpu });
            
            if (this.config.autoRestart) {
                this.restartProcess(name);
            }
        }
    }

    getStatus(name = null) {
        if (name) {
            const record = this.processes.get(name);
            if (!record) return null;
            
            return {
                name: record.name,
                pid: record.pid,
                status: record.status,
                uptime: record.metrics.uptime,
                restartCount: record.restartCount,
                errorCount: record.errorCount,
                lastError: record.lastError,
                metrics: this.metrics.get(name)
            };
        }
        
        const allStatus = {};
        for (const [name, record] of this.processes) {
            allStatus[name] = {
                pid: record.pid,
                status: record.status,
                uptime: record.metrics.uptime,
                restartCount: record.restartCount
            };
        }
        return allStatus;
    }

    async listProcesses() {
        const processes = [];
        for (const [name, record] of this.processes) {
            processes.push({
                name,
                pid: record.pid,
                status: record.status,
                startTime: record.startTime,
                restartCount: record.restartCount
            });
        }
        return processes;
    }

    async waitForProcess(name, timeout = null) {
        const record = this.processes.get(name);
        if (!record) {
            throw new Error(`Process ${name} not found`);
        }
        
        const waitTimeout = timeout || this.config.timeout;
        
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for process ${name}`));
            }, waitTimeout);
            
            record.process.once('exit', (code, signal) => {
                clearTimeout(timer);
                resolve({ code, signal });
            });
        });
    }

    async broadcast(message) {
        const results = [];
        for (const [name] of this.processes) {
            try {
                await this.sendMessage(name, message);
                results.push({ name, success: true });
            } catch (error) {
                results.push({ name, success: false, error: error.message });
            }
        }
        return results;
    }

    async killAll(signal = 'SIGTERM') {
        const promises = [];
        for (const [name] of this.processes) {
            promises.push(this.kill(name, signal));
        }
        await Promise.all(promises);
        this.processes.clear();
        this.log('info', 'All processes terminated');
    }

    registerHook(event, callback) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        this.hooks.get(event).push(callback);
    }

    async executeHook(event, data) {
        const hooks = this.hooks.get(event);
        if (!hooks) return;
        
        for (const hook of hooks) {
            try {
                await hook(data);
            } catch (error) {
                this.log('error', `Hook ${event} failed: ${error.message}`);
            }
        }
    }

    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(listener);
    }

    emit(event, ...args) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(listener => listener(...args));
        }
        this.executeHook(event, args[0]);
    }

    log(level, message) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        const currentLevel = levels[this.config.logLevel] || 1;
        const messageLevel = levels[level] || 1;
        
        if (messageLevel >= currentLevel) {
            const timestamp = new Date().toISOString();
            console[level === 'debug' ? 'log' : level](`[${timestamp}] [${level.toUpperCase()}] ${message}`);
            this.emit('log', { level, message, timestamp });
        }
    }

    async exportMetrics() {
        const exportData = {
            timestamp: Date.now(),
            processes: {},
            summary: {
                total: this.processes.size,
                running: 0,
                stopped: 0,
                error: 0
            }
        };
        
        for (const [name, record] of this.processes) {
            exportData.processes[name] = {
                metrics: this.metrics.get(name),
                status: record.status,
                uptime: record.metrics.uptime,
                restartCount: record.restartCount
            };
            
            if (record.status === 'running') exportData.summary.running++;
            if (record.status === 'exited') exportData.summary.stopped++;
            if (record.status === 'error') exportData.summary.error++;
        }
        
        return exportData;
    }

    async resetMetrics(name = null) {
        if (name) {
            const record = this.processes.get(name);
            if (record) {
                record.metrics = { cpu: [], memory: [], uptime: 0 };
                record.errorCount = 0;
                this.metrics.delete(name);
            }
        } else {
            for (const [procName, record] of this.processes) {
                record.metrics = { cpu: [], memory: [], uptime: 0 };
                record.errorCount = 0;
                this.metrics.delete(procName);
            }
        }
        this.log('info', `Metrics reset for ${name || 'all processes'}`);
    }

    async setConfig(config) {
        this.config = this.mergeConfigs(this.config, config);
        this.log('info', 'Configuration updated');
    }

    async getConfig() {
        return { ...this.config };
    }

    async healthCheck() {
        const health = {
            status: 'healthy',
            processes: {},
            timestamp: Date.now()
        };
        
        for (const [name, record] of this.processes) {
            const isHealthy = record.status === 'running' && 
                            (!this.metrics.get(name) || 
                             this.metrics.get(name).memory < this.config.maxMemoryRestart);
            
            health.processes[name] = {
                status: isHealthy ? 'healthy' : 'unhealthy',
                details: record.status
            };
            
            if (!isHealthy) health.status = 'degraded';
        }
        
        return health;
    }

    async cleanup() {
        this.log('info', 'Starting cleanup');
        
        await this.killAll('SIGTERM');
        
        if (this.monitors) {
            for (const interval of this.monitors.values()) {
                clearInterval(interval);
            }
            this.monitors.clear();
        }
        
        this.processes.clear();
        this.metrics.clear();
        this.hooks.clear();
        this.state = 'cleaned';
        
        this.log('info', 'Cleanup completed');
    }
}

export const createProcessManager = (config) => new ProcessManager(config);

export default ProcessManager;  