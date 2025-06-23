import { unauthorized } from "@stexcore/http-status";
import Middleware, { IMiddlewareError } from "../../src/class/middleware";
import AuthService from "../services/auth.service";
import { RequestHandler } from "express";

/**
 * Middleware to auth
 */
export default class AuthMiddleware extends Middleware {

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
            const authorized = this.auth.auth(req.query.authorization);

            // Is authorized?
            if(!authorized) {
                throw unauthorized("Unauthorized");
            }

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