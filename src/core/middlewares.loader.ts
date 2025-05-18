import { RequestHandler } from "express";
import Loader from "../class/loader";
import path from "path";
import fs from "fs";

export default class MiddlewaresLoader extends Loader<RequestHandler[]> {

    /**
     * Middlewares directory
     */
    private middlewares_dir = path.join(this.server.workdir, "middlewares");
    
    /**
     * Load middlewares
     * @returns Middlewares loaded
     */
    public async load(segments: string[] = []): Promise<RequestHandler[]> {
        // Workdir
        const dir = path.join(this.middlewares_dir, ...segments);
        // Read middlewares files
        const middlewaresFiles = fs.readdirSync(dir);
        // Middlewares loaded
        const middlewaresLoaded: RequestHandler[] = [];

        // Traverse middlewares
        for(const middlewareFileItem of middlewaresFiles) {
            // Get middleware name
            const middlewareName = middlewareFileItem.slice(0, -3);
            // Path middleware
            const pathMiddleware = "/" + segments.join("/");

            // Validate nomenclature declaration
            if(middlewareFileItem.endsWith("middleware.ts") || middlewareFileItem.endsWith("middleware.js")) {
                try {
                    // Import module
                    const moduleItem = await import(path.join(dir, middlewareFileItem));

                    if(moduleItem.default instanceof Function) {

                        // Append middlewares loaded
                        // this.middlewaresLoaded.push({
                        //     path: pathMiddleware,
                        //     middleware: moduleItem.default
                        // });

                        // // Append middleware loaded
                        // middlewaresLoaded.push(moduleItem.default);

                        // Log middleware loaded
                        console.log("✅ Middleware loaded: " + ([pathMiddleware.replace(/^\//g, ""), middlewareName].join("/")));
                    }
                }
                catch(e) {
                    console.log(e);
                    console.log("❌ Failed to load the middleware: " + ([pathMiddleware, middlewareName].join("/")));
                }
            }
            else {
                // Get middlewares loaded
                const subMiddlewaresLoaded = await this.load([...segments, middlewareFileItem]);

                // Append middlewares loaded
                middlewaresLoaded.push(...subMiddlewaresLoaded);
            }
        }

        // Middlewares loaded
        return [];
    }
}