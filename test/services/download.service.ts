import { Service } from "../../src";
import DbService from "./db.service";

/**
 * Download service
 */
export default class DownloadService extends Service {
    
    /**
     * Load dependency service
     */
    db = this.$(DbService);
    
}