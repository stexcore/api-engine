import path from "path";
import Loader from "../class/loader";
import Service from "../class/service";
import TreeLoader from "./tree.loader";
import Server from "../server/server";

/**
 * Services loader
 */
export default class ServicesLoader extends Loader<Service[]> {

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
    public async load(): Promise<Service[]> {
        // Load tree info
        const tree = await this.treeLoader.load(this.services_dir, "service", "compact");
        // Services loaded
        const servicesLoaded: Service[] = [];

        // Load constructors
        const serviceConstructors: (new (server: Server) => Service)[] = [];
        
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
                    else console.log("⚠️  Invalid service:   /" + serviceFileItem.filename);
                }
                catch(err) {
                    console.log(err);
                    throw new Error("❌ Failed to load service:    /" + serviceFileItem.filename);
                }
            })
        );

        // Register services
        this.server.registerService(serviceConstructors)

        return servicesLoaded;
    }
    
}