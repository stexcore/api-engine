import Piece from "./piece";
import type { IMiddlewareHandler, IMiddlewareError } from "../types/types";

/**
 * Structure base of middleware 
 */
export default abstract class Middleware extends Piece {
    
    /**
     * Request handler
     */
    public readonly handler?: IMiddlewareHandler;
    
    /**
     * Error request handlers
     */
    public readonly error?: IMiddlewareError;
    
}