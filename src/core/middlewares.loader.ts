import Loader from "../class/loader";
import path from "path";
import TreeLoader from "./tree.loader";
import Middleware from "../class/middleware";
import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ILoadedModule, IMiddewareHandler, IMiddlewareConstructor, IMiddlewareError, IRouteFile } from "../types/types";
import ModuleLoader from "../class/module.loader";

/**
 * Middleware loader
 */
export default class MiddlewaresLoader extends ModuleLoader<Middleware> {

    /**
     * Middlewares directory
     */
    private middlewares_dir = path.join(this.server.workdir, this.server.isCompact ? "middlewares" : "app");

    /**
     * Tree loader
     */
    private treeLoader = new TreeLoader(this.server);
    
    /**
     * Load middlewares
     * @returns Middlewares loaded
     */
    public async load(): Promise<ILoadedModule<Middleware>[]> {
        // Load tree info
        const tree = await this.treeLoader.load(this.middlewares_dir, "middleware", this.server.mode);

        // Load constructors
        const middlewaresLoaded: ILoadedModule<Middleware>[] = [];
        
        /**
         * Import all files founded
         */
        await Promise.all(
            tree.paths.map(async (middlewareFileItem) => {
                try {
                    // Load module middleware
                    const moduleMiddleware = await import(middlewareFileItem.absolute);

                    // Middleware loaded
                    let middleware: IMiddlewareConstructor | undefined;

                    // Validate middleware valid
                    if(moduleMiddleware.default?.prototype instanceof Middleware) {
                        middleware = moduleMiddleware.default;
                    }
                    else {
                        const handlers: RequestHandler[] = [];
                        const errors: ErrorRequestHandler[] = [];
                        
                        // Validate if an array
                        if(moduleMiddleware.default instanceof Array) {
                            const result = this.analizeArray(middlewareFileItem.filename, moduleMiddleware.default);

                            handlers.push(...result.handler);
                            errors.push(...result.error);
                        }
                        else if(typeof moduleMiddleware.default === "function") {
                            const result = this.analizeArray(middlewareFileItem.filename, [moduleMiddleware.default]);

                            handlers.push(...result.handler);
                            errors.push(...result.error);
                        }

                        if(handlers.length || errors.length) {

                            // Create a anonymous middleware
                            middleware = class extends Middleware {

                                /**
                                 * Request handlers
                                 */
                                public handler: IMiddewareHandler = handlers;
                                
                                /**
                                 * Error request handlers
                                 */
                                public errors: IMiddlewareError = errors;
                                
                            }
                        }
                    }

                    if(middleware) {
                        try {
                            // Set property
                            Object.defineProperty(middleware, "name", {
                                writable: true,
                                value: middlewareFileItem.relative
                            });

                            // Middleware instance
                            const middlewareInstance = new middleware(this.server);

                            if (!("handler" in middlewareInstance) && !("errors" in middlewareInstance)) {
                                // Missing handler or errors
                                middlewaresLoaded.push({
                                    status: "missing-handler-or-error",
                                    route: middlewareFileItem
                                });
                            }
                            else {
                                // Append middleware prepared
                                middlewaresLoaded.push({
                                    status: "loaded",
                                    module: middlewareInstance,
                                    route: middlewareFileItem
                                });
                            }
                            
                        }
                        catch(err) {
                            middlewaresLoaded.push({
                                status: "constructor-error",
                                route: middlewareFileItem,
                                error: err
                            });
                        }
                    }
                    else if (!moduleMiddleware.default || (moduleMiddleware.default instanceof Object && !Object.keys(moduleMiddleware.default).length)) {
                        middlewaresLoaded.push({
                            status: "missing-default-export",
                            route: middlewareFileItem
                        });
                        // console.log(`⚠️  The middleware '${middlewareFileItem.relative}' is missing a default export of a class that extends the base Middleware class from @stexcore/api-engine.`);
                    } else {
                        middlewaresLoaded.push({
                            status: "not-extends-valid-class",
                            route: middlewareFileItem
                        });
                        // console.log(`⚠️  The middleware '${middlewareFileItem.relative}' must either extend the base Middleware class from @stexcore/api-engine or be a RequestHandler function (or an array of them).`);
                    }
                }
                catch(err) {
                    middlewaresLoaded.push({
                        status: "failed-import",
                        route: middlewareFileItem,
                        error: err
                    });
                    // throw new Error(`❌ Failed to load middleware: '${middlewareFileItem.relative}'`);
                }
            })
        );

        return middlewaresLoaded;
    }

    /**
     * Validates and obtains valid request handlers
     * @param name Name middleware
     * @param arr Array info unknow data
     * @returns Requests handlers
     */
    private analizeArray(name: string, arr: unknown[]) {
        const requestHandlers: RequestHandler[] = [];
        const errorRequestHandlers: ErrorRequestHandler[] = [];
        
        // Traverse the array
        for(let x = 0; x < arr.length; x++) {
            const arrItem = arr[x];

            if(typeof arrItem === "function") {
                if(arrItem.length === 3) {
                    // Request handler!
                    requestHandlers.push(arrItem as RequestHandler);
                }
                else if(arrItem.length === 4) {
                    // Error request handler
                    errorRequestHandlers.push(arrItem as ErrorRequestHandler);
                }
                else console.log("⚠️  Invalid middleware:   /" + name + "[" + x + "]");
            }
        }

        return { handler: requestHandlers, error: errorRequestHandlers };
    }
}