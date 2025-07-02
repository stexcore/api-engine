import Piece from "./piece";
import type { IMiddlewareHandler } from "../types/types";

/**
 * Structure base of pipe 
 */
export default abstract class Pipe extends Piece {

    /**
     * Request handler
     */
    public readonly abstract handler: IMiddlewareHandler;
    
}