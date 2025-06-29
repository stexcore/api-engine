import path from "path";
import Service from "../class/service";
import TreeLoader from "./tree.loader";
import ModuleLoader from "../class/module.loader";
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
                        serviceConstructorsLoaded.push({
                            status: "loaded",
                            module: moduleService.default,
                            route: serviceFileItem
                        });
                    }
                    else if (!moduleService.default || (moduleService.default instanceof Object && !Object.keys(moduleService.default).length)) {
                        serviceConstructorsLoaded.push({
                            status: "missing-default-export",
                            route: serviceFileItem
                        });
                        // console.log(`⚠️  The service '${serviceFileItem.relative}' is missing a default export of a class that extends the base Service class from @stexcore/api-engine.`);
                    } else {
                        serviceConstructorsLoaded.push({
                            status: "not-extends-valid-class",
                            route: serviceFileItem
                        });
                        // console.log(`⚠️  The service '${serviceFileItem.relative}' does not extend the base Service class from @stexcore/api-engine.`);
                    }
                }
                catch(err) {
                    serviceConstructorsLoaded.push({
                        status: "failed-import",
                        route: serviceFileItem,
                        error: err
                    });
                    // throw new Error(`❌ Failed to load service: '${serviceFileItem.relative}'`);
                }
            })
        );

        return serviceConstructorsLoaded;
    }
    
}