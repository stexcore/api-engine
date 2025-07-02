import path from "path";
import TreeLoader from "./tree.loader";
import Middleware from "../class/middleware";
import ModuleLoader from "../class/module.loader";
import classUtil from "../utils/class";
import type { IErrorRequestHandler, ILoadedModule, IMiddlewareHandler, IMiddlewareConstructor, IRequestHandler } from "../types/types";

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
        // Time to init load
        const initTime = Date.now();
        // Load tree info
        const tree = await this.treeLoader.load(this.middlewares_dir, "middleware", this.server.mode);

        // Load constructors
        const middlewaresLoaded: ILoadedModule<Middleware>[] = [];

        // Import all files
        await Promise.all(
            tree.paths.map(async (middlewareFileItem) => {
                try {
                    // Load module middleware
                    const moduleMiddleware = await import(middlewareFileItem.absolute);

                    let middleware: IMiddlewareConstructor | undefined;

                    // Validate middleware valid
                    if (moduleMiddleware.default?.prototype instanceof Middleware) {
                        middleware = moduleMiddleware.default;
                    }
                    else if (
                        moduleMiddleware.default instanceof Array ||
                        typeof moduleMiddleware.default === "function"
                    ) {
                        middleware = class extends Middleware {

                            /**
                             * Request handlers
                             */
                            public handler: IMiddlewareHandler = moduleMiddleware.default;

                        };
                    }

                    if (middleware) {
                        try {
                            // Set property
                            Object.defineProperty(middleware, "name", {
                                writable: true,
                                value: middlewareFileItem.relative
                            });

                            // Create a new instance of middleware
                            const middlewareInstance = new middleware(this.server);

                            if(
                                typeof middlewareInstance.handler === "undefined" && 
                                typeof middlewareInstance.error === "undefined"
                            ) {
                                middlewaresLoaded.push({
                                    status: "missing-some-member-declaration",
                                    route: middlewareFileItem
                                });
                                return;
                            }

                            // a utility for analyzing the structure of middleware
                            const analize = (keyname: "handler" | "error", handlerItem: IRequestHandler | IErrorRequestHandler, array?: { index: number }) => {
                                if (typeof handlerItem === 'function') {
                                    if (keyname === "handler" ? (handlerItem.length <= 3) : (handlerItem.length === 4)) {
                                        return true;
                                    }
                                    else {
                                        middlewaresLoaded.push({
                                            status: "too-many-parameters-request-handler",
                                            keyname: keyname,
                                            route: middlewareFileItem,
                                            array: array
                                        });
                                    }
                                }
                                else {
                                    middlewaresLoaded.push({
                                        status: "invalid-function-request-handler",
                                        keyname: keyname,
                                        route: middlewareFileItem,
                                        array: array
                                    });
                                }

                                return false;
                            }

                            if (middlewareInstance.handler instanceof Array) {

                                if(middlewareInstance.handler.length) {
                                    for (let x = 0; x < middlewareInstance.handler.length; x++) {
                                        const result = analize("handler", middlewareInstance.handler[x], { index: x });
    
                                        if(!result) return; // Exhaust outlet
                                    }
                                }
                                else {
                                    middlewaresLoaded.push({
                                        status: "array-empty-request-handler",
                                        keyname: "handler",
                                        route: middlewareFileItem
                                    });
                                    return;
                                }

                            }
                            else if(middlewareInstance.handler) {
                                const result = analize("handler", middlewareInstance.handler);

                                if(!result) return; // Exhaust outlet
                            }

                            if (middlewareInstance.error instanceof Array) {

                                if(middlewareInstance.error.length) {
                                    for (let x = 0; x < middlewareInstance.error.length; x++) {
                                        const result = analize("error", middlewareInstance.error[x], { index: x });
    
                                        if(!result) return; // Exhaust outlet
                                    }
                                }
                                else {
                                    middlewaresLoaded.push({
                                        status: "array-empty-request-handler",
                                        keyname: "error",
                                        route: middlewareFileItem
                                    });
                                    return;
                                }

                            }
                            else if(middlewareInstance.error) {
                                const result = analize("error", middlewareInstance.error);

                                if(!result) return; // Exhaust outlet
                            }

                            // Append pipe founded
                            middlewaresLoaded.push({
                                status: "loaded",
                                module: middlewareInstance,
                                route: middlewareFileItem,
                                loadTimeMs: Date.now() - initTime
                            });
                        }
                        catch (err) {
                            middlewaresLoaded.push({
                                status: "constructor-error",
                                route: middlewareFileItem,
                                error: err
                            });
                        }
                    }
                    else if (typeof moduleMiddleware.default === "undefined" || (moduleMiddleware.default && typeof moduleMiddleware.default === "object" && !Object.keys(moduleMiddleware.default).length) && !classUtil.isClass(moduleMiddleware.default)) {
                        middlewaresLoaded.push({
                            status: "missing-default-export",
                            route: middlewareFileItem
                        });
                        // console.log(`⚠️  The pipe '${middlewareFileItem.relative}' is missing a default export of a class that extends the base Pipe class from @stexcore/api-engine.`);
                    } else {
                        middlewaresLoaded.push({
                            status: "not-extends-valid-class",
                            route: middlewareFileItem
                        });
                        // console.log(`⚠️  The pipe '${middlewareFileItem.relative}' must either extend the base Pipe class from @stexcore/api-engine or be a RequestHandler function (or an array of them).`);
                    }
                }
                catch (err) {
                    middlewaresLoaded.push({
                        status: "failed-import",
                        route: middlewareFileItem,
                        error: err
                    });
                    // throw new Error(`❌ Failed to load pipe: '${middlewareFileItem.relative}'`);
                }
            })
        );

        return middlewaresLoaded;
    }
}