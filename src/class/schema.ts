import { ISchema, ISchemaRequest } from "../types/types";

/**
 * Schema validation
 */
export default class Schema implements ISchema {

    /**
     * Schema validation to method 'GET'
     */
    public GET?: ISchemaRequest;

    /**
     * Schema validation to method 'POST'
     */
    public POST?: ISchemaRequest;

    /**
     * Schema validation to method 'PUT'
     */
    public PUT?: ISchemaRequest;

    /**
     * Schema validation to method 'DELETE'
     */
    public DELETE?: ISchemaRequest;

    /**
     * Schema validation to method 'PATCH'
     */
    public PATCH?: ISchemaRequest;

    /**
     * Schema validation to method 'HEAD'
     */
    public HEAD?: ISchemaRequest;

    /**
     * Schema validation to method 'OPTIONS'
     */
    public OPTIONS?: ISchemaRequest;
    
}