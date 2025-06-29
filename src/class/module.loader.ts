import Loader from "./loader";
import type { ILoadedModule } from "../types/types";

export default abstract class ModuleLoader<T> extends Loader<ILoadedModule<T>[]> { }