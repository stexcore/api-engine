import type { IErrorRequestHandler, IMethod, IRequestHandler, IRouteFile, IServerConfig } from "../types/types";
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
import "colors";
import Middleware from "../class/middleware";
import Pipe from "../class/pipe";
import Schema from "../class/schema";
import Controller from "../class/controller";
import { methods } from "../constants/method.constant";
import { promisify } from "util";
import { Socket } from "net";

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
     * Is Compact mode
     */
    public get isCompact() {
        return this.mode === "compact"
    }

    /**
     * All services 
     */
    public readonly services: { dynamic: boolean, service: Service }[] = [];

    /**
     * Registering constructors services
     */
    private constructors_services: {
        /**
         * Constructor service
         */
        constructor: (new (server: Server) => Service),
        /**
         * Dynamic service
         */
        dynamic: boolean
    }[] = [];

    /**
     * Creating constructors services
     */
    private creating_constructors_services: (new (server: this) => Service)[] = [];

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
        this.running = false;
    }

    /**
     * Register service instance into this server
     * @param service Service Constructor
     * @returns Service instance created or existent
     */
    public registerService(constructorServices: (new (server: Server) => Service)): Service {
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
    protected registerServices(constructorServices: (new (server: Server) => Service)[], dynamic: boolean): Service[] {
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
                if (err instanceof this.CircularError) {
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
    protected createService(constructorService: new (server: this) => Service, dynamic: boolean) {
        // Find existent service
        let serviceItem = this.services.find((s) => s.service instanceof constructorService);

        if (!serviceItem) {
            // Find circular creating
            const index = this.creating_constructors_services.findIndex((ccs) => ccs.prototype instanceof constructorService);

            if (index === -1) {
                // Add creating instance
                this.creating_constructors_services.push(constructorService);
                // append new instance service
                this.services.push(serviceItem = {
                    service: new constructorService(this),
                    dynamic: dynamic
                });
                // Clean creating instance
                this.creating_constructors_services = this.creating_constructors_services.filter((ccs) => (
                    ccs !== constructorService
                ));

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
    public getService<S extends Service>(service: new (server: Server) => S): S {

        // Validate service extended
        if (!(service.prototype instanceof Service)) {
            throw new Error("❌ The service '" + (service?.name || "unknown") + "' does not extend the base Service class from @stexcore/api-engine.");
        }

        // Find instance service
        const serviceItem = this.services.find((s) => s.service instanceof service);

        if (!serviceItem) {
            // Create service
            const constructor = this.constructors_services.find((cs) => cs.constructor === service);

            if (constructor) {
                return this.createService(constructor.constructor, constructor.dynamic).service as S;
            }

            throw new Error("❌ The service '" + service.name + "' is'nt registered! Services should be placed inside the dedicated 'services' folder within your project's resources.");
        }
        return serviceItem.service as S;
    }

    /**
     * Initialize server instance
     */
    public async initialize() {

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
            catch(err) {
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
        if(server.listening) {
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
        let servicesConstructors: (new (server: Server) => Service)[];
        let middlewares: { middleware: Middleware, route: IRouteFile }[];
        let pipes: { pipe: Pipe, route: IRouteFile }[];
        let schemas: { schema: Schema, route: IRouteFile }[];
        let controllers: { controller: Controller, route: IRouteFile }[];

        // Load services
        yield servicesConstructors = await servicesLoader.load()

        // Register services
        yield this.registerServices(servicesConstructors, true);

        // Load middlewares
        yield middlewares = await middlewaresLoader.load();

        // Load pipes
        yield pipes = await pipesLoader.load();

        // Load schemas
        yield schemas = await schemasLoader.load();

        // Load controllers
        yield controllers = await controllersLoader.load();

        // interrupt process if it was aborted
        if (abortSignal.aborted) return;
        // Traverse all pipes
        for (const pipe of pipes) {
            // All requests handler
            const handlers: IRequestHandler[] = [];

            // Validate multiples pipes
            if (pipe.pipe.handler instanceof Array) {
                if (pipe.pipe.handler.length) {
                    for (let x = 0; x < pipe.pipe.handler.length; x++) {
                        const requestHandler = pipe.pipe.handler[x];

                        if (typeof requestHandler === "function") {
                            handlers.push(requestHandler);
                        }
                        else {
                            console.log(`⚠️  The pipe.handler[${x}] on '${pipe.route.flat_segments}' has an invalid type '${typeof requestHandler}'`);
                        }
                    }
                }
                else {
                    console.log(`⚠️  The pipe.handler on '${pipe.route.flat_segments}' is empty!`);
                }
            }
            else if (typeof pipe.pipe.handler === "function") {
                handlers.push(pipe.pipe.handler);
            }
            else if (pipe.pipe.handler) {
                console.log(`⚠️  The pipe.handler on '${pipe.route.flat_segments}' has an invalid type '${typeof pipe.pipe.handler}'`);
            }
            else {
                console.log(`⚠️  The pipe.handler on '${pipe.route.flat_segments}' is empty!`);
            }

            if (handlers.length) {
                // Append request handlers (pipes)
                this.app.use(pipe.route.flat_segments_express, ...handlers.map((handler) => (
                    handler.bind(pipe.pipe)
                )));

                console.log("✅ Pipe loaded:       " + pipe.route.flat_segments.cyan);
            }
        }

        // Traverse all schemas
        for (const schema of schemas) {
            const methods_loaded: IMethod[] = [];

            // Traverse all methods
            for (const method in methods) {

                // Validate field
                if (method in schema.schema) {
                    const schemaItem = schema.schema[method as IMethod]!;

                    if (schemaItem && typeof schemaItem === "object") {
                        if (
                            schemaItem.body && typeof schemaItem.body === "object" ||
                            schemaItem.headers && typeof schemaItem.headers === "object" ||
                            schemaItem.params && typeof schemaItem.params === "object" ||
                            schemaItem.query && typeof schemaItem.query === "object"
                        ) {
                            // Append method loaded
                            methods_loaded.push(method as IMethod);

                            // Access to methods .get, .post, .put, etc...
                            this.app[method.toLowerCase() as Lowercase<IMethod>](
                                schema.route.flat_segments_express,
                                schemaMiddleware(schemaItem)
                            );
                        }
                        else {
                            console.log(`⚠️  The ${method} method schema on '${schema.route.flat_segments}' doesn't has a validation using 'body', 'headers', 'params' or 'query'.`);
                        }
                    }
                    else if (schemaItem) {
                        console.log(`⚠️  The ${method} method schema on '${schema.route.flat_segments}' has an invalid type '${typeof schemaItem}'`);
                    }
                    else {
                        console.log(`⚠️  The ${method} method schema on '${schema.route.flat_segments}' is empty!`);
                    }
                }
            }

            // validate length methods loaded
            if (methods_loaded.length) {
                console.log(
                    "✅ Schema loaded:     " + schema.route.flat_segments.cyan,
                    methods_loaded.map((m) => (
                        methods[m]
                    )).join(",")
                );
            }
        }

        // Traverse all middlewares
        for (const middleware of middlewares) {
            // All requests handler
            const handlers: IRequestHandler[] = [];

            // Validate multiples middlewares
            if (middleware.middleware.handler instanceof Array) {
                if (middleware.middleware.handler.length) {
                    for (let x = 0; x < middleware.middleware.handler.length; x++) {
                        const requestHandler = middleware.middleware.handler[x];

                        if (typeof requestHandler === "function") {
                            handlers.push(requestHandler);
                        }
                        else {
                            console.log(`⚠️  The middleware.handler[${x}] on '${middleware.route.flat_segments}' has an invalid type '${typeof requestHandler}'`);
                        }
                    }
                }
                else {
                    console.log(`⚠️  The middleware.handler on '${middleware.route.flat_segments}' is empty!`);
                }
            }
            else if (typeof middleware.middleware.handler === "function") {
                handlers.push(middleware.middleware.handler);
            }
            else if (middleware.middleware.handler) {
                console.log(`⚠️  The middleware.handler on '${middleware.route.flat_segments}' has an invalid type '${typeof middleware.middleware.handler}'`);
            }
            else if (
                !(middleware.middleware.errors instanceof Array) &&
                !("errors" in middleware.middleware)
            ) {
                console.log(`⚠️  The middleware.handler on '${middleware.route.flat_segments}' is empty!`);
            }

            if (handlers.length) {
                // Append request handlers (middlewares)
                this.app.use(middleware.route.flat_segments_express, ...handlers.map((handler) => (
                    handler.bind(middleware.middleware)
                )));

                console.log("✅ Middleware loaded: " + middleware.route.flat_segments.cyan);
            }
        }

        // Traverse all controllers
        for (const controller of controllers) {
            const methods_loaded: IMethod[] = [];

            // Traverse all methods
            for (const method in methods) {

                // Get method function
                const controllerMethod = controller.controller[method as IMethod];

                // Validate method into controller
                if (typeof controllerMethod === "function") {
                    // Append method loaded
                    methods_loaded.push(method as IMethod);

                    // Append request handler
                    this.app.use(
                        controller.route.flat_segments_express,
                        controllerMethod!.bind(controller.controller)
                    );
                }
                else if (controllerMethod) {
                    console.log(`⚠️  The ${method} method on '${controller.route.flat_segments}' has an invalid type '${typeof controllerMethod}'`);
                }
                else if (method in controller.controller) {
                    console.log(`⚠️  The ${method} method on '${controller.route.flat_segments}' is empty`);
                }
            }

            if (methods_loaded) {
                console.log(
                    "✅ Controller loaded: " + controller.route.flat_segments.cyan,
                    methods_loaded.map((m) => (
                        methods[m]
                    )).join(",")
                );
            }
        }

        // Traverse all middlewares to append errors requests handlers
        for (const middleware of middlewares) {
            // All requests handler
            const handlers: IErrorRequestHandler[] = [];

            // Validate multiples middlewares
            if (middleware.middleware.errors instanceof Array) {
                if (middleware.middleware.errors.length) {
                    for (let x = 0; x < middleware.middleware.errors.length; x++) {
                        const requestHandler = middleware.middleware.errors[x];

                        if (typeof requestHandler === "function") {
                            handlers.push(requestHandler);
                        }
                        else {
                            console.log(`⚠️  The middleware.errors[${x}] on '${middleware.route.flat_segments}' has an invalid type '${typeof requestHandler}'`);
                        }
                    }
                }
                else {
                    console.log(`⚠️  The middleware.errors on '${middleware.route.flat_segments}' is empty!`);
                }
            }
            else if (typeof middleware.middleware.errors === "function") {
                handlers.push(middleware.middleware.errors);
            }
            else if (middleware.middleware.errors) {
                console.log(`⚠️  The middleware.errors on '${middleware.route.flat_segments}' has an invalid type '${typeof middleware.middleware.errors}'`);
            }

            if (handlers.length) {
                // Append request handlers (middlewares)
                this.app.use(middleware.route.flat_segments_express, ...handlers.map((handler) => (
                    handler.bind(middleware.middleware)
                )));

                console.log("✅ CatchError loaded: " + middleware.route.flat_segments.cyan);
            }
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
            if(!this.running) {
                try {
                    socket.destroy(
                        new Error("The server is'nt running!")
                    );
                }
                catch(err) {
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