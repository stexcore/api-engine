import Loader from "../class/loader";
import path from "path";
import TreeLoader from "./tree.loader";
import Middleware, { type IMiddlewareError } from "../class/middleware";
import type { ErrorRequestHandler, RequestHandler } from "express";
import type Server from "../server/server";
import type { IRouteFile } from "../types/types";
import type { IMiddewareHandler } from "../class/pipe";

/**
 * Middleware loader
 */
export default class MiddlewaresLoader extends Loader<{ middleware: Middleware, route: IRouteFile }[]> {

    /**
     * Middlewares directory
     */
    private middlewares_dir = path.join(this.server.workdir, "middlewares");

    /**
     * Tree loader
     */
    private treeLoader = new TreeLoader(this.server);
    
    /**
     * Load middlewares
     * @returns Middlewares loaded
     */
    public async load(): Promise<{ middleware: Middleware, route: IRouteFile }[]> {
        // Load tree info
        const tree = await this.treeLoader.load(this.middlewares_dir, "middleware", "compact");

        // Load constructors
        const middlewareConstructors: {
            constructor: new (server: Server) => Middleware,
            route: IRouteFile
        }[] = [];
        
        /**
         * Import all files founded
         */
        await Promise.all(
            tree.paths.map(async (middlewareFileItem) => {
                try {
                    // Load module middleware
                    const moduleMiddleware = await import(middlewareFileItem.absolute);

                    // Middleware loaded
                    let middleware: (new (server: Server) => Middleware) | undefined;

                    // Validate middleware valid
                    if(moduleMiddleware.default?.prototype instanceof Middleware) {

                        // Set property
                        Object.defineProperty(moduleMiddleware.default, "name", {
                            writable: true
                        });
                        moduleMiddleware.default.name = middlewareFileItem.filename;
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
                        // Append middleware prepared
                        middlewareConstructors.push({
                            constructor: middleware,
                            route: middlewareFileItem
                        });
                    }
                    else console.log("⚠️  Invalid middleware:   /" + middlewareFileItem.filename)
                }
                catch(err) {
                    console.log(err);
                    throw new Error("❌ Failed to load middleware:    /" + middlewareFileItem.filename);
                }
            })
        );

        // Create middlewares
        const middlewaresLoaded: {
            middleware: Middleware,
            route: IRouteFile
        }[] = middlewareConstructors.map((middlewareConstructorItem) => ({
            middleware: new middlewareConstructorItem.constructor(this.server),
            route: middlewareConstructorItem.route
        }));

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