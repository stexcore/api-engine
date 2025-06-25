import type { IRequestHandler } from "../types/types";
import Piece from "./piece";

/**
 * Structure base of controller
 */
export default class Controller extends Piece {

    /**
     * Handle request incomming with method 'GET'
     */
    public GET?: IRequestHandler;

    /**
     * Handle request incomming with method 'POST'
     */
    public POST?: IRequestHandler;

    /**
     * Handle request incomming with method 'PUT'
     */
    public PUT?: IRequestHandler;

    /**
     * Handle request incomming with method 'DELETE'
     */
    public DELETE?: IRequestHandler;

    /**
     * Handle request incomming with method 'PATCH'
     */
    public PATCH?: IRequestHandler;

    /**
     * Handle request incomming with method 'HEAD'
     */
    public HEAD?: IRequestHandler;

    /**
     * Handle request incomming with method 'OPTIONS'
     */
    public OPTIONS?: IRequestHandler;
    
}