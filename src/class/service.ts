import Piece from "./piece";

/**
 * Service instance
 */
export default class Service extends Piece {

    /**
     * Initialize service operation. (It's called when the server is initialized)
     */
    public initialize?(): void;

    /**
     * Destroy service operation. (It's called when the server is destroying)
     */
    public destroy?(): void;
    
}