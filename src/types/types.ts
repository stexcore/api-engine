import type { ObjectSchema } from "joi";

/**
 * Methods HTTP
 */
export type IMethod = 
    | "GET"
    | "POST"
    | "PATCH"
    | "PUT"
    | "HEAD"
    | "OPTIONS"
    | "DELETE";

/**
 * Segment Path
 */
export type ISegment = 
    | { type: "dynamic", param: string }
    | { type: "static", segment: string };

/**
 * Server config
 */
export interface IServerConfig {
    /**
     * Server Port
     */
    port: number,
    /**
     * Workdir to work
     */
    workdir: string
}

/**
 * Schema request incomming
 */
export interface ISchemaRequest {

    /**
     * Schema validation to incomming params. This params is received when the path
     * has a segment params. Sample path:
     * 
     * ```javascript
     * "/segment/:id_segment"
     * ```
     * 
     * The params value incomming will be:
     * 
     * ```javascript
     * { id_segment: "any value" }
     * ```
     */
    params?: ObjectSchema,

    /**
     * Body schema. This body is received into body request incomming
     */
    body?: ObjectSchema,

    /**
     * Headers schema. This headers is received into headers request incomming
     */
    headers?: ObjectSchema,

    /**
     * Query schema. This query is received into searchParams by path. Sample path:
     * 
     * ```javascript
     * "/api?search=username"
     * ```
     * 
     * The query value incomming will be:
     * 
     * ```javascript
     * { search: "username" }
     * ```
     */
    query?: ObjectSchema
}

/**
 * Schema validation
 */
export interface ISchema {

    /**
     * Schema validation to method 'GET'
     */
    GET?: ISchemaRequest;

    /**
     * Schema validation to method 'POST'
     */
    POST?: ISchemaRequest;

    /**
     * Schema validation to method 'PUT'
     */
    PUT?: ISchemaRequest;

    /**
     * Schema validation to method 'DELETE'
     */
    DELETE?: ISchemaRequest;

    /**
     * Schema validation to method 'PATCH'
     */
    PATCH?: ISchemaRequest;

    /**
     * Schema validation to method 'HEAD'
     */
    HEAD?: ISchemaRequest;

    /**
     * Schema validation to method 'OPTIONS'
     */
    OPTIONS?: ISchemaRequest;
    
}

/**
 * Segment item
 */
export interface ISegmentFile {
    /**
     * Is a dynamic segment
     */
    dynamic: boolean,
    /**
     * Segment name
     */
    name: string,
}

/**
 * Route file info
 */
export interface IRouteFile {
    /**
     * relative path
     */
    relative: string,
    /**
     * absolute path
     */
    absolute: string,
    /**
     * Filename
     */
    filename: string,
    /**
     * Mimetype
     */
    mimetype: string,
    /**
     * Length of bytes
     */
    bytes: number
    /**
     * flat representation of the segments
     */
    flat_segments: string,
    /**
     * Flattened representation of segments compatible with Express
     */
    flat_segments_express: string,
    /**
     * List of each of the segment fragments
     */
    segments: ISegmentFile[]
}

/**
 * Tree info
 */
export interface ITree {
    /**
     * Base path
     */
    base: string,
    /**
     * All files founded
     */
    paths: IRouteFile[],
}