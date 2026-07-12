/**
 * MIP Router Module
 * @module MipRouter
 * @description Advanced routing system with nested routes, middleware, and parameter handling
 * 
 * @example
 * ```typescript
 * import { MipRouter } from './mip-router.js'
 * 
 * const router = new MipRouter()
 * router.get('/users/:id', (req, res) => {
 *     res.json({ user: req.params.id })
 * })
 * 
 * const api = new MipRouter({ prefix: '/api' })
 * api.use(authenticate)
 * api.get('/data', handler)
 * 
 * router.use('/api', api)
 * ```
 */
class MipRouter {
    /** Route collection */
    private routes: Map<string, Route>
    /** Middleware stack */
    private middleware: Middleware[]
    /** Route prefix */
    private prefix: string
    /** Case sensitive routing */
    private caseSensitive: boolean
    /** Strict path matching */
    private strict: boolean
    /** Merge params from parent */
    private mergeParams: boolean
    /** Parent router reference */
    private parent: MipRouter | null
    /** Parameters from parent */
    private parentParams: Record<string, string>

    /**
     * Router constructor
     * @param config - Router configuration
     * @param config.prefix - Route prefix (default: '')
     * @param config.caseSensitive - Case sensitive matching (default: false)
     * @param config.strict - Strict path matching (default: false)
     * @param config.mergeParams - Merge parent params (default: true)
     */
    constructor(config: {
        prefix?: string
        caseSensitive?: boolean
        strict?: boolean
        mergeParams?: boolean
    } = {}) {
        this.routes = new Map()
        this.middleware = []
        this.prefix = config.prefix || ''
        this.caseSensitive = config.caseSensitive || false
        this.strict = config.strict || false
        this.mergeParams = config.mergeParams !== undefined ? config.mergeParams : true
        this.parent = null
        this.parentParams = {}
    }

    /**
     * Registers a GET route
     * @param path - Route path
     * @param handlers - Handler functions
     * @returns Router instance for chaining
     */
    public get(path: string, ...handlers: Function[]): this {
        this.registerRoute('GET', path, handlers)
        return this
    }

    /**
     * Registers a POST route
     * @param path - Route path
     * @param handlers - Handler functions
     * @returns Router instance for chaining
     */
    public post(path: string, ...handlers: Function[]): this {
        this.registerRoute('POST', path, handlers)
        return this
    }

    /**
     * Registers a PUT route
     * @param path - Route path
     * @param handlers - Handler functions
     * @returns Router instance for chaining
     */
    public put(path: string, ...handlers: Function[]): this {
        this.registerRoute('PUT', path, handlers)
        return this
    }

    /**
     * Registers a DELETE route
     * @param path - Route path
     * @param handlers - Handler functions
     * @returns Router instance for chaining
     */
    public delete(path: string, ...handlers: Function[]): this {
        this.registerRoute('DELETE', path, handlers)
        return this
    }

    /**
     * Registers a PATCH route
     * @param path - Route path
     * @param handlers - Handler functions
     * @returns Router instance for chaining
     */
    public patch(path: string, ...handlers: Function[]): this {
        this.registerRoute('PATCH', path, handlers)
        return this
    }

    /**
     * Registers an OPTIONS route
     * @param path - Route path
     * @param handlers - Handler functions
     * @returns Router instance for chaining
     */
    public options(path: string, ...handlers: Function[]): this {
        this.registerRoute('OPTIONS', path, handlers)
        return this
    }

    /**
     * Registers a HEAD route
     * @param path - Route path
     * @param handlers - Handler functions
     * @returns Router instance for chaining
     */
    public head(path: string, ...handlers: Function[]): this {
        this.registerRoute('HEAD', path, handlers)
        return this
    }

    /**
     * Registers a route for ALL methods
     * @param path - Route path
     * @param handlers - Handler functions
     * @returns Router instance for chaining
     */
    public all(path: string, ...handlers: Function[]): this {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
        for (const method of methods) {
            this.registerRoute(method, path, handlers)
        }
        return this
    }

    /**
     * Registers middleware
     * @param path - Optional path for middleware (default: '/*')
     * @param handlers - Middleware functions
     * @returns Router instance for chaining
     */
    public use(path: string | Function, ...handlers: Function[]): this {
        let routePath = '*'
        let middlewares: Function[] = []

        if (typeof path === 'string') {
            routePath = path
            middlewares = handlers
        } else {
            middlewares = [path, ...handlers]
        }

        // If it's a router instance, mount it
        if (middlewares.length === 1 && middlewares[0] instanceof MipRouter) {
            const subRouter = middlewares[0] as MipRouter
            subRouter.parent = this
            subRouter.prefix = this.normalizePath(this.prefix + routePath)
            
            // Merge parent params
            if (this.mergeParams) {
                subRouter.parentParams = { ...this.parentParams }
            }
            
            // Register all sub-router routes
            for (const [key, route] of subRouter.routes) {
                const newKey = `${route.method}:${subRouter.prefix}${route.path}`
                this.routes.set(newKey, {
                    ...route,
                    path: this.normalizePath(subRouter.prefix + route.path),
                    handlers: route.handlers
                })
            }
            
            return this
        }

        // Regular middleware
        const normalizedPath = this.normalizePath(this.prefix + routePath)
        this.middleware.push({
            path: normalizedPath,
            handlers: middlewares as Function[],
            isMiddleware: true
        })

        return this
    }

    /**
     * Registers a route
     * @param method - HTTP method
     * @param path - Route path
     * @param handlers - Handler functions
     * @internal
     */
    private registerRoute(method: string, path: string, handlers: Function[]): void {
        const normalizedPath = this.normalizePath(this.prefix + path)
        const key = `${method}:${normalizedPath}`
        
        this.routes.set(key, {
            method,
            path: normalizedPath,
            handlers,
            params: this.extractParams(normalizedPath)
        })
    }

    /**
     * Normalizes path
     * @param path - Path to normalize
     * @returns Normalized path
     * @internal
     */
    private normalizePath(path: string): string {
        if (!path) return '/'
        
        // Remove trailing slash if not strict
        if (!this.strict && path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1)
        }
        
        // Ensure leading slash
        if (!path.startsWith('/')) {
            path = '/' + path
        }
        
        return path
    }

    /**
     * Extracts parameters from path
     * @param path - Path with parameters
     * @returns Array of parameter names
     * @internal
     */
    private extractParams(path: string): string[] {
        const params: string[] = []
        const parts = path.split('/')
        
        for (const part of parts) {
            if (part.startsWith(':')) {
                params.push(part.slice(1))
            }
        }
        
        return params
    }

    /**
     * Handles incoming request
     * @param req - Request object
     * @param res - Response object
     * @returns Promise that resolves when request is handled
     */
    public async handle(req: any, res: any): Promise<void> {
        // Combine parent and local params
        if (this.mergeParams) {
            req.params = { ...this.parentParams, ...req.params }
        }

        // Find matching route
        const route = this.findRoute(req.method, req.path)
        
        if (!route) {
            throw new Error(`Route not found: ${req.method} ${req.path}`)
        }

        // Add params to request
        req.params = { ...req.params, ...route.params }

        // Execute middleware chain
        await this.executeMiddleware(req, res, route)
    }

    /**
     * Finds matching route
     * @param method - HTTP method
     * @param path - Request path
     * @returns Route object or null
     * @internal
     */
    private findRoute(method: string, path: string): RouteMatch | null {
        const searchPath = this.normalizePath(path)
        
        // Exact match
        const exactKey = `${method}:${searchPath}`
        if (this.routes.has(exactKey)) {
            const route = this.routes.get(exactKey)
            return { ...route, params: {} }
        }

        // Dynamic route matching
        for (const [key, route] of this.routes) {
            if (!key.startsWith(method + ':')) continue
            
            const routePath = key.split(':')[1]
            const params = this.matchPath(routePath, searchPath)
            
            if (params !== null) {
                return { ...route, params }
            }
        }

        return null
    }

    /**
     * Matches path against route pattern
     * @param routePath - Route pattern with parameters
     * @param requestPath - Actual request path
     * @returns Parameters object or null
     * @internal
     */
    private matchPath(routePath: string, requestPath: string): Record<string, string> | null {
        const routeParts = routePath.split('/')
        const requestParts = requestPath.split('/')
        
        if (routeParts.length !== requestParts.length) return null
        
        const params: Record<string, string> = {}
        
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                const paramName = routeParts[i].slice(1)
                params[paramName] = this.caseSensitive ? requestParts[i] : requestParts[i].toLowerCase()
            } else if (this.caseSensitive) {
                if (routeParts[i] !== requestParts[i]) return null
            } else {
                if (routeParts[i].toLowerCase() !== requestParts[i].toLowerCase()) return null
            }
        }
        
        return params
    }

    /**
     * Executes middleware chain
     * @param req - Request object
     * @param res - Response object
     * @param route - Route object
     * @internal
     */
    private async executeMiddleware(req: any, res: any, route: RouteMatch): Promise<void> {
        // Collect all middleware for this route
        const allMiddleware: Function[] = []
        
        // Add global middleware
        for (const middleware of this.middleware) {
            if (this.matchesPath(middleware.path, req.path)) {
                allMiddleware.push(...middleware.handlers)
            }
        }
        
        // Add route handlers
        allMiddleware.push(...route.handlers)
        
        // Execute middleware chain
        let index = 0
        const next = async (error?: Error) => {
            if (error) {
                // Error handling middleware would go here
                throw error
            }
            
            if (index < allMiddleware.length) {
                const handler = allMiddleware[index++]
                await handler(req, res, next)
            }
        }
        
        await next()
    }

    /**
     * Checks if path matches middleware pattern
     * @param pattern - Middleware pattern
     * @param path - Request path
     * @returns True if matches
     * @internal
     */
    private matchesPath(pattern: string, path: string): boolean {
        if (pattern === '*') return true
        if (pattern === '/*') return true
        
        // Check if path starts with pattern
        if (pattern.endsWith('*')) {
            const base = pattern.slice(0, -1)
            return path.startsWith(base)
        }
        
        return pattern === path
    }

    /**
     * Returns route list for debugging
     * @returns Array of route strings
     */
    public listRoutes(): string[] {
        const routes: string[] = []
        for (const [key] of this.routes) {
            routes.push(key)
        }
        return routes
    }

    /**
     * Group routes with prefix
     * @param prefix - Route prefix
     * @param callback - Callback with router instance
     * @returns Router instance
     */
    public group(prefix: string, callback: (router: MipRouter) => void): this {
        const subRouter = new MipRouter({
            prefix: this.normalizePath(this.prefix + prefix),
            caseSensitive: this.caseSensitive,
            strict: this.strict,
            mergeParams: this.mergeParams
        })
        
        subRouter.parent = this
        if (this.mergeParams) {
            subRouter.parentParams = { ...this.parentParams }
        }
        
        callback(subRouter)
        
        // Merge routes from sub-router
        for (const [key, route] of subRouter.routes) {
            this.routes.set(key, route)
        }
        
        return this
    }
}

/**
 * Route interface
 * @interface Route
 * @internal
 */
interface Route {
    method: string
    path: string
    handlers: Function[]
    params: string[]
}

/**
 * Route match interface
 * @interface RouteMatch
 * @internal
 */
interface RouteMatch {
    method: string
    path: string
    handlers: Function[]
    params: Record<string, string>
}

/**
 * Middleware interface
 * @interface Middleware
 * @internal
 */
interface Middleware {
    path: string
    handlers: Function[]
    isMiddleware: boolean
}

/**
 * Router with automatic parameter validation
 * @class MipRouterValidated
 * @extends MipRouter
 */
class MipRouterValidated extends MipRouter {
    /** Parameter validators */
    private validators: Record<string, (value: string) => boolean>

    constructor(config: {
        prefix?: string
        caseSensitive?: boolean
        strict?: boolean
        mergeParams?: boolean
        validators?: Record<string, (value: string) => boolean>
    } = {}) {
        super(config)
        this.validators = config.validators || {}
    }

    /**
     * Adds parameter validation
     * @param name - Parameter name
     * @param validator - Validation function
     * @returns Router instance
     */
    public validate(name: string, validator: (value: string) => boolean): this {
        this.validators[name] = validator
        return this
    }

    /**
     * Override findRoute with validation
     * @param method - HTTP method
     * @param path - Request path
     * @returns Route match or null
     * @override
     */
    protected findRoute(method: string, path: string): RouteMatch | null {
        const match = super.findRoute(method, path)
        
        if (!match) return null
        
        // Validate parameters
        for (const [name, value] of Object.entries(match.params)) {
            if (this.validators[name] && !this.validators[name](value)) {
                return null
            }
        }
        
        return match
    }
}

// Export the modules
export { MipRouter, MipRouterValidated }
export type { Route, RouteMatch, Middleware }
export default MipRouter