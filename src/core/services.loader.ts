import path from "path";
import Service from "../class/service";
import TreeLoader from "./tree.loader";
import ModuleLoader from "../class/module.loader";
import classUtil from "../utils/class";
import type { ILoadedModule, IServiceConstructor } from "../types/types";

/**
 * Services loader
 */
export default class ServicesLoader extends ModuleLoader<IServiceConstructor> {

    /**
     * Service directory
     */
    private services_dir: string = path.join(this.server.workdir, "services");
    
    /**
     * tree loader
     */
    private treeLoader = new TreeLoader(this.server);
    
    /**
     * Load all services into workdir
     * @returns All controllers
     */
    public async load(): Promise<ILoadedModule<IServiceConstructor>[]> {
        // Time to init load
        const initTime = Date.now();
        // Load tree info
        const tree = await this.treeLoader.load(this.services_dir, "service", "compact");

        // Load constructors
        const serviceConstructorsLoaded: ILoadedModule<IServiceConstructor>[] = [];
        
        // Import all files
        await Promise.all(
            tree.paths.map(async (serviceFileItem) => {
                try {
                    // Load module service
                    const moduleService = await import(serviceFileItem.absolute);

                    // Validate service valid
                    if(moduleService.default?.prototype instanceof Service) {
                        Object.defineProperty(moduleService.default, "name", {
                            writable: true,
                            value: serviceFileItem.relative
                        });
                        return serviceConstructorsLoaded.push({
                            status: "loaded",
                            module: moduleService.default,
                            route: serviceFileItem,
                            loadTimeMs: Date.now() - initTime
                        });
                    }
                    else if (typeof moduleService.default === "undefined" || (moduleService.default && typeof moduleService.default === "object" && !Object.keys(moduleService.default).length) && !classUtil.isClass(moduleService.default)) {
                        return serviceConstructorsLoaded.push({
                            status: "missing-default-export",
                            route: serviceFileItem
                        });
                    } else {
                        return serviceConstructorsLoaded.push({
                            status: "not-extends-valid-class",
                            route: serviceFileItem
                        });
                    }
                }
                catch(err) {
                    return serviceConstructorsLoaded.push({
                        status: "failed-import",
                        route: serviceFileItem,
                        error: err
                    });
                }
            })
        );

        return serviceConstructorsLoaded;
    }
    
}