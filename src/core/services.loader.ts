import path from "path";
import fs from "fs";
import Loader from "../class/loader";
import Service from "../class/service";

/**
 * Services loader
 */
export default class ServicesLoader extends Loader<Service[]> {

    /**
     * Service directory
     */
    private services_dir = path.join(this.server.workdir, "services");
    
    /**
     * Load all services into workdir
     * @returns All controllers
     */
    public async load(): Promise<Service[]> {
        // Read service files
        const serviceFiles = fs.readdirSync(this.services_dir);
        const servicesLoaded: Service[] = [];

        // Earch services
        for(const serviceFileItem of serviceFiles) {
            // Get service name
            const serviceName = serviceFileItem.slice(0, -3);

            // Validate nomenclature
            if(serviceFileItem.endsWith(".service.ts") || serviceFileItem.endsWith(".service.js")) {
                try {
                    // import module
                    const service = await import(path.join(this.services_dir, serviceFileItem))
                    // Validate module
                    if(service.default?.prototype instanceof Service) {
    
                        // Register service
                        const serviceInstance = this.server.registerService(service.default)
                        servicesLoaded.push(serviceInstance);
    
                        // Log service loaded
                        console.log("✅ Service loaded:    /" + serviceName);
                    }
                }
                catch(e) {
                    console.debug(e);
                    console.log("❌ Failed to load service:    /" + serviceName);
                }
            }
        }

        return servicesLoaded;
    }
    
}