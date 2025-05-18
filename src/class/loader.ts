import Piece from "./piece";

/**
 * Loader class, used to load resources
 */
export default abstract class Loader<T> extends Piece {
    
    /**
     * Method to load resource
     */
    public abstract load(): Promise<T>;
    
}