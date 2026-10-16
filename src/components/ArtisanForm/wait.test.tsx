import { afterEach, expect, mock, test } from 'bun:test';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { callback, polling, sse, type WaitStrategy } from '../../wait';
import ArtisanForm from './ArtisanForm';
import type { FormSchema } from './types';

afterEach(cleanup);

const scheme = (wait: WaitStrategy, extra: Record<string, unknown> = {}) =>
  ({
    steps: [
      { title: 'Form', fields: [{ type: 'text', name: 'a', label: 'A' }] },
      { title: 'Esperando', kind: 'pending', wait, ...extra },
      { title: 'Hecho', kind: 'custom', render: () => <p>fin</p> },
    ],
  }) as FormSchema;

const toWaiting = async (wait: WaitStrategy, extra = {}) => {
  const user = userEvent.setup();
  render(<ArtisanForm scheme={scheme(wait, extra)} onSubmit={() => {}} />);
  await user.click(screen.getByText('Siguiente'));
  await screen.findByRole('heading', { name: 'Esperando' });
  return user;
};

test('polling advances on success and shows progress messages meanwhile', async () => {
  let calls = 0;
  await toWaiting(
    polling(
      async () => {
        calls++;
        return calls < 3
          ? { status: 'pending', message: `intento ${calls}` }
          : { status: 'success' };
      },
      { interval: 20 },
    ),
  );
  expect(await screen.findByText('intento 1')).toBeTruthy();
  expect(await screen.findByText('fin')).toBeTruthy();
  expect(calls).toBe(3);
});

test('failure offers retry and back; retry subscribes again', async () => {
  let attempt = 0;
  const user = await toWaiting(
    polling(
      async () => {
        attempt++;
        return attempt === 1
          ? { status: 'failed', message: 'Pago rechazado' }
          : { status: 'success' };
      },
      { interval: 10 },
    ),
  );
  expect(await screen.findByText('Pago rechazado')).toBeTruthy();
  await user.click(screen.getByText('Reintentar'));
  expect(await screen.findByText('fin')).toBeTruthy();
  expect(attempt).toBe(2);
});

test('failure "back" returns to the previous step (or failTo)', async () => {
  const user = await toWaiting(
    polling(async () => ({ status: 'failed' }), { interval: 10 }),
  );
  await user.click(await screen.findByText('Volver al formulario'));
  expect(await screen.findByRole('heading', { name: 'Form' })).toBeTruthy();
});

test('callback strategy: resolve(data) stores it under resultName and advances', async () => {
  const cb = callback();
  const onSubmit = mock((_: unknown) => {});
  const user = userEvent.setup();
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      scheme={{
        steps: [
          { title: 'Form', fields: [{ type: 'text', name: 'a', label: 'A' }] },
          {
            title: 'Esperando',
            kind: 'pending',
            wait: cb.strategy,
            resultName: 'orderId',
          },
          { title: 'Final', fields: [{ type: 'text', name: 'b', label: 'B' }] },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Siguiente'));
  await screen.findByRole('heading', { name: 'Esperando' });
  expect(screen.getByText('Esperando confirmación…')).toBeTruthy();
  act(() => cb.resolve('ord_1'));
  await screen.findByRole('heading', { name: 'Final' });
  await user.click(screen.getByText('Finalizar'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ orderId: 'ord_1' });
});

test('polling gives up after the timeout', async () => {
  await toWaiting(
    polling(async () => ({ status: 'pending' }), {
      interval: 10,
      timeout: 60,
      timeoutMessage: 'Tardó demasiado',
    }),
  );
  expect(await screen.findByText('Tardó demasiado')).toBeTruthy();
});

test('sse strategy reads JSON statuses from an EventSource', async () => {
  class FakeEventSource {
    static last: FakeEventSource;
    onmessage?: (e: { data: string }) => void;
    onerror?: () => void;
    closed = false;
    constructor(public url: string) {
      FakeEventSource.last = this;
    }
    close() {
      this.closed = true;
    }
  }
  const real = globalThis.EventSource;
  globalThis.EventSource = FakeEventSource as never;
  try {
    await toWaiting(sse((v) => `/events?a=${v.a}`));
    expect(FakeEventSource.last.url).toBe('/events?a=');
    act(() =>
      FakeEventSource.last.onmessage?.({
        data: '{"status":"pending","message":"procesando"}',
      }),
    );
    expect(await screen.findByText('procesando')).toBeTruthy();
    act(() =>
      FakeEventSource.last.onmessage?.({ data: '{"status":"success"}' }),
    );
    expect(await screen.findByText('fin')).toBeTruthy();
    expect(FakeEventSource.last.closed).toBe(true);
  } finally {
    globalThis.EventSource = real;
  }
});
