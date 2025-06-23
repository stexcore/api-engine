import type { ISchema, IServerConfig } from "./types/types";
import Server from "./server";
import Schema from "./class/schema";
import Controller from "./class/controller";
import Service from "./class/service";
import Piece from "./class/piece";
import Pipe from "./class/pipe";

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
    // Create server
    createServer,
    // Create schema
    createSchema,
};