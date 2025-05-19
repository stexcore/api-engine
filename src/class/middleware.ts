import type { ErrorRequestHandler, RequestHandler } from "express";
import Piece from "./piece";

export type IMiddewareHandler =
    | RequestHandler
    | RequestHandler[];

export type IMiddlewareError =
    | ErrorRequestHandler
    | ErrorRequestHandler[]

export default abstract class Middleware extends Piece {

    public readonly abstract handler: IMiddewareHandler;

    public readonly errors?: IMiddlewareError;
    
}