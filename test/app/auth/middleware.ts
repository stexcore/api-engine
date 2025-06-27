import { unauthorized } from "@stexcore/http-status";
import { RequestHandler } from "express";
import { IMiddewareHandler, IMiddlewareError, Middleware } from "../../../src";
import AuthService from "../../services/auth.service";

/**
 * Middleware to auth
 */
export default class AuthMiddleware extends Middleware {

    /**
     * Authentication
     */
    auth = this.$(AuthService);

    public errors?: IMiddlewareError | undefined = 0 as any
    
    // /**
    //  * Handle middleware
    //  * @param req Request incomming
    //  * @param res Response utils
    //  * @param next Next middleware
    //  */
    // public handler: RequestHandler = (req, res, next) => {
    //     try {
    //         const authorized = this.auth.auth(req.query.authorization);

    //         // Is authorized?
    //         if(!authorized) {
    //             throw unauthorized("Unauthorized");
    //         }

    //         console.log("ALERT2!!!", req.url);

    //         // Next middleware
    //         next();
    //     }
    //     catch(err) {
    //         next(err);
    //     }
    // };

    // public errors?: IMiddlewareError = (err, req, res, next) => {
    //     console.error(err);
    //     next(err);
    // }
    
}