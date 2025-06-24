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
        
        await Promise.all(
            tree.paths.map(async (controllerFileItem) => {
                try {
                    // Load module controller
                    const moduleController = await import(controllerFileItem.absolute);

                    let controller: (new (server: Server) => Controller) | undefined;

                    // Validate controller valid
                    if(moduleController.default?.prototype instanceof Controller) {
                        Object.defineProperty(moduleController.default, "name", {
                            writable: true
                        });
                        moduleController.default.name = controllerFileItem.filename;
                        controller = moduleController.default;
                    }

                    if(controller) {
                        controllersConstructors.push({
                            constructor: controller,
                            route: controllerFileItem
                        });
                    }
                    else console.log("⚠️  Invalid controller:   /" + controllerFileItem.filename)
                }
                catch(err) {
                    console.log(err);
                    throw new Error("❌ Failed to load controller:    /" + controllerFileItem.filename);
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