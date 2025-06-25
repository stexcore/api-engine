import type Server from "../server/server";
import type { IRouteFile } from "../types/types";
import Controller from "../class/controller";
import Loader from "../class/loader";
import path from "path";
import TreeLoader from "./tree.loader";

/**
 * Controllers loader
 */
export default class ControllersLoader extends Loader<{ controller: Controller, route: IRouteFile }[]> {
    
    /**
     * Load controllers
     */
    private controllers_dir = path.join(this.server.workdir, "controllers");
    
    /**
     * Tree loader
     */
    private treeLoader = new TreeLoader(this.server);
    
    
    /**
     * Load controllers
     * @returns controllers loaded
     */
    public async load(): Promise<{ controller: Controller, route: IRouteFile }[]> {

        // Load tree info
        const tree = await this.treeLoader.load(this.controllers_dir, "controller", "compact");

        // Load constructors
        const controllersConstructors: {
            constructor: (new (server: Server) => Controller),
            route: IRouteFile
        }[] = [];
        
        // Imports all files
        await Promise.all(
            tree.paths.map(async (controllerFileItem) => {
                try {
                    // Load module controller
                    const moduleController = await import(controllerFileItem.absolute);

                    

                    // Validate controller valid
                    if(moduleController.default?.prototype instanceof Controller) {
                        Object.defineProperty(moduleController.default, "name", {
                            writable: true
                        });
                        moduleController.default.name = controllerFileItem.filename;

                        controllersConstructors.push({
                            constructor: moduleController.default,
                            route: controllerFileItem
                        });
                    }
                    else if (!moduleController.default || (moduleController.default instanceof Object && !Object.keys(moduleController.default).length)) {
                        console.log(`⚠️  The controller '${controllerFileItem.relative}' is missing a default export of a class that extends the base Controller class from @stexcore/api-engine.`);
                    } else {
                        console.log(`⚠️  The controller '${controllerFileItem.relative}' does not extend the base Controller class from @stexcore/api-engine.`);
                    }
                }
                catch(err) {
                    console.log(err);
                    throw new Error(`❌ Failed to load controller: '${controllerFileItem.relative}'`);
                }
            })
        );

        // Create controllers
        const controllersLoaded: {
            controller: Controller,
            route: IRouteFile
        }[] = controllersConstructors.map((controllerConstructorItem) => ({
            controller: new controllerConstructorItem.constructor(this.server),
            route: controllerConstructorItem.route
        }));

        return controllersLoaded;
    }
    
}