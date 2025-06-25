import Piece from "./piece";
import Server from "../server/server";
import type { IMiddewareHandler, IMiddlewareError } from "../types/types";

/**
 * Structure base of middleware 
 */
export default abstract class Middleware extends Piece {

    /**
     * Piece constructor
     */
    constructor(server: Server) {
        super(server);

        // Validate abstract methods
        if (!this.handler && !this.errors) {
            throw new Error(`❌ Invalid middleware: at least 'handler' or 'errors' must be defined.`);
        }
    }
    
    /**
     * Request handler
     */
    public readonly handler?: IMiddewareHandler;
    
    /**
     * Error request handlers
     */
    public readonly errors?: IMiddlewareError;
    
}