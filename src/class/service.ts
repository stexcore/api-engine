import Server from "../server/server";
import Piece from "./piece";
import { RegisterCreatingServiceSymbol, UnregisterCreatingServiceSymbol } from "../symbols/server.symbols";

/**
 * Service instance
 */
export default class Service extends Piece {

    constructor(server: Server) {
        super(server);

        // Append creating service
        server[RegisterCreatingServiceSymbol](this);

        // Create a timer that waits for a tick to clear the service creation memory
        setTimeout(() => {
            server[UnregisterCreatingServiceSymbol](this);
        });
    }

    /**
     * Initialize service operation. (It's called when the server is initialized)
     */
    public onInit?(): void;

    /**
     * Destroy service operation. (It's called when the server is destroying)
     */
    public onDestroy?(): void;
    
}