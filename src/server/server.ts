import type { IServerConfig } from "../types/types";
import express, { ErrorRequestHandler, IRoute, RequestHandler } from "express";
import Service from "../class/service";
import http from "http";
import ServicesLoader from "../core/services.loader";
import MiddlewaresLoader from "../core/middlewares.loader";
import SchemasLoader from "../core/schemas.loader";
import ControllersLoader from "../core/controllers.loader";
import schemaMiddleware from "../middlewares/schema.middleware";
import "colors";
import catchHttpErrorMiddleware from "../middlewares/catchHttpError.middleware";
import catchGlobalErrorMiddleware from "../middlewares/catchGlobalError.middleware";
import PipesLoader from "../core/pipe.loader";

type IMethodRequest = 
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "HEAD"
    | "OPTIONS";

/**
 * Server instance
 */
export default class Server {

    /**
     * Circular error
     */
    private readonly CircularError = class extends Error { };

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
    protected readonly port: number;

    /**
     * Workdir to work
     */
    public readonly workdir: string

    /**
     * All services 
     */
    public readonly services: Service[] = [];

    /**
     * Registering constructors services
     */
    private constructors_services: (new (server: this) => Service)[] = [];

    /**
     * Creating constructors services
     */
    private creating_constructors_services: (new (server: this) => Service)[] = [];
    
    /**
     * Initialize server instance
     */
    constructor(config: IServerConfig) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = config.port;
        this.workdir = config.workdir;
    }

    /**
     * Register service instance into this server
     * @param service Service Constructor
     * @returns Service instance created or existent
     */
    public registerServices(constructorServices: (new (server: Server) => Service)[]): Service[] {
        // Services registered
        const services: Service[] = [];
        // Set registering services
        this.constructors_services = constructorServices;
        
        // Traverse constructors services
        for(const constructorServiceItem of constructorServices) {
            try {
                // Create service
                const serviceItem = this.createService(constructorServiceItem);
                // Append created service
                services.push(serviceItem);
            }
            catch(err) {
                if(err instanceof this.CircularError) {
                    console.log(err);
                }
                else {
                    console.log(err);
                    console.log("❌ Failed to load service:    /" + constructorServiceItem.name);
                }
            }
        }

        // Clean registering constructors
        this.constructors_services = [];

        // Return registered services
        return services;
    }

    /**
     * Create a instance service
     * @param constructorService Constructor service
     * @returns Service instance
     */
    private createService(constructorService: new (server: this) => Service) {
        // Find existent service
        let serviceItem = this.services.find((s) => s instanceof constructorService);

        if(!serviceItem) {
            // Find circular creating
            const index = this.creating_constructors_services.findIndex((ccs) => ccs.prototype instanceof constructorService);
            
            if(index === -1) {
                // Add creating instance
                this.creating_constructors_services.push(constructorService);
                // append new instance service
                this.services.push(serviceItem = new constructorService(this));
                // Clean creating instance
                this.creating_constructors_services = this.creating_constructors_services.filter((ccs) => (
                    ccs !== constructorService
                ));

                console.log("✅ Service loaded:    " + constructorService.name.yellow);
            }
            else {
                // Get circular error
                const constructorBase = this.creating_constructors_services[index];
                const constructorConflict = this.creating_constructors_services[this.creating_constructors_services.length - 2] || constructorBase;

                // Throw circular error
                throw new this.CircularError(`❌ Circular dependency detected: '${constructorBase.name}' depends on '${constructorConflict.name}', creating an infinite loop.`)
            }
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
        
        if(!serviceItem) {
            const constructor = this.constructors_services.find((cs) => cs === service);

            if(constructor) {
                return this.createService(constructor) as S;
            }
            throw new Error("Service not found!");
        }
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

                const servicesLoader = new ServicesLoader(this);
                const pipesLoader = new PipesLoader(this);
                const schemasLoader = new SchemasLoader(this);
                const middlewaresLoader = new MiddlewaresLoader(this);
                const controllersLoader = new ControllersLoader(this);

                servicesLoader.load()
                    .then((servicesConstructors) => {
                        this.registerServices(servicesConstructors);

                        return middlewaresLoader.load();
                    })
                    .then((middlewares) => {
                        return pipesLoader.load().then((pipes) => (
                            { middlewares, pipes }
                        ))
                    })
                    .then((info) => {
                        return schemasLoader.load().then((schemas) => (
                            { ...info, schemas }
                        ));
                    })
                    .then((info) => {                        
                        return controllersLoader.load().then((controllers) => (
                            { ...info, controllers }
                        ));
                    })
                    .then(({ pipes, schemas, middlewares, controllers }) => {

                        // All methods
                        const methods: {
                            [key in IMethodRequest]: string
                        } = {
                            "GET": "GET".green,
                            "POST": "POST".yellow,
                            "PUT": "PUT".blue,
                            "DELETE": "DELETE".red,
                            "PATCH": "PATCH".gray,
                            "HEAD": "HEAD".green,
                            "OPTIONS": "OPTIONS".magenta,
                         } as const;

                        // Traverse all pipes
                        pipes.forEach((pipe) => {

                            // All requests handler
                            const handlers: RequestHandler[] = [];

                            // Validate multiples pipes
                            if(pipe.pipe.handler instanceof Array) {
                                handlers.push(...pipe.pipe.handler);
                            }
                            else if(pipe.pipe.handler) {
                                handlers.push(pipe.pipe.handler);
                            }

                            if(handlers.length) {
                                // Append request handlers (pipes)
                                this.app.use(pipe.route.flat_segments_express, ...handlers.map((handler) => (
                                    handler.bind(pipe.pipe)
                                )));

                                console.log("✅ Pipe loaded:       " + pipe.route.flat_segments.cyan);
                            }
                        });

                        // Traverse all schemas
                        schemas.forEach((schema) => {

                            const methods_loaded: IMethodRequest[] = [];

                            // Traverse all methods
                            for(const method in methods) {

                                // Validate field
                                if(method in schema.schema) {
                                    // Append method loaded
                                    methods_loaded.push(method as IMethodRequest);

                                    // Access to methods .get, .post, .put, etc...
                                    this.app[method.toLowerCase() as Lowercase<IMethodRequest>](
                                        schema.route.flat_segments_express,
                                        schemaMiddleware(schema.schema[method as IMethodRequest]!)
                                    );
                                }
                            }

                            // validate length methods loaded
                            if(methods_loaded.length) {
                                console.log(
                                    "✅ Schema loaded:     " + schema.route.flat_segments.cyan, 
                                    methods_loaded.map((m) => (
                                        methods[m]
                                    )).join(",")
                                );
                            }

                        });

                        // Traverse all middlewares
                        middlewares.forEach((middleware) => {

                            // All requests handler
                            const handlers: RequestHandler[] = [];

                            // Validate multiples middlewares
                            if(middleware.middleware.handler instanceof Array) {
                                handlers.push(...middleware.middleware.handler);
                            }
                            else if(middleware.middleware.handler) {
                                handlers.push(middleware.middleware.handler);
                            }

                            if(handlers.length) {
                                // Append request handlers (middlewares)
                                this.app.use(middleware.route.flat_segments_express, ...handlers.map((handler) => (
                                    handler.bind(middleware.middleware)
                                )));

                                console.log("✅ Middleware loaded: " + middleware.route.flat_segments.cyan);
                            }
                        });

                        // Traverse all controllers
                        controllers.forEach((controller) => {

                            const methods_loaded: IMethodRequest[] = [];
                            
                            // Traverse all methods
                            for(const method in methods) {

                                // Validate method into controller
                                if(method in controller.controller) {
                                    // Append method loaded
                                    methods_loaded.push(method as IMethodRequest);

                                    // Append request handler
                                    this.app.use(
                                        controller.route.flat_segments_express,
                                        controller.controller[method as IMethodRequest]!.bind(controller.controller)
                                    );
                                }
                            }
                            
                            if(methods_loaded) {
                                console.log(
                                    "✅ Controller loaded: " + controller.route.flat_segments.cyan, 
                                    methods_loaded.map((m) => (
                                        methods[m]
                                    )).join(",")
                                );
                            }

                        });

                        // Traverse all middlewares to append errors requests handlers
                        middlewares.forEach((middleware) => {

                            // All requests handler
                            const handlers: ErrorRequestHandler[] = [];

                            // Validate multiples middlewares
                            if(middleware.middleware.errors instanceof Array) {
                                handlers.push(...middleware.middleware.errors);
                            }
                            else if(middleware.middleware.errors) {
                                handlers.push(middleware.middleware.errors);
                            }

                            if(handlers.length) {
                                // Append request handlers (middlewares)
                                this.app.use(middleware.route.flat_segments_express, ...handlers.map((handler) => (
                                    handler.bind(middleware.middleware)
                                )));

                                console.log("✅ CatchError loaded: " + middleware.route.flat_segments.cyan);
                            }
                        });

                        // Append default middlewares
                        this.app.use(catchHttpErrorMiddleware);
                        this.app.use(catchGlobalErrorMiddleware);

                        // Apply start server
                        startServer();
                    })
                    .catch(reject)
                
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

}