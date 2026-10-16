/** PUT/POST a body with upload progress (fetch has no upload progress events). */
export const xhrSend = (
  method: string,
  url: string,
  body: Blob | FormData,
  {
    headers = {},
    onProgress,
    signal,
  }: {
    headers?: Record<string, string>;
    onProgress: (percent: number) => void;
    signal: AbortSignal;
  },
): Promise<XMLHttpRequest> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr)
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', () => xhr.abort(), { once: true });
    if (signal.aborted) return xhr.abort();
    xhr.send(body);
  });
