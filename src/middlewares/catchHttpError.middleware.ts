import { ErrorRequestHandler } from "express";
import { isHttpError } from "@stexcore/http-status";

/**
 * Catch http error middleware
 * @param err Error incomming
 * @param _req Request incomming
 * @param res Response utils
 * @param next next middleware
 */
const catchHttpErrorMiddleware: ErrorRequestHandler = (err, _req, res, next) => {
    try {
        // Validate if is http error
        if(isHttpError(err)) {
            res.status(err.statusCode).json(err);
        }
        else next(err);
    }
    catch(err) {
        next(err);
    }
}

// Export middleware
export default catchHttpErrorMiddleware;