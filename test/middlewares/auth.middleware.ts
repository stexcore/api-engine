import { unauthorized } from "@stexcore/http-status";
import Middleware, { IMiddewareHandler } from "../../src/class/middleware";
import AuthService from "../services/auth.service";

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
    public handler: IMiddewareHandler = (req, res, next) => {
        try {
            const authorized = this.auth.auth(req.headers["authorization"]);

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
    
}