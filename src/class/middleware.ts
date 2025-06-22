import type { ErrorRequestHandler, RequestHandler } from "express";
import Piece from "./piece";

/**
 * Request handler
 */
export type IMiddewareHandler =
    | RequestHandler
    | RequestHandler[];

/**
 * Error request handler
 */
export type IMiddlewareError =
    | ErrorRequestHandler
    | ErrorRequestHandler[]

/**
 * Structure base of middleware 
 */
export default abstract class Middleware extends Piece {

    /**
     * Request handler
     */
    public readonly abstract handler: IMiddewareHandler;

    /**
     * Error request handlers
     */
    public readonly errors?: IMiddlewareError;
    
}