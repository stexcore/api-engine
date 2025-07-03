import type { ILoadedModule, IMethod } from "../types/types";
import Controller from "../class/controller";
import path from "path";
import TreeLoader from "./tree.loader";
import LoaderModule from "../class/module.loader";
import classUtil from "../utils/class";
import { methods } from "../constants/method.constant";

/**
 * Controllers loader
 */
export default class ControllersLoader extends LoaderModule<Controller> {

    /**
     * Load controllers
     */
    private controllers_dir = path.join(this.server.workdir, this.server.isCompact ? "controllers" : "app");

    /**
     * Tree loader
     */
    private treeLoader = new TreeLoader(this.server);


    /**
     * Load controllers
     * @returns controllers loaded
     */
    public async load(): Promise<ILoadedModule<Controller>[]> {

        // Time to init load
        const initTime = Date.now();
        // Load tree info
        const tree = await this.treeLoader.load(this.controllers_dir, "controller", this.server.mode);

        // controllers loaded
        const controllersLoaded: ILoadedModule<Controller>[] = [];

        // Imports all files
        await Promise.all(
            tree.paths.map(async (controllerFileItem) => {
                try {
                    // Load module controller
                    const moduleController = await import(controllerFileItem.absolute);

                    // Validate controller valid
                    if (moduleController?.default?.prototype instanceof Controller) {
                        // Set property
                        Object.defineProperty(moduleController.default, "name", {
                            writable: true,
                            value: controllerFileItem.relative
                        });

                        try {
                            const controllerInstance = new moduleController.default(this.server);
                            const methodsLoaded: IMethod[] = [];
                            
                            for (const method in methods) {
                                const handlerItem = controllerInstance[method as IMethod];

                                if (handlerItem) {
                                    if (typeof handlerItem === 'function') {
                                        if (handlerItem.length > 3) {
                                            controllersLoaded.push({
                                                status: "too-many-parameters-request-handler",
                                                keyname: method as IMethod,
                                                route: controllerFileItem
                                            });
                                            return;
                                        }
                                        else {
                                            methodsLoaded.push(method as IMethod);
                                        }
                                    }
                                    else {
                                        controllersLoaded.push({
                                            status: "invalid-function-request-handler",
                                            keyname: method as IMethod,
                                            route: controllerFileItem,
                                        });
                                        return;
                                    }
                                }
                            }
                            
                            if (methodsLoaded.length) {
                                // Try to create a new instance
                                controllersLoaded.push({
                                    status: "loaded",
                                    module: controllerInstance,
                                    route: controllerFileItem,
                                    loadTimeMs: Date.now() - initTime
                                });
                            }
                            else {
                                controllersLoaded.push({
                                    status: "missing-some-member-declaration",
                                    route: controllerFileItem
                                });
                            }
                        }
                        catch (err) {
                            // Append status constructor-error
                            controllersLoaded.push({
                                status: "constructor-error",
                                route: controllerFileItem,
                                error: err,
                            });
                        }
                    }
                    else if (typeof moduleController.default === "undefined" || (typeof moduleController.default === "object" && !Object.keys(moduleController.default).length) && !classUtil.isClass(moduleController.default)) {
                        controllersLoaded.push({
                            status: "missing-default-export",
                            route: controllerFileItem
                        });
                        // console.log(`⚠️  The controller '${controllerFileItem.relative}' is missing a default export of a class that extends the base Controller class from @stexcore/api-engine.`);
                    } else {
                        controllersLoaded.push({
                            status: "not-extends-valid-class",
                            route: controllerFileItem
                        });
                        // console.log(`⚠️  The controller '${controllerFileItem.relative}' does not extend the base Controller class from @stexcore/api-engine.`);
                    }
                }
                catch (err) {
                    controllersLoaded.push({
                        status: "failed-import",
                        route: controllerFileItem,
                        error: err
                    });
                    // throw new Error(`❌ Failed to load controller: '${controllerFileItem.relative}'`);
                }
            })
        );

        return controllersLoaded;
    }

}