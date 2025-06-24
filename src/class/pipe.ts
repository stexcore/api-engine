import type { RequestHandler } from "express";
import Piece from "./piece";

/**
 * Request handler
 */
export type IMiddewareHandler =
    | RequestHandler
    | RequestHandler[];

/**
 * Structure base of pipe 
 */
export default abstract class Pipe extends Piece {

    /**
     * Request handler
     */
    public readonly abstract handler?: IMiddewareHandler;
    
}