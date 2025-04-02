import { RequestHandler } from "express";
import httpStatus from "@stexcore/http-status";
import Joi from "joi";

/**
 * Make a middleware to validate schema
 * @param schema Schema validation
 * @param access Access to property
 * @returns Request handler
 */
export default function schemaMiddleware(schema: Joi.ObjectSchema, access: "params" | "body" | "query"): RequestHandler {

    // Make request handler
    return (req, _res, next) => {
        try {
            // Validate schema with joi
            const resultValidation = schema.validate(req[access], { abortEarly: false });

            if(resultValidation.error) {
                // Throw error
                next(
                    httpStatus.badRequest(resultValidation.error.message)
                );
            }
            else {
                // Allow request incomming
                next();
            }
        }
        catch(err) {
            // Forward Error
            next(err);
        }
    }
}