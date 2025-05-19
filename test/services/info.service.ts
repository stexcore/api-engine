import { Service } from "../../src";
import AuthService from "./auth.service";
import DbService from "./db.service";
import DownloadService from "./download.service";

export default class InfoService extends Service {
    
    download = this.$(DownloadService);
    auth = this.$(AuthService);
    db = this.$(DbService);
    
}