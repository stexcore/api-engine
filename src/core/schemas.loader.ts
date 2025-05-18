import path from "path";
import fs from "fs";
import Loader from "../class/loader";
import Schema from "../class/schema";

export default class SchemasLoader extends Loader<Schema[]> {

    private schemas_dir = path.join(this.server.workdir, "schemas");
    
    /**
     * Load schemas
     * @returns Schemas loaded
     */
    public async load(): Promise<Schema[]> {
        // Read schemas files
        const schemasFiles = fs.readdirSync(this.schemas_dir);
        // Schemas loaded
        const schemasLoaded: Schema[] = [];

        // Traverse schemas
        for(const schemaFileItem of schemasFiles) {
            // Get schemas name
            const schemaName = schemaFileItem.slice(0, -3);
            // path schema
            const pathSchema = "/" + schemaName.slice(0, -7).split(".").join("/");

            // Validate nomenclature declaration
            if(schemaFileItem.endsWith("schema.ts") || schemaFileItem.endsWith("schema.js")) {
                try {
                    // Import module
                    const moduleItem = await import(path.join(this.schemas_dir, schemaFileItem));

                    if(moduleItem.default instanceof Schema) {
                        // schema instance
                        const schemaItem = moduleItem.default;

                        // Append schema loaded
                        // this.schemasLoaded.push({
                        //     path: pathSchema,
                        //     schema: schemaItem
                        // });

                        // Append schema loaded
                        schemasLoaded.push(schemaItem);
                        
                        // Log schema loaded!
                        console.log("✅ Schema loaded:     " + pathSchema);
                    }
                }
                catch(e) {
                    console.log(e);
                    console.log("❌ Failed to load the schema     " + pathSchema);
                }
            }
        }

        // schemas loaded
        return schemasLoaded;
    }

}