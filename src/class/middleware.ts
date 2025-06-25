import Pipe from "./pipe";
import type { IMiddlewareError } from "../types/types";

/**
 * Structure base of middleware 
 */
export default abstract class Middleware extends Pipe {

    /**
     * Error request handlers
     */
    public readonly errors?: IMiddlewareError;
    
}