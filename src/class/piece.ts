import type Server from "../server";
import type Service from "./service";

/**
 * It is the main and minimum unit of the application, which is used to be derived 
 * to create fragments throughout the entire application.
 */
export class Piece {

    /**
     * Initialize controller
     * @param server Server instance
     */
    constructor(public readonly server: Server) {}

    /**
     * Is an alias to get service instance from this server instance
     * @param service Service Constructor
     * @returns Service instance
     */
    public getService<S extends Service>(service: new (server: Server) => S): S {
        return this.server.getService<S>(service);
    }

    /**
     * Is an alias to get service instance from this server instance
     * @param service Service Constructor
     * @returns Service instance
     */
    public service$<S extends Service>(service: new (server: Server) => S): S {
        return this.server.getService<S>(service);
    }

    /**
     * Is an alias to get service instance from this server instance
     * @param service Service Constructor
     * @returns Service instance
     */
    public $<S extends Service>(service: new (server: Server) => S): S {
        return this.server.getService<S>(service);
    }
    
}

// Export default
export default Piece;