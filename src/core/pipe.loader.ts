import Loader from "../class/loader";
import path from "path";
import TreeLoader from "./tree.loader";
import Pipe from "../class/pipe";
import type { RequestHandler } from "express";
import type Server from "../server/server";
import type { IMiddewareHandler, IRouteFile } from "../types/types";

/**
 * Pipe loader
 */
export default class PipesLoader extends Loader<{ pipe: Pipe, route: IRouteFile }[]> {

    /**
     * Pipes directory
     */
    private pipes_dir = path.join(this.server.workdir, "pipes");

    /**
     * Tree loader
     */
    private treeLoader = new TreeLoader(this.server);
    
    /**
     * Load pipes
     * @returns Pipes loaded
     */
    public async load(): Promise<{ pipe: Pipe, route: IRouteFile }[]> {
        // Load tree info
        const tree = await this.treeLoader.load(this.pipes_dir, "pipe", "compact");

        // Load constructors
        const pipeConstructors: {
            constructor: new (server: Server) => Pipe,
            route: IRouteFile
        }[] = [];
        
        // Import all files
        await Promise.all(
            tree.paths.map(async (pipeFileItem) => {
                try {
                    // Load module pipe
                    const modulePipe = await import(pipeFileItem.absolute);

                    let pipe: (new (server: Server) => Pipe) | undefined;

                    // Validate pipe valid
                    if(modulePipe.default?.prototype instanceof Pipe) {
                        Object.defineProperty(modulePipe.default, "name", {
                            writable: true
                        });
                        modulePipe.default.name = pipeFileItem.filename;
                        pipe = modulePipe.default;
                    }
                    else {
                        const handlers: RequestHandler[] = [];
                        
                        if(modulePipe.default instanceof Array) {
                            const result = this.analizeArray(pipeFileItem.filename, modulePipe.default);

                            handlers.push(...result.handler);
                        }
                        else if(typeof modulePipe.default === "function") {
                            const result = this.analizeArray(pipeFileItem.filename, [modulePipe.default]);

                            handlers.push(...result.handler);
                        }

                        if(handlers.length) {
                            pipe = class extends Pipe {

                                /**
                                 * Request handlers
                                 */
                                public handler: IMiddewareHandler = handlers;
                                
                            }
                        }
                    }

                    if(pipe) {
                        // Append pipe founded
                        pipeConstructors.push({
                            constructor: pipe,
                            route: pipeFileItem
                        });
                    }
                    else if (!modulePipe.default || (modulePipe.default instanceof Object && !Object.keys(modulePipe.default).length)) {
                        console.log(`⚠️  The pipe '${pipeFileItem.relative}' is missing a default export of a class that extends the base Pipe class from @stexcore/api-engine.`);
                    } else {
                        console.log(`⚠️  The pipe '${pipeFileItem.relative}' must either extend the base Pipe class from @stexcore/api-engine or be a RequestHandler function (or an array of them).`);
                    }
                }
                catch(err) {
                    console.log(err);
                    throw new Error(`❌ Failed to load pipe: '${pipeFileItem.relative}'`);
                }
            })
        );

        // Create pipes
        const pipesLoaded: {
            pipe: Pipe,
            route: IRouteFile
        }[] = pipeConstructors.map((pipeConstructorItem) => ({
            pipe: new pipeConstructorItem.constructor(this.server),
            route: pipeConstructorItem.route
        }));

        return pipesLoaded;
    }

    /**
     * Validates and obtains valid request handlers
     * @param name Name middleware
     * @param arr Array info unknow data
     * @returns Requests handlers
     */
    private analizeArray(name: string, arr: unknown[]) {
        const requestHandlers: RequestHandler[] = [];
        
        // Traverse the array
        for(let x = 0; x < arr.length; x++) {
            const arrItem = arr[x];

            if(typeof arrItem === "function") {
                if(arrItem.length === 3) {
                    // Request handler!
                    requestHandlers.push(arrItem as RequestHandler);
                }
                else console.log("⚠️  Invalid middleware:   /" + name + "[" + x + "]");
            }
        }

        return { handler: requestHandlers };
    }
}