import Piece from "./piece";
import type { IMiddewareHandler, IMiddlewareError } from "../types/types";

/**
 * Structure base of middleware 
 */
export default abstract class Middleware extends Piece {
    
    /**
     * Request handler
     */
    public readonly handler?: IMiddewareHandler;
    
    /**
     * Error request handlers
     */
    public readonly errors?: IMiddlewareError;
    
}