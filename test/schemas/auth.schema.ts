import Schema from "../../src/class/schema";
import { ISchemaRequest } from "../../src/types/types";

export default class AuthSchema extends Schema {

    /**
     * Validation schema into method POST
     */
    public POST?: ISchemaRequest = {
        /**
         * Headers validation
         */
        headers: this.joi.object({
            /**
             * Field authorization validation
             */
            authorization: this.joi.string().required()
        })
    }
    
}