import { Service } from "../../src";
import DbService from "./db.service";

export default class DownloadService extends Service {
    
    db = this.$(DbService);
    
}