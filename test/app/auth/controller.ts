import { Controller, IRequestHandler } from "../../../src";

/**
 * Authentication segment
 */
export default class AuthController extends Controller {

    /**
     * Handle authentication user
     * @param req Request incomming
     * @param res Response utils
     * @param next Next middleware
     */
    public GET?: IRequestHandler = (req, res, next) => {
        try {
            res.json({
                success: true,
                message: "Ok",
                data: {
                    token: "12345678"
                }
            });
        }
        catch(err) {
            next(err);
        }
    }
    
}