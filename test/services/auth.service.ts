import { Service } from "../../src";
import DbService from "./db.service";

export default class AuthService extends Service {
    
    db = this.$(DbService);
}