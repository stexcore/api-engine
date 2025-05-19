import Middleware, { IMiddewareHandler } from "../../src/class/middleware";

export default class AuthMiddleware extends Middleware {

    public handler: IMiddewareHandler = (req, res, next) => {
        try {
            
        }
        catch(err) {
            next(err);
        }
    };
    
}