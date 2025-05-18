import Controller from "../class/controller";
import Loader from "../class/loader";
import path from "path";
import fs from "fs";
import { ISegment } from "../types/types";

/**
 * Controllers loader
 */
export default class ControllersLoader extends Loader<Controller[]> {
    
    /**
     * Load controllers
     */
    private controllers_dir = path.join(this.server.workdir, "controllers");
    
    /**
     * Load controllers
     * @returns controller loaded
     */
    public async load(): Promise<Controller[]> {
        // Controller files
        const controllerFiles = fs.readdirSync(this.controllers_dir);
        // COntrollers loaded
        const controllerLoaded: Controller[] = [];

        // load controllers
        for(const controllerFileItem of controllerFiles) {

            // Validate nomenclature file
            if(controllerFileItem.endsWith("controller.ts") || controllerFileItem.endsWith("controller.js")) {
                // remove controller.js/ts nomenclature
                const controllerName = controllerFileItem.slice(0, -3);
                const segmentsFile = controllerName.slice(0, -11).split(".");
                const segments: ISegment[] = [];
    
                // travese array of segments
                segmentsFile.forEach((segmentFileItem) => {
                    // Validate segment dynamic?
                    if(segmentFileItem.startsWith("[") && segmentFileItem.endsWith("]")) {
                        // Append segment dynamic
                        segments.push({ type: "dynamic", param: segmentFileItem.slice(1, -1) });
                    }
                    else {
                        // Append segment static
                        segments.push({ type: "static", segment: segmentFileItem });
                    }
                });

                // path controller
                const pathController = "/" + segments.map(s => s.type === "static" ? s.segment : `[${s.param}]`).join("/");

                try {
                    // Import module
                    const moduleItem = await import(path.join(this.controllers_dir, controllerFileItem));
    
                    // Validate module instance of Controller
                    if(moduleItem.default?.prototype instanceof Controller) {

                        // Create controller instance
                        const controller = new moduleItem.default(this);
                            
                        // Append controller loaded
                        // this.controllersLoaded.push({
                        //     type: segments.some((s) => s.type === "dynamic") ? "dynamic" : "static",
                        //     path: pathController,
                        //     segments: segments,
                        //     controller: controller
                        // });

                        // Append controller loaded
                        controllerLoaded.push(controller);

                        // Log controller loaded
                        console.log("✅ Controller loaded: " + pathController);
    
                    }
                }
                catch(e) {
                    console.log(e);
                    console.log("❌ Failed to load the controller: " + pathController);
                }
            }
        }

        return [];
    }
    
}