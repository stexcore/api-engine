import type { ILoadedModule, IMethod, IServerConfig, IServiceConstructor } from "../types/types";
import Service from "../class/service";
import express from "express";
import http from "http";
import ServicesLoader from "../core/services.loader";
import MiddlewaresLoader from "../core/middlewares.loader";
import SchemasLoader from "../core/schemas.loader";
import ControllersLoader from "../core/controllers.loader";
import schemaMiddleware from "../middlewares/schema.middleware";
import catchHttpErrorMiddleware from "../middlewares/catchHttpError.middleware";
import catchGlobalErrorMiddleware from "../middlewares/catchGlobalError.middleware";
import PipesLoader from "../core/pipe.loader";
import Middleware from "../class/middleware";
import Pipe from "../class/pipe";
import Schema from "../class/schema";
import Controller from "../class/controller";
import { methods } from "../constants/method.constant";
import { promisify } from "util";
import { Socket } from "net";
import logger from "../utils/logger";
import { RegisterCreatingServiceSymbol, UnregisterCreatingServiceSymbol } from "../symbols/server.symbols";
import "colors";

/**
 * Server instance
 */
export default class Server {

    /**
     * Circular error
     */
    protected readonly CircularError = class extends Error { };

    /**
     * Express application
     */
    protected app: express.Application;

    /**
     * Http server
     */
    public server: http.Server;

    /**
     * 
     */
    protected sockets: Set<Socket>;

    /**
     * Server Port
     */
    protected readonly port: number;

    /**
     * Workdir to work
     */
    public readonly workdir: string;

    /**
     * Server running
     */
    public running: boolean;

    /**
     * Load mode
     */
    public readonly mode: "compact" | "tree";

    /**
     * Prevent circular service
     */
    public readonly allow_circular_service_deps: boolean;

    /**
     * Is Compact mode
     */
    public get isCompact() {
        return this.mode === "compact"
    }

    /**
     * All services 
     */
    protected readonly services: { dynamic: boolean, service: Service }[] = [];

    /**
     * Registering constructors services
     */
    private constructors_services: {
        /**
         * Constructor service
         */
        constructor: IServiceConstructor,
        /**
         * Dynamic service
         */
        dynamic: boolean
    }[] = [];

    /**
     * Creating constructors services
     */
    private creating_constructors_services: {
        constructor: IServiceConstructor,
        service: Service
    }[] = [];

    /**
     * All abort controllers to abort initializing server
     */
    private abort_controllers_initializing_server: AbortController[] = [];

    /**
     * Initialize server instance
     */
    constructor(config: IServerConfig) {

        // Init Server config
        const { app, server } = this.initServeConfig();

        this.sockets = new Set();
        this.app = app;
        this.server = server;
        this.port = config.port;
        this.workdir = config.workdir;
        this.mode = config.mode || "compact";
        this.allow_circular_service_deps = config.allowCircularServiceDeps ?? false;
        this.running = false;
    }

    /**
     * Register service instance into this server
     * @param service Service Constructor
     * @returns Service instance created or existent
     */
    public registerService(constructorServices: IServiceConstructor): Service {
        // Services loaded
        const services = this.registerServices([constructorServices], false);

        // Return service registered
        return services[0];
    }

    /**
     * Register service instance into this server
     * @param service Service Constructor
     * @returns Service instance created or existent
     */
    protected registerServices(constructorServices: IServiceConstructor[], dynamic: boolean): Service[] {
        // Services registered
        const services: Service[] = [];
        // Set registering services
        this.constructors_services = constructorServices.map((constructor) => ({
            constructor: constructor,
            dynamic: dynamic
        }));

        // Traverse constructors services
        for (const constructorServiceItem of constructorServices) {
            try {
                // Create service
                const serviceItem = this.createService(constructorServiceItem, dynamic).service;
                // Append created service
                services.push(serviceItem);
            }
            catch (err) {
                throw err;
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
    protected createService(constructorService: IServiceConstructor, dynamic: boolean) {
        // Find existent service
        let serviceItem = this.services.find((s) => s.service instanceof constructorService);

        if (!serviceItem) {
            // Find circular creating
            const index = this.creating_constructors_services.findIndex((ccs) => ccs.constructor === constructorService);

            if (index === -1) {
                // append new instance service
                this.services.push(serviceItem = {
                    service: new constructorService(this),
                    dynamic: dynamic
                });

                // Try to init service
                try {
                    // Run anchor onInit
                    if (this.running && serviceItem!.service.onInit) {
                        serviceItem!.service.onInit();
                    }
                }
                catch (err) {
                    console.error(err);
                }

                logger.ok("Service loaded", constructorService.name.cyan);
            }
            else {
                if(this.allow_circular_service_deps) {
                    serviceItem = {
                        dynamic: dynamic,
                        service: this.creating_constructors_services[index].service
                    };
                }
                else {
                    // Get circular error
                    const constructorBase = this.creating_constructors_services[index];
                    const constructorConflict = this.creating_constructors_services[this.creating_constructors_services.length - 1] || constructorBase;
    
                    // Throw circular error
                    throw new this.CircularError(`Circular dependency detected: '${constructorBase.constructor.name}' depends on '${constructorConflict.constructor.name}', creating an infinite loop. Alternatively, you can enable the setting using 'allowCircularServiceDeps', although you should be aware that importing services circularly may cause unexpected behavior.`)
                }
            }
        }

        return serviceItem;
    }

    /**
     * Get service instance from this server instance
     * @param service Service Constructor
     * @returns Service instance
     */
    public getService<S extends Service>(service: IServiceConstructor<S>): S {

        // Validate service extended
        if (!(service.prototype instanceof Service)) {
            throw new Error("The service '" + (service?.name || "unknown") + "' does not extend the base Service class from @stexcore/api-engine.");
        }

        // Find instance service
        const serviceItem = this.services.find((s) => s.service instanceof service);

        if (!serviceItem) {
            // Create service
            const constructor = this.constructors_services.find((cs) => cs.constructor === service);

            if (constructor) {
                return this.createService(constructor.constructor, constructor.dynamic).service as S;
            }

            throw new Error("The service '" + service.name + "' is'nt registered! Services should be placed inside the dedicated 'services' folder within your project's resources.");
        }
        return serviceItem.service as S;
    }

    public [RegisterCreatingServiceSymbol](service: Service) {
        this.creating_constructors_services.push({
            service: service,
            constructor: service.constructor as IServiceConstructor
        });
    }

    public [UnregisterCreatingServiceSymbol](service: Service) {
        this.creating_constructors_services = this.creating_constructors_services.filter((servItem) => (
            servItem.service !== service
        ));
    }

    /**
     * Initialize server instance
     */
    public async initialize() {

        // Time to init load
        const initTime = Date.now();
        
        // Validate if it is running right now
        if (this.running) {
            throw new Error("The server is running right now!");
        }

        this.running = true;

        // Create a abort controller
        const abortController = new AbortController();

        // Append abort signal
        this.abort_controllers_initializing_server.push(abortController);

        try {
            // Load modules
            for await (const _ of this.loadModules(abortController.signal)) {

                // Validate if aborted
                // Since while the modules are loading asynchronously, it is possible that 
                // the user calls server.destroy
                if (abortController.signal.aborted) {
                    throw new Error("Server initialization aborted.");
                }
            }

            // Emit init services
            for (const service of this.services) {
                try {

                    // Validate if aborted...
                    // A very strange but possible case is that the user calls server.destroy within an onInit... 
                    // it's better to be safe than sorry haha
                    if (abortController.signal.aborted) {
                        throw new Error("Server initialization aborted.");
                    }

                    // Validate if a service not dynamic (a service registered by external)
                    if (!service.dynamic && service.service.onInit) {
                        // Call init anchor
                        service.service.onInit();
                    }
                }
                catch (err) {
                    console.error(err);
                }
            }
        }
        catch (err) {
            // Remove abort controller initializing
            this.abort_controllers_initializing_server =
                this.abort_controllers_initializing_server.filter((controller) => (
                    controller !== abortController
                ));

            // Forward error
            throw err;
        }

        // Remove abort controller initializing
        this.abort_controllers_initializing_server =
            this.abort_controllers_initializing_server.filter((controller) => (
                controller !== abortController
            ));

        // Open port listening...
        this.server.listen(this.port, () => {
            // Log server started
            console.log("\n  Server started on: http://localhost:" + this.port + "\n");
        });

        return Date.now() - initTime;
    }

    /**
     * Stop server listening
     */
    public async destroy() {

        // Validate if it is running right now!
        if (!this.running) {
            throw new Error("The server isn't running right now!");
        }

        // Update running state
        this.running = false;

        // Traverse all services to emit onDestroy anchor
        this.services.forEach((s) => {
            try {
                // Run anchort onDestroy
                if (s.service.onDestroy) {
                    s.service.onDestroy();
                }
            }
            catch (err) {
                console.error(err);
            }
        });

        // Save server into temporal variable
        const server = this.server;

        // Traverse all sockets
        this.sockets.forEach((socket) => {
            try {
                socket.destroy(new Error("Server stoped!"));
            }
            catch (err) {
                console.error(err);
            }
        });

        // Traverse all controllers
        this.abort_controllers_initializing_server.forEach((controller) => {
            controller.abort(new Error("Server destroyed!"));
        })

        // Reset server config
        this.initServeConfig();

        // Validate if the server is listening incomming requests
        if (server.listening) {
            // Close server
            await promisify(server.close.bind(server))();
        }
    }

    /**
     * Load all modules, controllers, middlewares, pipes, services, etc...
     */
    private async *loadModules(abortSignal: AbortSignal) {
        const servicesLoader = new ServicesLoader(this);
        const pipesLoader = new PipesLoader(this);
        const schemasLoader = new SchemasLoader(this);
        const middlewaresLoader = new MiddlewaresLoader(this);
        const controllersLoader = new ControllersLoader(this);

        // Declare vars
        let services: ILoadedModule<IServiceConstructor>[];
        let middlewares: ILoadedModule<Middleware>[];
        let pipes: ILoadedModule<Pipe>[];
        let schemas: ILoadedModule<Schema>[];
        let controllers: ILoadedModule<Controller>[];

        const segments: {
            [path: string]: {
                controller?: ILoadedModule<Controller>,
                middleware?: ILoadedModule<Middleware>,
                pipe?: ILoadedModule<Pipe>,
                schema?: ILoadedModule<Schema>
            }
        } = {};
        
        const getSegmentInfo = (segment: string) => {
            if(!segments[segment]) segments[segment] = {};

            return segments[segment];
        }

        /*******************************************************
         * Load services section
         ******************************************************/
        yield services = await servicesLoader.load()

        // Initialize service constructors variable
        const servicesConstructors: IServiceConstructor[] = [];

        // Traverse all services loaded
        for (const service of services) {

            // switch case
            switch (service.status) {
                case "loaded":
                    servicesConstructors.push(service.module);
                    break;

                case "failed-import":
                    logger.error("Faile to import the service", service.route.relative.cyan, "Reason:\n", service.error);
                    break;

                case "missing-default-export":
                    logger.error("Missing the default export on the service", service.route.relative.cyan);
                    break;

                case "not-extends-valid-class":
                    logger.error("The export does'nt extends the Service class on the export", service.route.relative.cyan);
                    break;

                default:
                    logger.warm("Unhandle error of type '" + service.status.magenta + "'", service.route.relative.cyan);
            }
        }

        // Register services
        yield this.registerServices(servicesConstructors, true);

        // Load pipes
        yield pipes = await pipesLoader.load();

        // Traverse all pipes
        for (const pipe of pipes) {
            switch (pipe.status) {
                case "loaded":
                    const handlers = pipe.module.handler instanceof Array ? pipe.module.handler : [pipe.module.handler];

                    // Get segment info
                    const segmentInfo = getSegmentInfo(pipe.route.flat_segments_express);

                    // Append pipe loaded
                    segmentInfo.pipe = pipe;
                    
                    // Append request handlers (pipes)
                    this.app.use(pipe.route.flat_segments_express, ...handlers.map((handler) => (
                        handler.bind(pipe.module)
                    )));
                    break;

                case "too-many-parameters-request-handler":
                    logger.error(`The pipe.${pipe.keyname}${pipe.array ? `[${pipe.array.index}]` : ""} function has more than three parameters, suggesting that it is not a valid request handler.`, pipe.route.relative.cyan)
                    break;

                case "invalid-function-request-handler":
                    logger.error(`The pipe.${pipe.keyname}${pipe.array ? `[${pipe.array.index}]` : ""} function is not valid`, pipe.route.relative.cyan);
                    break;

                case "array-empty-request-handler":
                    logger.error(`The pipe.${pipe.keyname} array is empty`, pipe.route.relative.cyan);
                    break;

                case "constructor-error":
                    logger.error("Error thrown while constructing the pipe instance", pipe.route.relative.cyan, "Reason:\n", pipe.error);
                    break;

                case "failed-import":
                    logger.error("Faile to import the pipe", pipe.route.relative.cyan, "Reason:\n", pipe.error);
                    break;

                case "missing-default-export":
                    logger.error("Missing the default export on the pipe", pipe.route.relative.cyan);
                    break;

                case "not-extends-valid-class":
                    logger.error("The export does'nt extends the Pipe class on the export", pipe.route.relative.cyan);
                    break;

                default:
                    logger.warm("Unhandle error of type '" + pipe.status.magenta + "'", pipe.route.relative.cyan);
            }
        }

        // Load schemas
        yield schemas = await schemasLoader.load();

        // Traverse all schemas
        for (const schema of schemas) {

            switch (schema.status) {
                case "loaded":
                    const methods_loaded: IMethod[] = [];
                    
                    // Traverse all methods
                    for (const method in methods) {

                        // Validate field
                        if (method in schema.module) {
                            const schemaItem = schema.module[method as IMethod]!;

                            // Append method loaded
                            methods_loaded.push(method as IMethod);

                            // Access to methods .get, .post, .put, etc...
                            this.app[method.toLowerCase() as Lowercase<IMethod>](
                                schema.route.flat_segments_express,
                                schemaMiddleware(schemaItem)
                            );
                        }
                    }

                    // Get segment info
                    const segmentInfo = getSegmentInfo(schema.route.flat_segments_express);

                    // Append schema loaded
                    segmentInfo.schema = schema;
                    break;

                case "invalid-type-schema-request":
                    logger.error(`The ${schema.method} method schema on '${schema.route.flat_segments}' has an invalid type '${schema.type_received}'`, schema.route.relative.cyan);
                    break;

                case "missing-joi-schemas":
                    logger.error(`The ${schema.method} method schema on '${schema.route.flat_segments}' doesn't has a validation using 'body', 'headers', 'params' or 'query'.`, schema.route.relative.cyan);
                    break;

                case "missing-some-member-declaration":
                    logger.error("No HTTP methods (GET, POST, etc.) defined in schema", schema.route.relative.cyan);
                    break;

                case "constructor-error":
                    logger.error("Error thrown while constructing the schema instance", schema.route.relative.cyan, "Reason:\n", schema.error);
                    break;

                case "failed-import":
                    logger.error("Faile to import the schema", schema.route.relative.cyan, "Reason:\n", schema.error);
                    break;

                case "missing-default-export":
                    logger.error("Missing the default export on the schema", schema.route.relative.cyan);
                    break;

                case "not-extends-valid-class":
                    logger.error("The export does'nt extends the Schema class on the export", schema.route.relative.cyan);
                    break;

                default:
                    logger.warm("Unhandle error of type '" + schema.status.magenta + "'", schema.route.relative.cyan);
            }
        }

        // Load middlewares
        yield middlewares = await middlewaresLoader.load();
        
        // Traverse all middlewares
        for(const middleware of middlewares) {
            switch (middleware.status) {
                case "loaded":
                    const handlers = middleware.module.handler instanceof Array ? middleware.module.handler : middleware.module.handler ? [middleware.module.handler] : [];
                    
                    if(handlers.length) {
                        // Get segment info
                        const segmentInfo = getSegmentInfo(middleware.route.flat_segments_express);
                        // Append middleware loaded
                        segmentInfo.middleware = middleware;
                        // Append request handlers (middlewares)
                        this.app.use(middleware.route.flat_segments_express, ...handlers.map((handler) => (
                            handler.bind(middleware.module)
                        )));
                    }
                    break;

                case "missing-some-member-declaration":
                    logger.error("Middleware must define at least a 'handler' or an 'error' function", middleware.route.relative.cyan);
                    break;

                case "too-many-parameters-request-handler":
                    if(middleware.keyname === "handler") {
                        logger.error(`The middleware.${middleware.keyname}${middleware.array ? `[${middleware.array.index}]` : ""} function has more than three parameters, suggesting that it is not a valid request handler.`, middleware.route.relative.cyan)
                    }
                    else {
                        logger.error(`The middleware.${middleware.keyname}${middleware.array ? `[${middleware.array.index}]` : ""} must accept exactly four parameters to be a valid error handler`, middleware.route.relative.cyan);
                    }
                    break;

                case "invalid-function-request-handler":
                    logger.error(`The middleware.${middleware.keyname}${middleware.array ? `[${middleware.array.index}]` : ""} function is not valid`, middleware.route.relative.cyan);
                    break;

                case "constructor-error":
                    logger.error("Error thrown while constructing the middleware instance", middleware.route.relative.cyan, "Reason:\n", middleware.error);
                    break;

                case "failed-import":
                    logger.error("Faile to import the middleware", middleware.route.relative.cyan, "Reason:\n", middleware.error);
                    break;

                case "missing-default-export":
                    logger.error("Missing the default export on the middleware", middleware.route.relative.cyan);

                case "not-extends-valid-class":
                    logger.error("The export does'nt extends the Middleware class on the export", middleware.route.relative.cyan);

                default:
                    logger.warm("Unhandle error of type '" + middleware.status.magenta + "'", middleware.route.relative.cyan);
            }
        }

        // Load controllers
        yield controllers = await controllersLoader.load();

        // Traverse all controllers
        for(const controller of controllers) {
            switch (controller.status) {
                case "loaded":
                    for(const method in methods) {
                        const controllerMethod = controller.module[method as IMethod];
                        
                        if(controllerMethod) {
                            // Append request handlers (controllers)
                            this.app[method.toLowerCase() as Lowercase<IMethod>](controller.route.flat_segments_express, controllerMethod.bind(controller.module));
                        }
                    }

                    // Get segment info
                    const segmentInfo = getSegmentInfo(controller.route.flat_segments_express);

                    // Append controller loaded
                    segmentInfo.controller = controller;
                    break;

                case "too-many-parameters-request-handler":
                    logger.error(`The controller.${controller.keyname}${controller.array ? `[${controller.array.index}]` : ""} function has more than three parameters, suggesting that it is not a valid request handler.`, controller.route.relative.cyan)
                    break;

                case "invalid-function-request-handler":
                    logger.error(`The controller.${controller.keyname}${controller.array ? `[${controller.array.index}]` : ""} function is not valid`, controller.route.relative.cyan);
                    break;

                case "missing-some-member-declaration":
                    logger.error("No HTTP methods (GET, POST, etc.) defined in controller", controller.route.relative.cyan);
                    break;

                case "constructor-error":
                    logger.error("Error thrown while constructing the controller instance", controller.route.relative.cyan, "Reason:\n", controller.error);
                    break;

                case "failed-import":
                    logger.error("Faile to import the controller", controller.route.relative.cyan, "Reason:\n", controller.error);
                    break;

                case "missing-default-export":
                    logger.error("Missing the default export on the controller", controller.route.relative.cyan);
                    break;

                case "not-extends-valid-class":
                    logger.error("The export does'nt extends the Controller class on the export", controller.route.relative.cyan);
                    break;

                default:
                    logger.warm("Unhandle error of type '" + controller.status.magenta + "'", controller.route.relative.cyan);
            }
        }
        
        // // interrupt process if it was aborted
        // if (abortSignal.aborted) return;

        // // Traverse all middlewares
        // for (const middleware of middlewares) {
        //     // All requests handler
        //     const handlers: IRequestHandler[] = [];

        //     // Validate multiples middlewares
        //     if (middleware.middleware.handler instanceof Array) {
        //         if (middleware.middleware.handler.length) {
        //             for (let x = 0; x < middleware.middleware.handler.length; x++) {
        //                 const requestHandler = middleware.middleware.handler[x];

        //                 if (typeof requestHandler === "function") {
        //                     handlers.push(requestHandler);
        //                 }
        //                 else {
        //                     console.log(`⚠️  The middleware.handler[${x}] on '${middleware.route.flat_segments}' has an invalid type '${typeof requestHandler}'`);
        //                 }
        //             }
        //         }
        //         else {
        //             console.log(`⚠️  The middleware.handler on '${middleware.route.flat_segments}' is empty!`);
        //         }
        //     }
        //     else if (typeof middleware.middleware.handler === "function") {
        //         handlers.push(middleware.middleware.handler);
        //     }
        //     else if (middleware.middleware.handler) {
        //         console.log(`⚠️  The middleware.handler on '${middleware.route.flat_segments}' has an invalid type '${typeof middleware.middleware.handler}'`);
        //     }
        //     else if (
        //         !(middleware.middleware.errors instanceof Array) &&
        //         !("errors" in middleware.middleware)
        //     ) {
        //         console.log(`⚠️  The middleware.handler on '${middleware.route.flat_segments}' is empty!`);
        //     }

        //     if (handlers.length) {
        //         // Append request handlers (middlewares)
        //         this.app.use(middleware.route.flat_segments_express, ...handlers.map((handler) => (
        //             handler.bind(middleware.middleware)
        //         )));

        //         console.log("✅ Middleware loaded: " + middleware.route.flat_segments.cyan);
        //     }
        // }

        // // Traverse all controllers
        // for (const controller of controllers) {
        //     const methods_loaded: IMethod[] = [];

        //     // Traverse all methods
        //     for (const method in methods) {

        //         // Get method function
        //         const controllerMethod = controller.controller[method as IMethod];

        //         // Validate method into controller
        //         if (typeof controllerMethod === "function") {
        //             // Append method loaded
        //             methods_loaded.push(method as IMethod);

        //             // Append request handler
        //             this.app.use(
        //                 controller.route.flat_segments_express,
        //                 controllerMethod!.bind(controller.controller)
        //             );
        //         }
        //         else if (controllerMethod) {
        //             console.log(`⚠️  The ${method} method on '${controller.route.flat_segments}' has an invalid type '${typeof controllerMethod}'`);
        //         }
        //         else if (method in controller.controller) {
        //             console.log(`⚠️  The ${method} method on '${controller.route.flat_segments}' is empty`);
        //         }
        //     }

        //     if (methods_loaded) {
        //         console.log(
        //             "✅ Controller loaded: " + controller.route.flat_segments.cyan,
        //             methods_loaded.map((m) => (
        //                 methods[m]
        //             )).join(",")
        //         );
        //     }
        // }

        // // Traverse all middlewares to append errors requests handlers
        // for (const middleware of middlewares) {
        //     // All requests handler
        //     const handlers: IErrorRequestHandler[] = [];

        //     // Validate multiples middlewares
        //     if (middleware.middleware.errors instanceof Array) {
        //         if (middleware.middleware.errors.length) {
        //             for (let x = 0; x < middleware.middleware.errors.length; x++) {
        //                 const requestHandler = middleware.middleware.errors[x];

        //                 if (typeof requestHandler === "function") {
        //                     handlers.push(requestHandler);
        //                 }
        //                 else {
        //                     console.log(`⚠️  The middleware.errors[${x}] on '${middleware.route.flat_segments}' has an invalid type '${typeof requestHandler}'`);
        //                 }
        //             }
        //         }
        //         else {
        //             console.log(`⚠️  The middleware.errors on '${middleware.route.flat_segments}' is empty!`);
        //         }
        //     }
        //     else if (typeof middleware.middleware.errors === "function") {
        //         handlers.push(middleware.middleware.errors);
        //     }
        //     else if (middleware.middleware.errors) {
        //         console.log(`⚠️  The middleware.errors on '${middleware.route.flat_segments}' has an invalid type '${typeof middleware.middleware.errors}'`);
        //     }

        //     if (handlers.length) {
        //         // Append request handlers (middlewares)
        //         this.app.use(middleware.route.flat_segments_express, ...handlers.map((handler) => (
        //             handler.bind(middleware.middleware)
        //         )));

        //         console.log("✅ CatchError loaded: " + middleware.route.flat_segments.cyan);
        //     }
        // }

        for(const pathItem in segments) {
            const segmentItem = segments[pathItem];

            const timing = [
                ...(segmentItem.pipe && segmentItem.pipe.status === "loaded" ? [segmentItem.pipe.loadTimeMs] as const : []),
                ...(segmentItem.middleware && segmentItem.middleware.status === "loaded" ? [segmentItem.middleware.loadTimeMs] as const : []),
                ...(segmentItem.controller && segmentItem.controller.status === "loaded" ? [segmentItem.controller.loadTimeMs] as const : []),
                ...(segmentItem.schema && segmentItem.schema.status === "loaded" ? [segmentItem.schema.loadTimeMs] as const : []),
            ];

            logger.loaded(
                pathItem, 
                [
                    ...(segmentItem.pipe ? ["pipe"] as const : []),
                    ...(segmentItem.middleware ? ["middleware"] as const : []),
                    ...(segmentItem.controller ? ["controller"] as const : []),
                    ...(segmentItem.schema ? ["schema"] as const : []),
                ],
                timing.reduce((t, v) => t + v, 0) / timing.length
            );
        }

        // Append default middlewares
        this.app.use(catchHttpErrorMiddleware);
        this.app.use(catchGlobalErrorMiddleware);
    }

    /**
     * Initialize server http and express
     */
    private initServeConfig() {
        // Create express server
        this.app = express();
        // Create http server
        this.server = http.createServer(this.app);
        // Clean sockets
        this.sockets = new Set();

        // Append listenner
        this.server.on("connection", (socket) => {

            // Validate if it is'nt running
            if (!this.running) {
                try {
                    socket.destroy(
                        new Error("The server is'nt running!")
                    );
                }
                catch (err) {
                    console.error(err);
                }
            }

            // Append socket
            this.sockets.add(socket);

            // Delete socket
            socket.on("close", () => {
                this.sockets.delete(socket);
            });
        });

        return {
            app: this.app,
            server: this.server
        };
    }

}