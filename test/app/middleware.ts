import { unauthorized } from "@stexcore/http-status";
import { RequestHandler } from "express";
import { IMiddlewareError, Middleware } from "../../src";
import AuthService from "../services/auth.service";

/**
 * Middleware to auth
 */
export default class BaseMiddleware extends Middleware {

    /**
     * Authentication
     */
    auth = this.$(AuthService);
    
    /**
     * Handle middleware
     * @param req Request incomming
     * @param res Response utils
     * @param next Next middleware
     */
    public handler: RequestHandler = (req, res, next) => {
        try {
            console.log("ALERT!!!", req.url);

            // Next middleware
            next();
        }
        catch(err) {
            next(err);
        }
    };

    public errors?: IMiddlewareError = (err, req, res, next) => {
        console.error(err);
        next(err);
    }
    
}