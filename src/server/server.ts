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
     * Circular error
     */
    private CircularError = class extends Error { };

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
     * Registering constructors services
     */
    private constructors_services: (new (server: this) => Service)[] = [];

    /**
     * Creating constructors services
     */
    private creating_constructors_services: (new (server: this) => Service)[] = [];
    
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
    public registerService(constructorServices: (new (server: Server) => Service)[]): Service[] {
        // Services registered
        const services: Service[] = [];
        // Set registering services
        this.constructors_services = constructorServices;
        
        // Traverse constructors services
        for(const constructorServiceItem of constructorServices) {
            try {
                // Create service
                const serviceItem = this.createService(constructorServiceItem);
                // Append created service
                services.push(serviceItem);
            }
            catch(err) {
                if(err instanceof this.CircularError) {
                    console.log(err);
                }
                else {
                    console.log(err);
                    console.log("❌ Failed to load service:    /" + constructorServiceItem.name);
                }
            }
        }

        // Clean registering constructors
        this.constructors_services = [];

        // Return registered services
        return services;
    }

    /**
     * Create a instance service
     * @param constructorService Constructor service
     * @returns Service instance
     */
    private createService(constructorService: new (server: this) => Service) {
        // Find existent service
        let serviceItem = this.services.find((s) => s instanceof constructorService);

        if(!serviceItem) {
            // Find circular creating
            const index = this.creating_constructors_services.findIndex((ccs) => ccs.prototype instanceof constructorService);
            
            if(index === -1) {
                // Add creating instance
                this.creating_constructors_services.push(constructorService);
                // append new instance service
                this.services.push(serviceItem = new constructorService(this));
                // Clean creating instance
                this.creating_constructors_services = this.creating_constructors_services.filter((ccs) => (
                    ccs !== constructorService
                ));

                console.log("✅ Service loaded:    /" + constructorService.name);
            }
            else {
                // Get circular error
                const constructorBase = this.creating_constructors_services[index];
                const constructorConflict = this.creating_constructors_services[this.creating_constructors_services.length - 2] || constructorBase;

                // Throw circular error
                throw new this.CircularError(`❌ Circular dependency detected: '${constructorBase.name}' depends on '${constructorConflict.name}', creating an infinite loop.`)
            }
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
        
        if(!serviceItem) {
            const constructor = this.constructors_services.find((cs) => cs === service);

            if(constructor) {
                return this.createService(constructor) as S;
            }
            throw new Error("Service not found!");
        }
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