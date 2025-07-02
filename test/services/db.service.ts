import { Service } from "../../src";
import AuthService from "./auth.service";

/**
 * Db service
 */
export default class DbService extends Service { 

    /**
     * Auth service
     */
    auth = this.$(AuthService); // This is a circular reference
    
}