import { Service } from "../../src";
import AuthService from "./auth.service";
import DbService from "./db.service";
import DownloadService from "./download.service";

/**
 * Info service
 */
export default class InfoService extends Service {
    
    /**
     * Download service
     */
    download = this.$(DownloadService);

    /**
     * Auth service
     */
    auth = this.$(AuthService);

    /**
     * Db service
     */
    db = this.$(DbService);
    
}