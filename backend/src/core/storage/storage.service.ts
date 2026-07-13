import { LocalObjectStorage } from "./localObjectStorage";
import { ObjectStorage } from "./objectStorage";

const localStorage = new LocalObjectStorage(process.cwd());

/** Current runtime storage. S3-compatible deployments inject an ObjectStorage
 * implementation at composition time; domain services only use object keys. */
export const storageService: ObjectStorage = localStorage;
