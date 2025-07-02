import { ISchemaRequest, Schema } from "../../../src";


export default class AuthSchema extends Schema {
    
    /**
     * Validation schema into method POST
     */
    public GET?: ISchemaRequest = {
        /**
         * Headers validation
         */
        query: this.joi.object({
            /**
             * Field authorization validation
             */
            authorization: this.joi.string().required()
        })
    }
    
}