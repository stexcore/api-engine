import Server from "../server";

/**
 * Service instance
 */
export default class Service {

    /**
     * Initialize service
     * @param server Server instance
     */
    constructor(public readonly server: Server) {}

    /**
     * Initialize service operation. (It's called when the server is initialized)
     */
    public initialize?(): void;

    /**
     * Destroy service operation. (It's called when the server is destroying)
     */
    public destroy?(): void;
    
}