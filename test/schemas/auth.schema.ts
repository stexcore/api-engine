import Schema from "../../src/class/schema";
import { ISchemaRequest } from "../../src/types/types";

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