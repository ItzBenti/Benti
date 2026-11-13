import { Manifest, ManifestStore } from '@contentauth/c2pa-types';
import { WorkerManager } from './worker/workerManager.js';
import { Settings } from './settings.js';
export declare const MAX_SIZE_IN_BYTES: number;
/**
 * A collection of functions that permit the creation of Reader objects from various sources.
 */
export interface ReaderFactory {
    /**
     * Create a {@link Reader} from an asset's format and a blob of its bytes.
     *
     * @param format Asset format.
     * @param blob Blob of asset bytes.
     * @param settings Optional context settings for the reader. Will override any values inherited by the top-level settings passed to createC2pa.
     * @returns A {@link Reader} object or null if no C2PA metadata was found.
     */
    fromBlob: (format: string, blob: Blob, settings?: Settings) => Promise<Reader | null>;
    /**
     *
     * @param format Asset format.
     * @param init Blob of initial fragment bytes.
     * @param fragment Blob of fragment bytes.
     * @param settings Optional context settings for the reader. Will override any values inherited by the top-level settings passed to createC2pa.
     * @returns A {@link Reader} object or null if no C2PA metadata was found.
     */
    fromBlobFragment: (format: string, init: Blob, fragment: Blob, settings?: Settings) => Promise<Reader | null>;
}
/**
 * Exposes methods for reading C2PA data out of an asset.
 *
 * @example Getting an asset's active manifest:
 * ```
 * const reader = await c2pa.reader.fromBlob(blob.type, blob);
 *
 * const activeManifest = await reader.activeManfiest();
 * ```
 */
export interface Reader {
    /**
     * @returns The label of the active manifest.
     */
    activeLabel: () => Promise<string | null>;
    /**
     * @returns The asset's full {@link ManifestStore} containing all its manifests, validation statuses, and the URI of the active manifest.
     */
    manifestStore: () => Promise<ManifestStore>;
    /**
     * @returns The asset's active {@link Manifest}.
     */
    activeManifest: () => Promise<Manifest>;
    /**
     * @returns The asset's full {@link ManifestStore}.
     *
     * @deprecated Use {@link manifestStore} instead.
     */
    json: () => Promise<any>;
    /**
     * @returns The asset's manifest store as crJSON.
     */
    crJson: () => Promise<any>;
    /**
     * Resolves a URI reference to a binary object (e.g. a thumbnail) in the resource store.
     *
     * @param uri URI of the binary object to resolve.
     * @returns A Uint8Array of the resource's bytes.
     *
     * @example Retrieving a thumbnail from the resource store:
     * ```
     * const reader = await c2pa.reader.fromBlob(blob.type, blob);
     *
     * const activeManifest = await reader.activeManifest();
     *
     * const thumbnailBuffer = await reader.resourceToBytes(activeManifest.thumbnail!.identifier);
     * ```
     */
    resourceToBytes: (uri: string) => Promise<Uint8Array<ArrayBuffer>>;
    /**
     * Dispose of this Reader, freeing the memory it occupied and preventing further use. Call this whenever the Reader is no longer needed.
     */
    free: () => Promise<void>;
}
/**
 * @param worker - Worker (via WorkerManager) to be associated with this reader factory.
 * @param settings - Optional settings to be used for all readers.
 * @returns A {@link ReaderFactory} object containing reader creation methods.
 */
export declare function createReaderFactory(worker: WorkerManager, settings?: Settings): ReaderFactory;
//# sourceMappingURL=reader.d.ts.map