import type { IMethod, ISchema, ISegment, IServerConfig } from "./types/types";
import express, { type Request, type RequestHandler, type Response } from "express";
import Controller from "./class/controller";
import Service from "./class/service";
import path from "path";
import http from "http";
import fs from "fs";
import Schema from "./class/schema";
import schemaMiddleware from "./middlewares/schema.middleware";
import catchHttpErrorMiddleware from "./middlewares/catchHttpError.middleware";

/**
 * Server instance
 */
export default class Server {

    /**
     * Express application
     */
    public readonly app: express.Application;

    /**
     * Http server
     */
    public readonly server: http.Server;

    /**
     * Server Port
     */
    protected port: number;

    /**
     * Workdir to work
     */
    protected workdir: string

    /**
     * All services 
     */
    public readonly services: Service[] = [];

    /**
     * Controllers loaded
     */
    public readonly controllersLoaded: { 
        /**
         * Dynamic
         */
        type: "dynamic" | "static",
        /**
         * Path controller
         */
        path: string,
        /**
         * Segments controller
         */
        segments: ISegment[],
        /**
         * Controller
         */
        controller: Controller
    }[] = []

    /**
     * Schemas loaded
     */
    public readonly schemasLoaded: {
        /**
         * path schema
         */
        path: string,
        /**
         * Schema validator
         */
        schema: ISchema
    }[] = [];

    /**
     * Middleware loaded
     */
    public middlewaresLoaded: {
        /**
         * Path scope middleware
         */
        path: string,
        /**
         * Middleware request handler
         */
        middleware: RequestHandler 
    }[] = [];

    /**
     * Loading modules
     */
    private loading_modules: boolean = true;

    /**
     * Initialize promises
     */
    private initialize_promises: {
        /**
         * Resolve promise
         */
        resolve: () => void,
        /**
         * Reject promise
         * @param err Err
         */
        reject: (err: unknown) => void
    }[] = [];
    
    /**
     * Initialize server instance
     */
    constructor(config: IServerConfig) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = config.port;
        this.workdir = config.workdir;

        // Load services and controllers
        this.loadServer();
    }

    /**
     * Register service instance into this server
     * @param service Service Constructor
     * @returns Service instance created or existent
     */
    public registerService(service: new (server: this) => Service) {
        let serviceItem = this.services.find((s) => s instanceof service);

        if(!serviceItem) {
            this.services.push(serviceItem = new service(this));
        }

        return serviceItem;
    }

    /**
     * Get service instance from this server instance
     * @param service Service Constructor
     * @returns Service instance
     */
    public getService<S extends Service>(service: new (server: this) => S): S {
        const serviceItem = this.services.find((s) => s instanceof service);
        
        if(!serviceItem) throw new Error("Service not found!");
        return serviceItem as S;
    }

    /**
     * Initialize server instance
     */
    public initialize() {
        return new Promise<void>((resolve, reject) => {
            try {
                // Apply start server
                const startServer = () => {
                    try {
                        // Open port listening...
                        this.server.listen(this.port, () => {
                            // Log server started
                            console.log("\n  Server started on: http://localhost:" + this.port + "\n");
                            // Resolve current promise
                            resolve();
                        });
                    }
                    catch(err) {
                        reject(err);
                    }
                };
                
                // Validate loading modules
                if(this.loading_modules) {
                    // Append promises to enque
                    this.initialize_promises.push({ 
                        resolve: startServer, 
                        reject
                    });
                }
                else {
                    // Apply start server
                    startServer();
                }
            }
            catch(err) {
                reject(err);
            }
        });

    }

    /**
     * Stop server listening
     */
    public destroy() {
        return new Promise<void>((resolve, reject) => {
            try {
                // Close listening...
                this.server.close((err) => {
                    if(err) return reject(err);
                    resolve();
                });
            }
            catch(err) {
                reject(err);
            }
        });
    }

    /**
     * Load all modules to server
     */
    private async loadServer() {
        try {
            
            // Append spacing
            console.log("");

            // Load all services
            await this.loadServices();
            // Load all middlewares
            await this.loadMiddlewares();
            // Append handler
            this.appendHandler();
            // Load all schemas
            await this.loadSchemas();
            // Load all controllers
            await this.loadControllers();
        }
        catch(err) {
            console.error(err);
        }
        finally {
            // Toogle loading module
            this.loading_modules = false;

            // Resolve promise initialize
            this.initialize_promises.forEach((promiseItem) => {
                promiseItem.resolve();
            });

            // Remove promises
            this.initialize_promises = [];
    
            // Set catch errors middleware
            this.app.use(catchHttpErrorMiddleware);
            this.app.use(catchHttpErrorMiddleware);
        }
    }

    /**
     * Load services
     */
    private async loadServices() {
        // Read service files
        const dir = path.join(this.workdir, "services");
        const serviceFiles = fs.readdirSync(dir);
        const servicesLoaded: Service[] = [];

        // Earch services
        for(const serviceFileItem of serviceFiles) {
            // Get service name
            const serviceName = serviceFileItem.slice(0, -3);

            // Validate nomenclature
            if(serviceFileItem.endsWith(".service.ts") || serviceFileItem.endsWith(".service.js")) {
                try {
                    // import module
                    const service = await import(path.join(dir, serviceFileItem))
                    // Validate module
                    if(service.default?.prototype instanceof Service) {
    
                        // Register service
                        const serviceInstance = this.registerService(service.default)
                        servicesLoaded.push(serviceInstance);
    
                        // Log service loaded
                        console.log("✅ Service loaded:    /" + serviceName);
                    }
                }
                catch(e) {
                    console.log(e);
                    console.log("❌ Failed to load service:    /" + serviceName);
                }
            }
        }

        return servicesLoaded;
    }

    /**
     * Load middlewares
     * @returns Middlewares loaded
     */
    private async loadMiddlewares(segments: string[]= []) {
        // Workdir
        const dir = path.join(this.workdir, "middlewares", ...segments);
        // Read middlewares files
        const middlewaresFiles = fs.readdirSync(dir);
        // Middlewares loaded
        const middlewaresLoaded: RequestHandler[] = [];

        // Traverse middlewares
        for(const middlewareFileItem of middlewaresFiles) {
            // Get middleware name
            const middlewareName = middlewareFileItem.slice(0, -3);
            // Path middleware
            const pathMiddleware = "/" + segments.join("/");

            // Validate nomenclature declaration
            if(middlewareFileItem.endsWith("middleware.ts") || middlewareFileItem.endsWith("middleware.js")) {
                try {
                    // Import module
                    const moduleItem = await import(path.join(dir, middlewareFileItem));

                    if(moduleItem.default instanceof Function) {

                        // Append middlewares loaded
                        this.middlewaresLoaded.push({
                            path: pathMiddleware,
                            middleware: moduleItem.default
                        });

                        // Append middleware loaded
                        middlewaresLoaded.push(moduleItem.default);

                        // Log middleware loaded
                        console.log("✅ Middleware loaded: " + ([pathMiddleware.replace(/^\//g, ""), middlewareName].join("/")));
                    }
                }
                catch(e) {
                    console.log(e);
                    console.log("❌ Failed to load the middleware: " + ([pathMiddleware, middlewareName].join("/")));
                }
            }
            else {
                // Get middlewares loaded
                const subMiddlewaresLoaded = await this.loadMiddlewares([...segments, middlewareFileItem]);

                // Append middlewares loaded
                middlewaresLoaded.push(...subMiddlewaresLoaded);
            }
        }

        // Middlewares loaded
        return middlewaresLoaded;
    }

    /**
     * Load schemas
     * @returns Schemas loaded
     */
    private async loadSchemas() {
        // Workdir
        const dir = path.join(this.workdir, "schemas");
        // Read schemas files
        const schemasFiles = fs.readdirSync(dir);
        // Schemas loaded
        const schemasLoaded: Schema[] = [];

        // Traverse schemas
        for(const schemaFileItem of schemasFiles) {
            // Get schemas name
            const schemaName = schemaFileItem.slice(0, -3);
            // path schema
            const pathSchema = "/" + schemaName.slice(0, -7).split(".").join("/");

            // Validate nomenclature declaration
            if(schemaFileItem.endsWith("schema.ts") || schemaFileItem.endsWith("schema.js")) {
                try {
                    // Import module
                    const moduleItem = await import(path.join(dir, schemaFileItem));

                    if(moduleItem.default instanceof Schema) {
                        // schema instance
                        const schemaItem = moduleItem.default;

                        // Append schema loaded
                        this.schemasLoaded.push({
                            path: pathSchema,
                            schema: schemaItem
                        });

                        // Append schema loaded
                        schemasLoaded.push(schemaItem);
                        
                        // Log schema loaded!
                        console.log("✅ Schema loaded:     " + pathSchema);
                    }
                }
                catch(e) {
                    console.log(e);
                    console.log("❌ Failed to load the schema     " + pathSchema);
                }
            }
        }

        // schemas loaded
        return schemasLoaded;
    }
    
    /**
     * Load controllers
     * @returns controller loaded
     */
    private async loadControllers() {
        // Read controller files
        const dir = path.join(this.workdir, "controllers");
        // Controller files
        const controllerFiles = fs.readdirSync(dir);
        // COntrollers loaded
        const controllerLoaded: Controller[] = [];

        // load controllers
        for(const controllerFileItem of controllerFiles) {

            // Validate nomenclature file
            if(controllerFileItem.endsWith("controller.ts") || controllerFileItem.endsWith("controller.js")) {
                // remove controller.js/ts nomenclature
                const controllerName = controllerFileItem.slice(0, -3);
                const segmentsFile = controllerName.slice(0, -11).split(".");
                const segments: ISegment[] = [];
    
                // travese array of segments
                segmentsFile.forEach((segmentFileItem) => {
                    // Validate segment dynamic?
                    if(segmentFileItem.startsWith("[") && segmentFileItem.endsWith("]")) {
                        // Append segment dynamic
                        segments.push({ type: "dynamic", param: segmentFileItem.slice(1, -1) });
                    }
                    else {
                        // Append segment static
                        segments.push({ type: "static", segment: segmentFileItem });
                    }
                });

                // path controller
                const pathController = "/" + segments.map(s => s.type === "static" ? s.segment : `[${s.param}]`).join("/");

                try {
                    // Import module
                    const moduleItem = await import(path.join(dir, controllerFileItem));
    
                    // Validate module instance of Controller
                    if(moduleItem.default?.prototype instanceof Controller) {

                        // Create controller instance
                        const controller = new moduleItem.default(this);
                            
                        // Append controller loaded
                        this.controllersLoaded.push({
                            type: segments.some((s) => s.type === "dynamic") ? "dynamic" : "static",
                            path: pathController,
                            segments: segments,
                            controller: controller
                        });

                        // Append controller loaded
                        controllerLoaded.push(controller);

                        // Log controller loaded
                        console.log("✅ Controller loaded: " + pathController);
    
                    }
                }
                catch(e) {
                    console.log(e);
                    console.log("❌ Failed to load the controller: " + pathController);
                }
            }
        }
    }

    /**
     * Append handler requests incomming
     */
    private appendHandler() {
        // Append request handler
        this.app.use((req, res, next) => {
            try {
                // Find controller existent
                let controllerData = this.controllersLoaded.find((c => (
                    c.type === "static" && 
                    c.path === req.path
                )));

                // Validate if not found
                if(!controllerData) {
                    const [_, ...segments] = req.path.replace(/\/+$/, "").split("/");

                    // Find with route dynamic
                    controllerData = this.controllersLoaded.find((c) => (
                        c.segments.length === segments.length &&
                        c.segments.every((s, i) => (
                            s.type === "static" ? (s.segment === segments[i]) : true
                        ))
                    ));

                    if(controllerData) {
                        controllerData.segments.forEach((s, i) => {
                            if(s.type === "dynamic") {
                                req.params[s.param] = segments[i];
                            }
                        })
                    }
                }


                // Get middlewares
                const middlewaresParent = this.middlewaresLoaded.filter(m => req.path.startsWith(m.path));

                // apply middleware parent
                this.applyRequestHandlers(req, res, middlewaresParent.map(m => m.middleware), (err) => {
                    // Forward error
                    if(err) return next(err);

                    // Is found?
                    if(controllerData) {
                        // Get method request incomming
                        const method = req.method.toUpperCase() as IMethod;
                        // Get request handler
                        const requestHandler: express.RequestHandler | undefined = controllerData.controller[method];
                        // Get schema
                        const schemaInformation = this.schemasLoaded.find((s) => s.path === controllerData.path);

                        // Validate handler avariable
                        if(requestHandler) {
                            // Get middlewares
                            const middlewares = this.middlewaresLoaded
                                .filter(m => controllerData.path.startsWith(m.path))
                                .filter(m => middlewaresParent.every(({middleware}) => middleware !== m.middleware));
                            // Append middlewares
                            const requestHandlersEnque: express.RequestHandler[] = [
                                // Append middlewares loaded
                                ...(middlewares.map(m => m.middleware)),
                                // Append handler request
                                requestHandler
                            ];

                            // Append schema middlewares
                            if(schemaInformation) {
                                // Extract schema
                                const { schema } = schemaInformation;

                                for(const keyname in schema) {
                                    const key = keyname as keyof ISchema;
                                    const schemaItem = schema[key];

                                    if(schemaItem) {
                                        requestHandlersEnque.unshift(schemaMiddleware(schemaItem));
                                    }
                                }
                            }

                            // Apply middlewares
                            this.applyRequestHandlers(req, res, requestHandlersEnque, (err) => {
                                // Forward error
                                if(err) return next(err);
                            });
                        }
                        else {
                            // Forward request incomming
                            next();
                        }
                    }
                    else {
                        next();
                    }
                });
            }
            catch(err) {
                next(err);
            }
        });
    }

    /**
     * Analize middlewares handlers
     * @param req Request incomming
     * @param res Response incomming
     * @param handlers Handler Requests
     * @param callback Callback result
     */
    private applyRequestHandlers(req: Request, res: Response, handlers: RequestHandler[], callback: (err?: unknown) => void) {
        try {
            // Index request handler
            let index = 0;

            // Next request handler
            const nextRequestHandler: express.NextFunction = (err?: unknown) => {
                if(err) {
                    // Send error
                    callback(err);
                }
                else {
                    // Get middleware
                    const middleware = handlers[index++];

                    if(middleware) {
                        middleware(req, res, nextRequestHandler);
                    }
                    else {
                        callback();
                    }
                }
            }

            // Next handler
            nextRequestHandler();
        }
        catch(err) {
            callback(err);
        }
    }
   
}