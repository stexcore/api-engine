import { Service } from "../../src";
import DbService from "./db.service";

/**
 * Auth service
 */
export default class AuthService extends Service {
    
    /**
     * Load dependency service
     */
    db = this.$(DbService); // This is a circular reference

    /**
     * Try to authenticated using a unknow token
     * @param token Token to auth
     */
    public auth(token: unknown) {

        // Validate token
        return token === "admin";
    }
    
}