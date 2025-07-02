import path from "path";
import TreeLoader from "./tree.loader";
import Pipe from "../class/pipe";
import ModuleLoader from "../class/module.loader";
import classUtil from "../utils/class";
import type { ILoadedModule, IMiddewareHandler, IPipeConstructor, IRequestHandler } from "../types/types";

/**
 * Pipe loader
 */
export default class PipesLoader extends ModuleLoader<Pipe> {

    /**
     * Pipes directory
     */
    private pipes_dir = path.join(this.server.workdir, this.server.isCompact ? "pipes" : "app");

    /**
     * Tree loader
     */
    private treeLoader = new TreeLoader(this.server);

    /**
     * Load pipes
     * @returns Pipes loaded
     */
    public async load(): Promise<ILoadedModule<Pipe>[]> {
        // Time to init load
        const initTime = Date.now();
        // Load tree info
        const tree = await this.treeLoader.load(this.pipes_dir, "pipe", this.server.mode);

        // Load constructors
        const pipesLoaded: ILoadedModule<Pipe>[] = [];

        // Import all files
        await Promise.all(
            tree.paths.map(async (pipeFileItem) => {
                try {
                    // Load module pipe
                    const modulePipe = await import(pipeFileItem.absolute);

                    let pipe: IPipeConstructor | undefined;

                    // Validate pipe valid
                    if (modulePipe.default?.prototype instanceof Pipe) {
                        pipe = modulePipe.default;
                    }
                    else if (
                        modulePipe.default instanceof Array ||
                        typeof modulePipe.default === "function"
                    ) {
                        pipe = class extends Pipe {

                            /**
                             * Request handlers
                             */
                            public handler: IMiddewareHandler = modulePipe.default;

                        };
                    }

                    if (pipe) {
                        try {
                            // Set property
                            Object.defineProperty(pipe, "name", {
                                writable: true,
                                value: pipeFileItem.relative
                            });

                            // Create a new instance of pipe
                            const pipeInstance = new pipe(this.server);

                            // a utility for analyzing the structure of middleware
                            const analize = (handlerItem: IRequestHandler, array?: { index: number }) => {
                                if (typeof handlerItem === 'function') {
                                    if (handlerItem.length <= 3) {
                                        return true;
                                    }
                                    else {
                                        pipesLoaded.push({
                                            status: "too-many-parameters-request-handler",
                                            keyname: "handler",
                                            route: pipeFileItem,
                                            array: array
                                        });
                                    }
                                }
                                else {
                                    pipesLoaded.push({
                                        status: "invalid-function-request-handler",
                                        keyname: "handler",
                                        route: pipeFileItem,
                                        array: array
                                    });
                                }

                                return false;
                            }

                            if (pipeInstance.handler instanceof Array) {

                                if(pipeInstance.handler.length) {
                                    for (let x = 0; x < pipeInstance.handler.length; x++) {
                                        const result = analize(pipeInstance.handler[x], { index: x });
    
                                        if(!result) return; // Exhaust outlet
                                    }
                                }
                                else {
                                    pipesLoaded.push({
                                        status: "array-empty-request-handler",
                                        keyname: "handler",
                                        route: pipeFileItem
                                    });
                                    return;
                                }

                            }
                            else {
                                const result = analize(pipeInstance.handler);

                                if(!result) return; // Exhaust outlet
                            }

                            // Append pipe founded
                            pipesLoaded.push({
                                status: "loaded",
                                module: pipeInstance,
                                route: pipeFileItem,
                                loadTimeMs: Date.now() - initTime
                            });
                        }
                        catch (err) {
                            pipesLoaded.push({
                                status: "constructor-error",
                                route: pipeFileItem,
                                error: err
                            });
                        }
                    }
                    else if (typeof modulePipe.default === "undefined" || (modulePipe.default && typeof modulePipe.default === "object" && !Object.keys(modulePipe.default).length) && !classUtil.isClass(modulePipe.default)) {
                        pipesLoaded.push({
                            status: "missing-default-export",
                            route: pipeFileItem
                        });
                        // console.log(`⚠️  The pipe '${pipeFileItem.relative}' is missing a default export of a class that extends the base Pipe class from @stexcore/api-engine.`);
                    } else {
                        pipesLoaded.push({
                            status: "not-extends-valid-class",
                            route: pipeFileItem
                        });
                        // console.log(`⚠️  The pipe '${pipeFileItem.relative}' must either extend the base Pipe class from @stexcore/api-engine or be a RequestHandler function (or an array of them).`);
                    }
                }
                catch (err) {
                    pipesLoaded.push({
                        status: "failed-import",
                        route: pipeFileItem,
                        error: err
                    });
                    // throw new Error(`❌ Failed to load pipe: '${pipeFileItem.relative}'`);
                }
            })
        );

        return pipesLoaded;
    }
}