import Loader from "../class/loader";
import path from "path";
import TreeLoader from "./tree.loader";
import Pipe from "../class/pipe";
import type { ILoadedModule, IMiddewareHandler, IPipeConstructor, IRequestHandler, IRouteFile } from "../types/types";
import ModuleLoader from "../class/module.loader";

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
                    if(modulePipe.default?.prototype instanceof Pipe) {
                        pipe = modulePipe.default;
                    }
                    else if(
                        modulePipe.default instanceof Array &&
                        typeof modulePipe.default === "function"
                    ) {
                        pipe = class extends Pipe {

                            /**
                             * Request handlers
                             */
                            public handler: IMiddewareHandler = modulePipe.default;
                            
                        };
                    }

                    if(pipe) {
                        try {
                            // Set property
                            Object.defineProperty(pipe, "name", {
                                writable: true,
                                value: pipeFileItem.relative
                            });

                            // Create a new instance of pipe
                            const pipeInstance = new pipe(this.server);

                            if(pipeInstance.handler instanceof Array) {
                                for(let x = 0; x < pipeInstance.handler.length; x++) {
                                    const handlerItem = pipeInstance.handler[x];

                                    if(typeof handlerItem === 'function') {
                                        if(handlerItem.length <= 3) {
                                            // Append pipe founded
                                            pipesLoaded.push({
                                                status: "loaded",
                                                module: pipeInstance,
                                                route: pipeFileItem
                                            });
                                        }
                                        else {
                                            pipesLoaded.push({
                                                status: "too-many-parameters-request-handler",
                                                keyname: "handler",
                                                route: pipeFileItem,
                                                array: { index: x }
                                            });
                                        }
                                    }
                                    else {
                                        pipesLoaded.push({
                                            status: "invalid-function-request-handler",
                                            keyname: "handler",
                                            route: pipeFileItem,
                                            array: { index: x }
                                        });
                                    }
                                }
                            }
                        }
                        catch(err) {
                            pipesLoaded.push({
                                status: "constructor-error",
                                route: pipeFileItem,
                                error: err
                            });
                        }
                    }
                    else if (!modulePipe.default || (modulePipe.default instanceof Object && !Object.keys(modulePipe.default).length)) {
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
                catch(err) {
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