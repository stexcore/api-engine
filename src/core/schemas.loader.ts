import path from "path";
import Loader from "../class/loader";
import Schema from "../class/schema";
import TreeLoader from "./tree.loader";
import type Server from "../server/server";
import type { IRouteFile } from "../types/types";

/**
 * Schema loader
 */
export default class SchemasLoader extends Loader<{ schema: Schema, route: IRouteFile }[]> {

    /**
     * Schemas Directory
     */
    private schemas_dir = path.join(this.server.workdir, this.server.isCompact ? "schemas" : "app");
    
    /**
     * Tree loader
     */
    private treeLoader = new TreeLoader(this.server);
    
    /**
     * Load schemas
     * @returns Schemas loaded
     */
    public async load(): Promise<{ schema: Schema, route: IRouteFile }[]> {

        // Load tree info
        const tree = await this.treeLoader.load(this.schemas_dir, "schema", this.server.mode);

        // Load constructors
        const schemasConstructors: {
            constructor: (new (server: Server) => Schema),
            route: IRouteFile
        }[] = [];
        
        // Import all files
        await Promise.all(
            tree.paths.map(async (schemaFileItem) => {
                try {
                    // Load module schema
                    const moduleSchema = await import(schemaFileItem.absolute);

                    let schema: (new (server: Server) => Schema) | undefined;

                    // Validate schema valid
                    if(moduleSchema.default?.prototype instanceof Schema) {
                        Object.defineProperty(moduleSchema.default, "name", {
                            writable: true
                        });
                        moduleSchema.default.name = schemaFileItem.filename;
                        schema = moduleSchema.default;
                    }

                    if(schema) {
                        // Append schema founded
                        schemasConstructors.push({
                            constructor: schema,
                            route: schemaFileItem
                        });
                    }
                    else if (!moduleSchema.default || (moduleSchema.default instanceof Object && !Object.keys(moduleSchema.default).length)) {
                        console.log(`⚠️  The schema '${schemaFileItem.relative}' is missing a default export of a class that extends the base Schema class from @stexcore/api-engine.`);
                    } else {
                        console.log(`⚠️  The schema '${schemaFileItem.relative}' does not extend the base Schema class from @stexcore/api-engine.`);
                    }
                }
                catch(err) {
                    console.log(err);
                    throw new Error(`❌ Failed to load schema: '${schemaFileItem.relative}'`);
                }
            })
        );

        // Create schemas
        const schemasLoaded: {
            schema: Schema,
            route: IRouteFile
        }[] = schemasConstructors.map((schemaConstructorItem) => ({
            route: schemaConstructorItem.route,
            schema: new schemaConstructorItem.constructor(this.server)
        }));

        return schemasLoaded;
    }

}