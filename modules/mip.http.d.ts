/**
 * HTTP Server Module
 * @module ServerModule
 * @description Lightweight HTTP server with routing and middleware support
 * 
 * @example
 * ```typescript
 * const app = new ServerModule({ port: 8080 })
 * app.get('/', (req, res) => res.json({ ok: true }))
 * app.start()
 * ```
 */
class ServerModule {
    /** Server port number */
    private port: number
    /** Server hostname */
    private host: string
    /** Route collection */
    private routes: Record<string, Function>
    /** Middleware array */
    private middleware: Function[]
    /** HTTP server instance */
    private server: any
    /** Server running status */
    private isRunning: boolean
    /** Start callback function */
    private onStartCallback: Function | null
    /** Error callback function */
    private onErrorCallback: Function | null

    /**
     * Server module constructor
     * @param config - Server configuration object
     * @param config.port - Listening port (default: 3000)
     * @param config.host - Listening host (default: 'localhost')
     * @param config.onStart - Callback fired when server starts
     * @param config.onError - Callback fired when error occurs
     */
    constructor(config: {
        port?: number
        host?: string
        onStart?: Function
        onError?: Function
    } = {}) {
        this.port = config.port || 3000
        this.host = config.host || 'localhost'
        this.routes = {}
        this.middleware = []
        this.server = null
        this.isRunning = false
        this.onStartCallback = config.onStart || null
        this.onErrorCallback = config.onError || null
    }

    /**
     * Registers a GET route
     * @param path - Route path (supports :param syntax)
     * @param handler - Request handler function
     * @returns Server instance for chaining
     * 
     * @example
     * ```typescript
     * app.get('/users/:id', (req, res) => {
     *     res.json({ userId: req.params.id })
     * })
     * ```
     */
    public get(path: string, handler: Function): this {
        this.routes['GET:' + path] = handler
        return this
    }

    /**
     * Registers a POST route
     * @param path - Route path
     * @param handler - Request handler function
     * @returns Server instance for chaining
     */
    public post(path: string, handler: Function): this {
        this.routes['POST:' + path] = handler
        return this
    }

    /**
     * Registers a PUT route
     * @param path - Route path
     * @param handler - Request handler function
     * @returns Server instance for chaining
     */
    public put(path: string, handler: Function): this {
        this.routes['PUT:' + path] = handler
        return this
    }

    /**
     * Registers a DELETE route
     * @param path - Route path
     * @param handler - Request handler function
     * @returns Server instance for chaining
     */
    public delete(path: string, handler: Function): this {
        this.routes['DELETE:' + path] = handler
        return this
    }

    /**
     * Adds middleware to the pipeline
     * @param fn - Middleware function (req, res, next) => void
     * @returns Server instance for chaining
     * 
     * @example
     * ```typescript
     * app.use((req, res, next) => {
     *     console.log(`${req.method} ${req.path}`)
     *     next()
     * })
     * ```
     */
    public use(fn: Function): this {
        this.middleware.push(fn)
        return this
    }

    /**
     * Finds a matching route for the request
     * @param method - HTTP method (GET, POST, etc.)
     * @param path - Request path
     * @returns Route handler with params or null if not found
     * @internal
     */
    private findRoute(method: string, path: string): { handler: Function, params: Record<string, string> } | null {
        // Check for exact match
        const exact = this.routes[method + ':' + path]
        if (exact) return { handler: exact, params: {} }

        // Check for dynamic routes
        for (const [key, handler] of Object.entries(this.routes)) {
            const [routeMethod, routePath] = key.split(':')
            if (routeMethod !== method) continue

            const routeParts = routePath.split('/')
            const pathParts = path.split('/')
            
            if (routeParts.length !== pathParts.length) continue

            const params: Record<string, string> = {}
            let match = true

            for (let i = 0; i < routeParts.length; i++) {
                if (routeParts[i].startsWith(':')) {
                    params[routeParts[i].slice(1)] = pathParts[i]
                } else if (routeParts[i] !== pathParts[i]) {
                    match = false
                    break
                }
            }

            if (match) return { handler, params }
        }

        return null
    }

    /**
     * Creates a response helper object
     * @param req - Request object
     * @param res - Response object
     * @returns Response helper with convenient methods
     * @internal
     */
    private createResponse(req: any, res: any): any {
        return {
            /**
             * Sets HTTP status code
             * @param code - Status code
             * @returns Response helper for chaining
             */
            status: (code: number) => {
                res.statusCode = code
                return this.createResponse(req, res)
            },
            /**
             * Sends JSON response
             * @param data - Data to serialize as JSON
             */
            json: (data: any) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
            },
            /**
             * Sends plain text response
             * @param data - Data to send
             */
            send: (data: string) => {
                res.end(data)
            },
            /**
             * Sends HTML response
             * @param data - HTML content
             */
            html: (data: string) => {
                res.setHeader('Content-Type', 'text/html')
                res.end(data)
            },
            /**
             * Sets response header
             * @param key - Header name
             * @param value - Header value
             * @returns Response helper for chaining
             */
            setHeader: (key: string, value: string) => {
                res.setHeader(key, value)
                return this.createResponse(req, res)
            }
        }
    }

    /**
     * Parses request body
     * @param req - Request object
     * @returns Promise that resolves when body is parsed
     * @internal
     */
    private parseBody(req: any): Promise<void> {
        return new Promise((resolve) => {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
                try {
                    const contentType = req.headers['content-type'] || ''
                    
                    if (contentType.includes('application/json')) {
                        req.body = body ? JSON.parse(body) : {}
                    } else if (contentType.includes('application/x-www-form-urlencoded')) {
                        const params = new URLSearchParams(body)
                        req.body = Object.fromEntries(params)
                    } else {
                        req.body = body
                    }
                } catch {
                    req.body = {}
                }
                resolve()
            })
        })
    }

    /**
     * Handles incoming HTTP request
     * @param req - Request object
     * @param res - Response object
     * @internal
     */
    private async handleRequest(req: any, res: any): Promise<void> {
        // Parse URL
        const url = new URL(req.url, 'http://' + req.headers.host)
        req.path = url.pathname
        req.query = Object.fromEntries(url.searchParams)
        req.params = {}

        // Parse request body
        await this.parseBody(req)

        // Create response helper
        const response = this.createResponse(req, res)

        // Middleware execution
        let index = 0
        const next = async (error?: Error) => {
            if (error) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: error.message }))
                return
            }

            if (index < this.middleware.length) {
                const middleware = this.middleware[index++]
                await middleware(req, response, next)
            } else {
                // Find and execute route handler
                const route = this.findRoute(req.method, req.path)
                
                if (route) {
                    req.params = route.params
                    try {
                        await route.handler(req, response)
                    } catch (error) {
                        res.statusCode = 500
                        res.setHeader('Content-Type', 'application/json')
                        res.end(JSON.stringify({ error: error.message }))
                        if (this.onErrorCallback) this.onErrorCallback(error)
                    }
                } else {
                    // Route not found
                    res.statusCode = 404
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: 'Not Found' }))
                }
            }
        }

        await next()
    }

    /**
     * Starts the HTTP server
     * @returns Server instance
     * 
     * @example
     * ```typescript
     * app.start()
     * ```
     */
    public start(): this {
        if (this.isRunning) {
            console.log('Server is already running')
            return this
        }

        // Browser environment detection
        if (typeof window !== 'undefined') {
            console.log('Browser environment detected')
            console.log('Registered routes:', Object.keys(this.routes))
            console.log('Use fetch() to make requests')
            return this
        }

        // Node.js / Bun / Deno environment
        try {
            const http = eval('require')('http')
            
            this.server = http.createServer((req: any, res: any) => {
                this.handleRequest(req, res)
            })

            this.server.listen(this.port, this.host, () => {
                this.isRunning = true
                console.log(`Server running at http://${this.host}:${this.port}`)
                console.log('Registered routes:', Object.keys(this.routes))
                if (this.onStartCallback) this.onStartCallback()
            })

            this.server.on('error', (error: Error) => {
                console.error('Server error:', error.message)
                if (this.onErrorCallback) this.onErrorCallback(error)
            })

        } catch {
            console.log('No HTTP module found. Running in mock mode.')
            console.log('Registered routes:', Object.keys(this.routes))
        }

        return this
    }

    /**
     * Stops the HTTP server
     * @returns Promise that resolves when server is stopped
     * 
     * @example
     * ```typescript
     * await app.stop()
     * ```
     */
    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server || !this.isRunning) {
                resolve()
                return
            }

            this.server.close(() => {
                this.isRunning = false
                this.server = null
                console.log('Server stopped')
                resolve()
            })
        })
    }
}

// Export the module
export { ServerModule }
export default ServerModule