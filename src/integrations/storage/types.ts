/** What the form stores for an uploaded file (serializable, safe for drafts). */
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type?: string;
  /** Public or signed URL, when the storage provides one. */
  url?: string;
}

export interface UploadOptions {
  /** Report progress as a percentage (0-100). */
  onProgress: (percent: number) => void;
  /** Aborted when the user cancels or removes the file. */
  signal: AbortSignal;
}

/**
 * Where files go. The library never holds credentials: an adapter calls your
 * backend or a provider with whatever it needs. Implement this interface to
 * plug in any service.
 */
export interface StorageAdapter {
  id: string;
  upload: (file: File, options: UploadOptions) => Promise<UploadedFile>;
  /** Called when the user removes an already uploaded file. */
  remove?: (file: UploadedFile) => Promise<void>;
}

export type StorageMap = Record<string, StorageAdapter>;

/** Accepts one adapter (used as the default) or a map keyed by field `storage`. */
export const normalizeStorage = (
  storage: StorageAdapter | StorageMap | undefined,
): StorageMap => {
  if (!storage) return {};
  return typeof (storage as StorageAdapter).upload === 'function'
    ? { default: storage as StorageAdapter }
    : (storage as StorageMap);
};
