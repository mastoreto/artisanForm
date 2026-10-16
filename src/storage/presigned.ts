import type { StorageAdapter, UploadedFile } from './types';
import { xhrSend } from './xhr';

export interface PresignedTarget {
  /** Pre-signed URL the browser uploads to. */
  url: string;
  method?: 'PUT' | 'POST';
  /** Headers the signature requires (e.g. Content-Type). */
  headers?: Record<string, string>;
  /** Final public/readable URL of the object, if any. */
  fileUrl?: string;
  /** Your identifier for the object (defaults to the key/URL). */
  id?: string;
}

export interface PresignedOptions {
  /**
   * Ask YOUR backend for a pre-signed upload URL. Works with any
   * S3-compatible store: AWS S3, Cloudflare R2, Backblaze B2, MinIO…
   * The backend keeps the credentials; the browser never sees them.
   */
  getUploadUrl: (file: File) => Promise<PresignedTarget>;
  /** Optional: delete from storage via your backend. */
  remove?: (file: UploadedFile) => Promise<void>;
  id?: string;
}

export const presignedPut = ({
  getUploadUrl,
  remove,
  id = 'presigned',
}: PresignedOptions): StorageAdapter => ({
  id,
  remove,
  upload: async (file, { onProgress, signal }) => {
    const target = await getUploadUrl(file);
    await xhrSend(target.method ?? 'PUT', target.url, file, {
      headers: target.headers,
      onProgress,
      signal,
    });
    return {
      id: target.id ?? target.fileUrl ?? target.url.split('?')[0],
      name: file.name,
      size: file.size,
      type: file.type,
      url: target.fileUrl,
    };
  },
});
