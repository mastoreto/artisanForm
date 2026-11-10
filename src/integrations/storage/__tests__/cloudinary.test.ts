import { afterEach, expect, test } from 'bun:test';
import { cloudinary } from '../cloudinary';

const realXhr = globalThis.XMLHttpRequest;
afterEach(() => {
  globalThis.XMLHttpRequest = realXhr;
});

// Minimal XHR that answers 200 with the given body.
const respondWith = (responseText: string) => {
  class FakeXhr {
    status = 200;
    responseText = responseText;
    upload = {} as { onprogress?: unknown };
    onload: (() => void) | null = null;
    open() {}
    setRequestHeader() {}
    abort() {}
    send() {
      queueMicrotask(() => this.onload?.());
    }
  }
  globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
};

const upload = (text: string) => {
  respondWith(text);
  return cloudinary({ cloudName: 'demo', uploadPreset: 'p' }).upload(
    new File(['x'], 'a.png', { type: 'image/png' }),
    { onProgress: () => {}, signal: new AbortController().signal },
  );
};

test('maps a valid response', async () => {
  const f = await upload(
    JSON.stringify({ public_id: 'id1', secure_url: 'https://c/x', bytes: 7 }),
  );
  expect(f).toMatchObject({ id: 'id1', url: 'https://c/x', size: 7 });
});

test('a non-JSON or malformed response is a clear upload error', async () => {
  for (const bad of ['<html>', '{}', '{"public_id":1,"secure_url":"u"}'])
    await expect(upload(bad)).rejects.toThrow('invalid response');
});
