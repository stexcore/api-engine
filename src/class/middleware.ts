import type { ErrorRequestHandler } from "express";
import Pipe from "./pipe";

/**
 * Error request handler
 */
export type IMiddlewareError =
    | ErrorRequestHandler
    | ErrorRequestHandler[]

/**
 * Structure base of middleware 
 */
export default abstract class Middleware extends Pipe {

    /**
     * Error request handlers
     */
    public readonly errors?: IMiddlewareError;
    
}