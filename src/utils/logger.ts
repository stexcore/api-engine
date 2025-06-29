// Importa la extensión de String de la librería 'colors' para colorear texto en consola
import "colors";

// Tipos posibles de módulos que se pueden registrar como parte del sistema
type IModule = 
    | "middleware"
    | "schema"
    | "catch-error"
    | "pipe";

// Clase responsable de imprimir logs estilizados durante la carga del servidor
export default new class Logger {

    /**
     * Imprime un mensaje de éxito (color verde)
     */
    public ok(...messages: string[]) {
        console.log("[OK]".green, ...messages);
    }

    /**
     * Imprime una advertencia (color amarillo)
     */
    public warm(...messages: string[]) {
        console.log("[WARM]".yellow, ...messages);
    }

    /**
     * Imprime un mensaje de error (color rojo)
     */
    public error(...messages: string[]) {
        console.log("[ERROR]".red, ...messages);
    }

    /**
     * Imprime el resultado de carga de un recurso asociado a una ruta
     * @param path Ruta o identificador del recurso cargado
     * @param moduleLoaded Tipos de módulos cargados exitosamente en esa ruta
     * @param miliseconds Tiempo tomado en cargar esa ruta o grupo de módulos
     */
    public loaded(path: string, moduleLoaded: IModule[], miliseconds: number) {
        // Conjunto único de tipos cargados (para evitar duplicados)
        const modules = new Set<IModule>(moduleLoaded);
        
        // Imprime la línea resumen con formato fijo para la ruta
        this.ok(
            path.padEnd(80, " "), "→", // Rellena a 80 caracteres para alinear las columnas
            ...[
                ...(modules.has("pipe") ? ["pipe".green] : []),
                ...(modules.has("schema") ? ["schema".cyan] : []),
                ...(modules.has("middleware") ? ["middleware".magenta] : []),
                ...(modules.has("catch-error") ? ["catch-error".red] : []),
            ],
            `(${miliseconds}ms)` // Tiempo total en milisegundos
        );
    }
    
}
