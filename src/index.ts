import type { ISchema, IServerConfig, IMethod, ISchemaRequest, IRequestHandler, IErrorRequestHandler, IApplication, IMiddlewareError, IMiddlewareHandler, ISchemaConstructor } from "./types/types";
import Server from "./server/server";
import Schema from "./class/schema";
import Controller from "./class/controller";
import Service from "./class/service";
import Piece from "./class/piece";
import Pipe from "./class/pipe";
import Middleware from "./class/middleware";
import joi from "joi";

/**
 * Create an instance server core
 * @param port Port server
 * @param workdir Workdir to load controllers/services/schemas
 * @returns Server instance
 */
function createServer(config: IServerConfig) {
    return new Server(config);
}

/**
 * Create a schema structure
 * @param schema Schema structure
 * @returns Schema instance
 */
function createSchema(schema: ISchema): ISchemaConstructor {

    // Extract a copy of  schema
    const schemaInfo: ISchema = {
        ...schema
    };
    
    // Return a schema constructor
    return class extends Schema {

        // Initialize the schema
        constructor(server: Server) {
            super(server);
            
            // Append schema validation
            for(const key in schemaInfo) {
                // Schema method instance
                this[key as keyof ISchema] = schemaInfo[key as keyof ISchema];
            }
        }
        
    }
}

/**
 * Export Utils
 */
export {
    // Server Core
    Server,
    // Controller class
    Controller,
    // Service class
    Service,
    // Piece class
    Piece,
    // Pipe class
    Pipe,
    // Middleware
    Middleware,
    // Create server
    createServer,
    // Create schema
    createSchema,
    // Schema
    Schema,
    // Joi
    joi,

    // Schema
    type ISchema,
    // Server Config
    type IServerConfig,
    // Method
    type IMethod,
    // Schema Request
    type ISchemaRequest,
    // Request Handler
    type IRequestHandler,
    // Error Request Handler
    type IErrorRequestHandler,
    // Application
    type IApplication,
    // Middleware Error
    type IMiddlewareError,
    // Middeware Handler
    type IMiddlewareHandler
};