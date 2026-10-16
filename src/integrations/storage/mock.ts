import type { StorageAdapter } from './types';

/** In-memory adapter for demos and tests: simulates progress, stores nothing. */
export const mockStorage = ({
  delay = 600,
  fail = (_file: File) => false,
}: {
  delay?: number;
  fail?: (file: File) => boolean;
} = {}): StorageAdapter => ({
  id: 'mock',
  upload: (file, { onProgress, signal }) =>
    new Promise((resolve, reject) => {
      let percent = 0;
      const tick = setInterval(() => {
        percent = Math.min(100, percent + 25);
        onProgress(percent);
        if (percent < 100) return;
        clearInterval(tick);
        if (fail(file)) return reject(new Error('Mock upload failed'));
        resolve({
          id: `mock-${file.name}-${file.size}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : undefined,
        });
      }, delay / 4);
      signal.addEventListener('abort', () => {
        clearInterval(tick);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }),
});
