import path from "path";
import Loader from "../class/loader";
import Service from "../class/service";
import TreeLoader from "./tree.loader";
import type Server from "../server/server";

/**
 * Services loader
 */
export default class ServicesLoader extends Loader<(new (server: Server) => Service)[]> {

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
    public async load(): Promise<(new (server: Server) => Service)[]> {
        // Load tree info
        const tree = await this.treeLoader.load(this.services_dir, "service", "compact");

        // Load constructors
        const serviceConstructors: (new (server: Server) => Service)[] = [];
        
        // Import all files
        await Promise.all(
            tree.paths.map(async (serviceFileItem) => {
                try {
                    // Load module service
                    const moduleService = await import(serviceFileItem.absolute);

                    // Validate service valid
                    if(moduleService.default?.prototype instanceof Service) {
                        Object.defineProperty(moduleService.default, "name", {
                            writable: true
                        });
                        moduleService.default.name = serviceFileItem.filename;
                        serviceConstructors.push(moduleService.default);
                    }
                    else if (!moduleService.default || (moduleService.default instanceof Object && !Object.keys(moduleService.default).length)) {
                        console.log(`⚠️  The service '${serviceFileItem.relative}' is missing a default export of a class that extends the base Service class from @stexcore/api-engine.`);
                    } else {
                        console.log(`⚠️  The service '${serviceFileItem.relative}' does not extend the base Service class from @stexcore/api-engine.`);
                    }
                }
                catch(err) {
                    console.log(err);
                    throw new Error(`❌ Failed to load service: '${serviceFileItem.relative}'`);
                }
            })
        );

        return serviceConstructors;
    }
    
}