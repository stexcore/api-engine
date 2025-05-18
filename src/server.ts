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
    public readonly workdir: string

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
            // Load all middlewares
            // Append handler
            this.appendHandler();
            // Load all schemas
            // Load all controllers
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

                                const schemaItem = schema[method];

                                if(schemaItem) {
                                    requestHandlersEnque.unshift(schemaMiddleware(schemaItem));
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