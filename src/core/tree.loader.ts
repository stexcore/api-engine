import { IRouteFile, ITree } from "../types/types";
import path from "path";
import Loader from "../class/loader";
import fs from "fs";
import mime from "mime-types";

/**
 * Tree loader
 */
export default class TreeLoader extends Loader<ITree> {
    
    /**
     * Load tree information to directory info
     * @param nomenclature Name nomenclature (example controller, service, middleware.. used to find files similar to: file.<nomenclature>.ts)
     * @param tree Tree information
     * @returns Tree information
     */
    public async load(nomenclature: string = "tree", mode: "tree" | "compact" = "tree"): Promise<ITree> {
        switch(mode) {
            case "tree":
                return this.loadTree(nomenclature, this.server.workdir);

            case "compact":
                return this.loadFlat(nomenclature, this.server.workdir);

            default:
                throw new Error("Unknow type to load resources");
        }
    }

    /**
     * Load tree info using the method 'tree'
     * @param nomenclature Nomenclature
     * @param dir_base Directory base
     * @param segments Segments loaded
     * @returns Tree info
     */
    private async loadTree(nomenclature: string, dir_base: string, segments: string[] = []): Promise<ITree> {
        // Get current dir
        const dir = path.join(dir_base, ...segments);
        // Get list files to current dir
        const files = fs.readdirSync(dir);
        // Paths loaded
        const paths: IRouteFile[] = [];

        // Traverse array
        for(const filename of files) {
            // Get file dir
            const fileDir = path.join(dir, filename);
            // Get info file
            const stat = fs.statSync(fileDir);
            // relative directory
            const relativeDir = fileDir.replace(dir_base, "").replace(/^\//, "");

            if(stat.isDirectory()) {
                // Get subtree
                const subTree = await this.loadTree(nomenclature, fileDir, [...segments, filename]);

                // Set paths
                paths.push(...subTree.paths);
            }
            else {
                const regexp = new RegExp(".*\\." + nomenclature + ".[ts|js]");

                if(regexp.test(filename)) {
                    // Append file access
                    paths.push({
                        absolute: fileDir,
                        relative: relativeDir,
                        filename: filename,
                        bytes: stat.size,
                        segments: segments.map((segmentItem) => ({
                            name: segmentItem,
                            dynamic: segmentItem.startsWith("[") && segmentItem.endsWith("]")
                        })),
                        mimetype: mime.lookup(fileDir) || "application/octet-stream"
                    });
                }
                else throw new Error("❌ The " + nomenclature + " '" + relativeDir + "' is'nt allowed!");
            }
        }

        // Result
        return { base: dir, paths: paths };
    }

    /**
     * Load tree info using the method 'flat'
     * @param nomenclature Nomenclature
     * @param dir_base Directory base
     * @returns Tree info
     */
    private async loadFlat(nomenclature: string, dir_base: string): Promise<ITree> {
        // Get current dir
        const dir = path.join(dir_base);
        // Get list files to current dir
        const files = fs.readdirSync(dir);
        // Paths loaded
        const paths: IRouteFile[] = [];

        // Traverse array
        for(const fileItem of files) {
            // Get file dir
            const fileDir = path.join(dir, fileItem);
            // Get info file
            const stat = fs.statSync(fileDir);
            // relative directory
            const relativeDir = fileDir.replace(dir_base, "").replace(/^\//, "");
            // Filename
            const filename = path.basename(fileDir);

            if(stat.isDirectory()) {
                throw new Error("❌ The directories is'nt allowed in flat mode! Unexpected directory '" + relativeDir +"'");
            }

            else {
                const regexp = new RegExp(".*\\." + nomenclature + ".[ts|js]");

                if(regexp.test(filename)) {
                    const regexp_remove_nomenclature = new RegExp(nomenclature + ".[ts|js]$");
                    const filename_without_nomenclature = filename.replace(regexp_remove_nomenclature, "");

                    // Append segments
                    const segments = filename_without_nomenclature.split(".");

                    // Append file access
                    paths.push({
                        absolute: fileDir,
                        relative: relativeDir,
                        filename: filename,
                        bytes: stat.size,
                        segments: segments.map((segmentItem) => ({
                            name: segmentItem,
                            dynamic: segmentItem.startsWith("[") && segmentItem.endsWith("]")
                        })),
                        mimetype: mime.lookup(fileDir) || "application/octet-stream"
                    });
                }
                else throw new Error("❌ The " + nomenclature + " '" + relativeDir + "' is'nt allowed!");
            }
        }

        // Result
        return { base: dir, paths: paths };
    }
    
}