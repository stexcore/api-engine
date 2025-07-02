import { IMiddewareHandler } from "../../../src";
import Pipe from "../../../src/class/pipe";

export default class AuthPipe extends Pipe {
    
    public handler: IMiddewareHandler = (req, res, next) => {
        try {
            // Next middleware
            setTimeout(() => {
                next();
            }, 1000);
        }
        catch(err) {
            next(err);
        }
    }
    
}