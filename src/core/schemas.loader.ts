import path from "path";
import fs from "fs";
import Loader from "../class/loader";
import Schema from "../class/schema";
import TreeLoader from "./tree.loader";
import Server from "../server/server";

export default class SchemasLoader extends Loader<Schema[]> {

    /**
     * Schemas Directory
     */
    private schemas_dir = path.join(this.server.workdir, "schemas");
    
    /**
     * Tree loader
     */
    private treeLoader = new TreeLoader(this.server);
    
    /**
     * Load schemas
     * @returns Schemas loaded
     */
    public async load(): Promise<Schema[]> {

        // Load tree info
        const tree = await this.treeLoader.load(this.schemas_dir, "schema", "compact");

        // Load constructors
        const schemasConstructors: (new (server: Server) => Schema)[] = [];
        
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
                        schemasConstructors.push(schema);
                    }
                    else console.log("⚠️  Invalid schema:   /" + schemaFileItem.filename)
                }
                catch(err) {
                    console.log(err);
                    throw new Error("❌ Failed to load schema:    /" + schemaFileItem.filename);
                }
            })
        );

        // Create schemas
        const schemasLoaded: Schema[] = schemasConstructors.map((schemaConstructorItem) => (
            new schemaConstructorItem(this.server)
        ));

        return schemasLoaded;
    }

}