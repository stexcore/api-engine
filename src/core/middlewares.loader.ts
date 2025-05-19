import { ErrorRequestHandler, RequestHandler } from "express";
import Loader from "../class/loader";
import path from "path";
import TreeLoader from "./tree.loader";
import Middleware, { IMiddewareHandler, IMiddlewareError } from "../class/middleware";
import Server from "../server/server";

export default class MiddlewaresLoader extends Loader<Middleware[]> {

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
    public async load(): Promise<Middleware[]> {
        // Load tree info
        const tree = await this.treeLoader.load(this.middlewares_dir, "middleware", "compact");

        // Load constructors
        const middlewareConstructors: (new (server: Server) => Middleware)[] = [];
        
        await Promise.all(
            tree.paths.map(async (middlewareFileItem) => {
                try {
                    // Load module middleware
                    const moduleMiddleware = await import(middlewareFileItem.absolute);

                    let middleware: (new (server: Server) => Middleware) | undefined;

                    // Validate middleware valid
                    if(moduleMiddleware.default?.prototype instanceof Middleware) {
                        Object.defineProperty(moduleMiddleware.default, "name", {
                            writable: true
                        });
                        moduleMiddleware.default.name = middlewareFileItem.filename;
                        middleware = moduleMiddleware.default;
                    }
                    else {
                        const handlers: RequestHandler[] = [];
                        const errors: ErrorRequestHandler[] = [];
                        
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
                        middlewareConstructors.push(middleware);
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
        const middlewaresLoaded: Middleware[] = middlewareConstructors.map((middlewareConstructorItem) => (
            new middlewareConstructorItem(this.server)
        ));

        return middlewaresLoaded;
    }

    private analizeArray(name: string, arr: unknown[]) {
        const requestHandlers: RequestHandler[] = [];
        const errorRequestHandlers: ErrorRequestHandler[] = [];
        
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