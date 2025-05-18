import type { IServerConfig } from "../types/types";
import express from "express";
import Service from "../class/service";
import http from "http";
import ServicesLoader from "../core/services.loader";

/**
 * Server instance
 */
export default class Server {

    /**
     * Express application
     */
    public readonly app: express.Application;

    /**
     * Http server
     */
    public readonly server: http.Server;

    /**
     * Server Port
     */
    protected port: number;

    /**
     * Workdir to work
     */
    public readonly workdir: string

    /**
     * All services 
     */
    public readonly services: Service[] = [];
    
    /**
     * Initialize server instance
     */
    constructor(config: IServerConfig) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = config.port;
        this.workdir = config.workdir;
    }

    /**
     * Register service instance into this server
     * @param service Service Constructor
     * @returns Service instance created or existent
     */
    public registerService(service: new (server: this) => Service) {
        let serviceItem = this.services.find((s) => s instanceof service);

        if(!serviceItem) {
            this.services.push(serviceItem = new service(this));
        }

        return serviceItem;
    }

    /**
     * Get service instance from this server instance
     * @param service Service Constructor
     * @returns Service instance
     */
    public getService<S extends Service>(service: new (server: this) => S): S {
        const serviceItem = this.services.find((s) => s instanceof service);
        
        if(!serviceItem) throw new Error("Service not found!");
        return serviceItem as S;
    }

    /**
     * Initialize server instance
     */
    public initialize() {
        return new Promise<void>((resolve, reject) => {
            try {
                // Apply start server
                const startServer = () => {
                    try {
                        // Open port listening...
                        this.server.listen(this.port, () => {
                            // Log server started
                            console.log("\n  Server started on: http://localhost:" + this.port + "\n");
                            // Resolve current promise
                            resolve();
                        });
                    }
                    catch(err) {
                        reject(err);
                    }
                };

                const servicesLoader = new ServicesLoader(this);

                Promise.all([
                    servicesLoader.load()
                ])
                    .then(() => {
                        // Apply start server
                        startServer();
                    })
                    .catch(reject)
                
            }
            catch(err) {
                reject(err);
            }
        });

    }

    /**
     * Stop server listening
     */
    public destroy() {
        return new Promise<void>((resolve, reject) => {
            try {
                // Close listening...
                this.server.close((err) => {
                    if(err) return reject(err);
                    resolve();
                });
            }
            catch(err) {
                reject(err);
            }
        });
    }

}