import { ErrorRequestHandler } from "express";
import httpStatus from "@stexcore/http-status";

/**
 * Catch a global error
 * @param _err Error incomming
 * @param _req Request incomming
 * @param res Response utils
 * @param next Next middleware
 */
const catchGlobalErrorMiddleware: ErrorRequestHandler = (_err, _req, res, next) => {
    try {
        res.json(httpStatus.internalServerError());
    }
    catch(err) {
        next(err);
    }
}

// Export middleware
export default catchGlobalErrorMiddleware;