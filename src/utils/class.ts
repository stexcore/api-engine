/**
 * Utilities to classes
 */
export default new class classUtil {

    /**
     * Validate if it is class
     * @param value Value
     * @returns validate if it is class
     */
    public isClass(value: any) {
        return !!(
            value && 
            value instanceof Object && 
            typeof value === "function" &&
            value.constructor && 
            (value.toString() as string).startsWith("class")
        );
    }
    
}