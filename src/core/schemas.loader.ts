import path from "path";
import Schema from "../class/schema";
import TreeLoader from "./tree.loader";
import type { ILoadedModule, IMethod, ISchemaConstructor, ISchemaRequest } from "../types/types";
import ModuleLoader from "../class/module.loader";
import { methods } from "../constants/method.constant";
import Joi from "joi";

/**
 * Schema loader
 */
export default class SchemasLoader extends ModuleLoader<Schema> {

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
    public async load(): Promise<ILoadedModule<Schema>[]> {

        // Load tree info
        const tree = await this.treeLoader.load(this.schemas_dir, "schema", this.server.mode);

        // Loaded schemas
        const schemasLoaded: ILoadedModule<Schema>[] = [];
        
        // Import all files
        await Promise.all(
            tree.paths.map(async (schemaFileItem) => {
                try {
                    // Load module schema
                    const moduleSchema = await import(schemaFileItem.absolute);

                    // Validate schema valid
                    if(moduleSchema?.default?.prototype instanceof Schema) {
                        try {
                            // Set property
                            Object.defineProperty(moduleSchema.default, "name", {
                                writable: true,
                                value: schemaFileItem.relative
                            });

                            const schemaInstance = new moduleSchema.default(this.server);
                            const methods_loaded: IMethod[] = [];

                            for(const method in methods) {

                                if(method in schemaInstance) {
                                    const methodSchemaInstance = schemaInstance[method] as ISchemaRequest;

                                    if(methodSchemaInstance && typeof methodSchemaInstance === "object") {
                                        if(
                                            Joi.isSchema(methodSchemaInstance.body) ||
                                            Joi.isSchema(methodSchemaInstance.headers) ||
                                            Joi.isSchema(methodSchemaInstance.params) ||
                                            Joi.isSchema(methodSchemaInstance.query)
                                        ) {
                                            methods_loaded.push(method as IMethod);
                                        }
                                        else {
                                            schemasLoaded.push({
                                                status: "missing-joi-schemas",
                                                method: method as IMethod,
                                                route: schemaFileItem
                                            });
                                        }
                                    }
                                    else if(typeof methodSchemaInstance !== "undefined") {
                                        schemasLoaded.push({
                                            status: "invalid-type-schema-request",
                                            type_received: typeof methodSchemaInstance,
                                            method: method as IMethod,
                                            route: schemaFileItem
                                        });
                                    }
                                    else delete schemaInstance[method];
                                }
                            }

                            if(methods_loaded.length) {
                                schemasLoaded.push({
                                    status: "loaded",
                                    module: schemaInstance,
                                    route: schemaFileItem
                                });
                            }
                            else {
                                schemasLoaded.push({
                                    status: "missing-some-member-declaration",
                                    route: schemaFileItem
                                });
                            }
                        }
                        catch(err) {
                            // Append schema founded
                            schemasLoaded.push({
                                status: "constructor-error",
                                route: schemaFileItem,
                                error: err
                            });
                        }
                    }
                    else if (!moduleSchema.default || (moduleSchema.default instanceof Object && !Object.keys(moduleSchema.default).length)) {
                        // Append missing default export
                        schemasLoaded.push({
                            status: "missing-default-export",
                            route: schemaFileItem,
                        });
                        // console.log(`⚠️  The schema '${schemaFileItem.relative}' is missing a default export of a class that extends the base Schema class from @stexcore/api-engine.`);
                    } else {
                        // Append not extends valid class
                        schemasLoaded.push({
                            status: "not-extends-valid-class",
                            route: schemaFileItem,
                        });
                        // console.log(`⚠️  The schema '${schemaFileItem.relative}' does not extend the base Schema class from @stexcore/api-engine.`);
                    }
                }
                catch(err) {
                    // Append failed inport
                    schemasLoaded.push({
                        status: "failed-import",
                        route: schemaFileItem,
                        error: err
                    });
                    // throw new Error(`❌ Failed to load schema: '${schemaFileItem.relative}'`);
                }
            })
        );

        return schemasLoaded;
    }

}