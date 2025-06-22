import Controller from "../class/controller";
import Loader from "../class/loader";
import path from "path";
import fs from "fs";
import { ISegment } from "../types/types";
import TreeLoader from "./tree.loader";
import Server from "../server/server";

/**
 * Controllers loader
 */
export default class ControllersLoader extends Loader<Controller[]> {
    
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
    public async load(): Promise<Controller[]> {

        // Load tree info
        const tree = await this.treeLoader.load(this.controllers_dir, "controller", "compact");

        // Load constructors
        const controllersConstructors: (new (server: Server) => Controller)[] = [];
        
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
                        controllersConstructors.push(controller);
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
        const controllersLoaded: Controller[] = controllersConstructors.map((controllerConstructorItem) => (
            new controllerConstructorItem(this.server)
        ));

        return controllersLoaded;
    }
    
}