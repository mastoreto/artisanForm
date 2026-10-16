import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cloudinary } from '../../../integrations/storage/cloudinary';
import { mockStorage } from '../../../integrations/storage/mock';
import { presignedPut } from '../../../integrations/storage/presigned';
import type { StorageAdapter } from '../../../integrations/storage/types';
import type { FieldSchema } from '../../../schema/legacy/types';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const doc = (name = 'cv.pdf', size = 1000, type = 'application/pdf') =>
  new File([new Uint8Array(size)], name, { type });

const setup = (
  field: Partial<FieldSchema> = {},
  storage: StorageAdapter = mockStorage({ delay: 40 }),
) => {
  const onSubmit = mock((_: unknown) => {});
  const view = render(
    <ArtisanForm
      onSubmit={onSubmit}
      storage={storage}
      scheme={{
        steps: [
          {
            title: 'Docs',
            fields: [
              { type: 'file', name: 'cv', label: 'CV', ...field },
              { type: 'text', name: 'x', label: 'X' },
            ],
          },
          { title: 'Next', fields: [{ type: 'text', name: 'y', label: 'Y' }] },
        ],
      }}
    />,
  );
  const input = view.container.querySelector(
    'input[type=file]',
  ) as HTMLInputElement;
  return { onSubmit, input, user: userEvent.setup() };
};

test('uploads a file with progress and stores its descriptor', async () => {
  const { input, user } = setup();
  await user.upload(input, doc());
  expect(await screen.findByRole('progressbar')).toBeTruthy();
  expect(await screen.findByLabelText('Quitar cv.pdf')).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
});

test('rejects wrong type and oversized files without uploading', async () => {
  const upload = mock(async () => ({ id: '1', name: 'a', size: 1 }));
  const { input } = setup(
    { accept: 'application/pdf', maxSize: 500 },
    { id: 't', upload },
  );
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(input, doc('pic.png', 100, 'image/png'));
  expect(await screen.findByText('Tipo de archivo no permitido')).toBeTruthy();
  await user.upload(input, doc('big.pdf', 2000));
  expect(await screen.findByText(/supera el máximo/)).toBeTruthy();
  expect(upload).not.toHaveBeenCalled();
});

test('blocks "Siguiente" while an upload is running, then advances', async () => {
  const { input, user } = setup({}, mockStorage({ delay: 300 }));
  await user.upload(input, doc());
  await user.click(screen.getByText('Siguiente'));
  expect(
    await screen.findByText('Esperá a que terminen de subir los archivos'),
  ).toBeTruthy();
  await screen.findByLabelText('Quitar cv.pdf');
  await user.click(screen.getByText('Siguiente'));
  expect(await screen.findByRole('heading', { name: 'Next' })).toBeTruthy();
});

test('required file blocks until uploaded; remove clears and calls storage.remove', async () => {
  const remove = mock(async () => {});
  const base = mockStorage({ delay: 20 });
  const { input, user } = setup({ required: true }, { ...base, remove });
  await user.click(screen.getByText('Siguiente'));
  expect(await screen.findByText('Campo requerido')).toBeTruthy();

  await user.upload(input, doc());
  await user.click(await screen.findByLabelText('Quitar cv.pdf'));
  await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
  expect(screen.queryByLabelText('Quitar cv.pdf')).toBeNull();
});

test('a failed upload can be retried', async () => {
  let fail = true;
  const { input, user } = setup(
    {},
    mockStorage({ delay: 20, fail: () => fail }),
  );
  await user.upload(input, doc());
  expect(await screen.findByText('Mock upload failed')).toBeTruthy();
  fail = false;
  await user.click(screen.getByLabelText('Reintentar cv.pdf'));
  expect(await screen.findByLabelText('Quitar cv.pdf')).toBeTruthy();
});

test('maxFiles > 1 accepts several files and caps the total', async () => {
  const { input, user } = setup({ maxFiles: 2 });
  await user.upload(input, [doc('a.pdf'), doc('b.pdf')]);
  await screen.findByLabelText('Quitar b.pdf');
  await user.upload(input, doc('c.pdf'));
  expect(await screen.findByText('Máximo 2 archivos')).toBeTruthy();
});

class FakeXhr {
  static last: FakeXhr;
  upload: { onprogress?: (e: unknown) => void } = {};
  status = 200;
  responseText = '{"public_id":"abc","secure_url":"https://cdn/abc","bytes":5}';
  method = '';
  url = '';
  headers: Record<string, string> = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
    FakeXhr.last = this;
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v;
  }
  send() {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    queueMicrotask(() => this.onload?.());
  }
  abort() {
    this.onabort?.();
  }
}

test('presignedPut uploads to the URL from your backend; cloudinary posts a form', async () => {
  const realXhr = globalThis.XMLHttpRequest;
  globalThis.XMLHttpRequest = FakeXhr as never;
  try {
    const progress: number[] = [];
    const signal = new AbortController().signal;
    const file = doc('a.pdf', 4);

    const adapter = presignedPut({
      getUploadUrl: async () => ({
        url: 'https://bucket.example/obj?sig=1',
        headers: { 'Content-Type': 'application/pdf' },
        fileUrl: 'https://cdn.example/obj',
      }),
    });
    const done = await adapter.upload(file, {
      signal,
      onProgress: (p) => progress.push(p),
    });
    expect(FakeXhr.last.method).toBe('PUT');
    expect(FakeXhr.last.headers['Content-Type']).toBe('application/pdf');
    expect(progress).toEqual([50]);
    expect(done).toMatchObject({
      name: 'a.pdf',
      url: 'https://cdn.example/obj',
    });

    const cl = await cloudinary({
      cloudName: 'demo',
      uploadPreset: 'unsigned',
    }).upload(file, { signal, onProgress: () => {} });
    expect(FakeXhr.last.method).toBe('POST');
    expect(FakeXhr.last.url).toContain('/demo/auto/upload');
    expect(cl).toMatchObject({ id: 'abc', url: 'https://cdn/abc' });
  } finally {
    globalThis.XMLHttpRequest = realXhr;
  }
});
