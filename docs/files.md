# Files and storage

> 🌐 Spanish version: [es/files.md](es/files.md)

`file` and `image` fields upload each file **as soon as it is chosen** and keep a small, serializable descriptor in the form, never the `File` itself. Where the bytes go is decided by a `StorageAdapter` you provide.

## The principle

The library **never holds storage credentials**. Your backend signs the upload (or you use an unsigned, restricted preset) and the browser sends the file straight to the storage service.

> Checking type and size in the browser is UX only. Your server must validate the real MIME type and size, and scan the files, before trusting them.

## The field

```ts
{ type: 'file', name: 'dni', label: 'ID (PDF)', accept: 'application/pdf', maxSize: 2 * 1024 * 1024, required: true }
{ type: 'image', name: 'photos', label: 'Photos', maxFiles: 3, helperText: 'Up to 3 images' }
```

| Prop | Meaning |
| --- | --- |
| `accept` | Accepted types, as in `<input accept>` |
| `maxSize` | Maximum size per file, in bytes |
| `maxFiles` | `1` (default) replaces the file; a higher number allows several |
| `minFiles` | Minimum number of files, for validation |
| `capture` | Asks mobile browsers to open the camera |
| `storage` | Key of the adapter to use, when you pass several |

The user gets drag and drop, previews for images, a progress bar, cancel, retry and remove. The **Next** button waits until every upload has finished, and a failed upload shows its error with a *Retry* button.

What the form stores (and what `onSubmit` receives) is a descriptor:

```ts
{ id: string; name: string; size: number; type?: string; url?: string }
```

It is plain JSON, so it is safe in drafts (`persistKey`) and in a payload to your API.

## Choosing where files go

Pass one adapter, or a map of adapters and pick one per field with `storage: 'key'`:

```tsx
import { ArtisanForm, presignedPut, cloudinary } from 'artisanform';

const s3 = presignedPut({
  getUploadUrl: async (file) => {
    const r = await fetch('/api/upload-url', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, type: file.type }),
    });
    return r.json(); // { url, headers?, method?, fileUrl?, id? }
  },
});

const cl = cloudinary({ cloudName: 'demo', uploadPreset: 'my_unsigned_preset' });

<ArtisanForm scheme={scheme} storage={{ default: s3, images: cl }} onSubmit={save} />;
```

### `presignedPut`: S3, R2, Backblaze B2, MinIO…

Works with any S3-compatible store. Your `getUploadUrl(file)` asks **your backend** for a pre-signed URL; the backend keeps the credentials and returns:

| Field | Required | Meaning |
| --- | --- | --- |
| `url` | yes | Pre-signed URL the browser uploads to |
| `method` | no | `PUT` (default) or `POST` |
| `headers` | no | Headers the signature requires, such as `Content-Type` |
| `fileUrl` | no | Final readable URL of the object, if there is one |
| `id` | no | Your identifier for the object (defaults to the key or URL) |

Pass `remove(file)` to delete from storage through your backend when the user removes a file.

### `cloudinary`

`cloudinary({ cloudName, uploadPreset })` uses an unsigned preset, or a signature from your backend with `getSignature`. Restrict an unsigned preset in Cloudinary (formats, size, folder), because anyone with the preset name can upload.

### Your own adapter

Any object with this shape works for another service:

```ts
interface StorageAdapter {
  id: string;
  upload(file: File, opts: { onProgress(percent: number): void; signal: AbortSignal }): Promise<UploadedFile>;
  remove?(file: UploadedFile): Promise<void>;
}
```

Report progress from 0 to 100 with `onProgress`, and stop when `signal` aborts (the user cancelled or removed the file).

## Testing

`mockStorage({ delay, fail })` simulates uploads for demos, stories and tests: it reports progress, stores nothing, and fails for the files your `fail(file)` returns `true` for. In end-to-end tests, a paused clock (`page.clock`) keeps an upload "in progress" so a test can check the blocking state without racing the timer.
