import type { ISchema, IServerConfig, IMethod, ISchemaRequest, IRequestHandler, IErrorRequestHandler, IApplication, IMiddlewareError, IMiddewareHandler } from "./types/types";
import Server from "./server/server";
import Schema from "./class/schema";
import Controller from "./class/controller";
import Service from "./class/service";
import Piece from "./class/piece";
import Pipe from "./class/pipe";
import Middleware from "./class/middleware";

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
function createSchema(schema: ISchema) {
    const schemaInstance = new Schema();

    // Append schema validation
    for(const key in schema) {
        // Schema method instance
        schemaInstance[key as keyof ISchema] = schema[key as keyof ISchema];
    }

    return schemaInstance;
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
    type IMiddewareHandler
};