import { RequestHandler } from "express";
import Server from "../server";

/**
 * Structure base of controller
 */
export default class Controller {

    /**
     * Initialize controller
     * @param server Server instance
     */
    constructor(public readonly server: Server) {}

    /**
     * Handle request incomming with method 'GET'
     */
    public GET?: RequestHandler;

    /**
     * Handle request incomming with method 'POST'
     */
    public POST?: RequestHandler;

    /**
     * Handle request incomming with method 'PUT'
     */
    public PUT?: RequestHandler;

    /**
     * Handle request incomming with method 'DELETE'
     */
    public DELETE?: RequestHandler;

    /**
     * Handle request incomming with method 'PATCH'
     */
    public PATCH?: RequestHandler;

    /**
     * Handle request incomming with method 'HEAD'
     */
    public HEAD?: RequestHandler;

    /**
     * Handle request incomming with method 'OPTIONS'
     */
    public OPTIONS?: RequestHandler;
    
}