import type { StorageAdapter, UploadedFile } from './types';
import { xhrSend } from './xhr';

export interface CloudinaryOptions {
  cloudName: string;
  /** Unsigned uploads: name of an unsigned upload preset. */
  uploadPreset?: string;
  /**
   * Signed uploads: your backend signs the given params and returns
   * `{ signature, apiKey, timestamp }`. Never ship the API secret.
   */
  getSignature?: (
    params: Record<string, string>,
  ) => Promise<{ signature: string; apiKey: string; timestamp: number }>;
  folder?: string;
  remove?: (file: UploadedFile) => Promise<void>;
}

export const cloudinary = ({
  cloudName,
  uploadPreset,
  getSignature,
  folder,
  remove,
}: CloudinaryOptions): StorageAdapter => ({
  id: 'cloudinary',
  remove,
  upload: async (file, { onProgress, signal }) => {
    const form = new FormData();
    form.append('file', file);
    const params: Record<string, string> = {};
    if (folder) params.folder = folder;
    if (uploadPreset) params.upload_preset = uploadPreset;
    if (getSignature) {
      const signed = await getSignature(params);
      form.append('api_key', signed.apiKey);
      form.append('timestamp', String(signed.timestamp));
      form.append('signature', signed.signature);
    }
    for (const [k, v] of Object.entries(params)) form.append(k, v);
    const xhr = await xhrSend(
      'POST',
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      form,
      { onProgress, signal },
    );
    let res: { public_id?: unknown; secure_url?: unknown; bytes?: unknown };
    try {
      res = JSON.parse(xhr.responseText);
    } catch {
      throw new Error('Cloudinary returned an invalid response');
    }
    if (
      typeof res?.public_id !== 'string' ||
      typeof res.secure_url !== 'string'
    )
      throw new Error('Cloudinary returned an invalid response');
    return {
      id: res.public_id,
      name: file.name,
      size: typeof res.bytes === 'number' ? res.bytes : file.size,
      type: file.type,
      url: res.secure_url,
    };
  },
});
