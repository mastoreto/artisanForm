import { afterEach, expect, mock, test } from 'bun:test';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  callback,
  polling,
  sse,
  type WaitStrategy,
} from '../../../integrations/wait';
import type { FormSchema } from '../../../schema/legacy/types';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const scheme = (wait: WaitStrategy, extra: Record<string, unknown> = {}) =>
  ({
    steps: [
      { title: 'Form', fields: [{ type: 'text', name: 'a', label: 'A' }] },
      { title: 'Waiting', kind: 'pending', wait, ...extra },
      { title: 'Done', kind: 'custom', render: () => <p>fin</p> },
    ],
  }) as FormSchema;

const toWaiting = async (wait: WaitStrategy, extra = {}) => {
  const user = userEvent.setup();
  render(<ArtisanForm scheme={scheme(wait, extra)} onSubmit={() => {}} />);
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Waiting' });
  return user;
};

test('polling advances on success and shows progress messages meanwhile', async () => {
  let calls = 0;
  await toWaiting(
    polling(
      async () => {
        calls++;
        return calls < 3
          ? { status: 'pending', message: `attempt ${calls}` }
          : { status: 'success' };
      },
      { interval: 20 },
    ),
  );
  expect(await screen.findByText('attempt 1')).toBeTruthy();
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
          ? { status: 'failed', message: 'Payment rejected' }
          : { status: 'success' };
      },
      { interval: 10 },
    ),
  );
  expect(await screen.findByText('Payment rejected')).toBeTruthy();
  await user.click(screen.getByText('Retry'));
  expect(await screen.findByText('fin')).toBeTruthy();
  expect(attempt).toBe(2);
});

test('failure "back" returns to the previous step (or failTo)', async () => {
  const user = await toWaiting(
    polling(async () => ({ status: 'failed' }), { interval: 10 }),
  );
  await user.click(await screen.findByText('Back to the form'));
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
            title: 'Waiting',
            kind: 'pending',
            wait: cb.strategy,
            resultName: 'orderId',
          },
          { title: 'Final', fields: [{ type: 'text', name: 'b', label: 'B' }] },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Waiting' });
  expect(screen.getByText('Waiting for confirmation…')).toBeTruthy();
  act(() => cb.resolve('ord_1'));
  await screen.findByRole('heading', { name: 'Final' });
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ orderId: 'ord_1' });
});

test('polling gives up after the timeout', async () => {
  await toWaiting(
    polling(async () => ({ status: 'pending' }), {
      interval: 10,
      timeout: 60,
      timeoutMessage: 'Took too long',
    }),
  );
  expect(await screen.findByText('Took too long')).toBeTruthy();
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

test('failTo is a step id and survives a hidden step before it', async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      onSubmit={() => {}}
      extensions={{
        waits: {
          rejected: polling(async () => ({ status: 'failed' }), {
            interval: 10,
          }),
        },
      }}
      scheme={{
        schemaVersion: 1,
        id: 'f',
        steps: [
          {
            id: 'a',
            type: 'form',
            title: 'First',
            fields: [{ type: 'text', name: 'a', label: 'A' }],
          },
          {
            // Never visible: shifts the full-list indexes by one.
            id: 'hidden',
            type: 'form',
            title: 'Hidden',
            visibleWhen: { field: 'a', operator: 'eq', value: 'never-typed' },
            fields: [{ type: 'text', name: 'h', label: 'H' }],
          },
          {
            id: 'details',
            type: 'form',
            title: 'Details',
            fields: [{ type: 'text', name: 'd', label: 'D' }],
          },
          {
            id: 'wait',
            type: 'wait',
            title: 'Waiting',
            strategy: 'rejected',
            failTo: 'details',
          },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('Next'));
  await screen.findByRole('heading', { name: 'Waiting' });
  await user.click(await screen.findByText('Back to the form'));
  // "details" is index 2 in the full list but 1 among the visible steps.
  expect(await screen.findByRole('heading', { name: 'Details' })).toBeTruthy();
});

test('timeoutMs fails a wait that never settles', async () => {
  await toWaiting({ subscribe: () => () => {} }, { timeoutMs: 40 });
  expect(
    await screen.findByText('The confirmation took too long'),
  ).toBeTruthy();
});

test('retry tries again by itself before the user sees the failure', async () => {
  let calls = 0;
  await toWaiting(
    {
      subscribe: (onStatus) => {
        calls++;
        onStatus(
          calls < 3
            ? { status: 'failed', message: 'flaky' }
            : { status: 'success' },
        );
        return () => {};
      },
    },
    { retry: { max: 2, backoffMs: 1 } },
  );
  expect(await screen.findByText('fin')).toBeTruthy();
  expect(calls).toBe(3);
  expect(screen.queryByText('flaky')).toBeNull();
});

test('retry gives up after max and shows the failure; the manual Retry starts over', async () => {
  let calls = 0;
  const user = await toWaiting(
    {
      subscribe: (onStatus) => {
        calls++;
        onStatus({ status: 'failed', message: 'down' });
        return () => {};
      },
    },
    { retry: { max: 1, backoffMs: 1 } },
  );
  expect(await screen.findByText('down')).toBeTruthy();
  expect(calls).toBe(2); // first try + 1 automatic retry
  await user.click(screen.getByText('Retry'));
  await waitFor(() => expect(calls).toBe(4)); // manual retry + its automatic retry
});

test('cancellable shows Cancel, aborts the wait and goes back', async () => {
  let signal: AbortSignal | undefined;
  const user = await toWaiting(
    {
      subscribe: (_on, ctx) => {
        signal = ctx.signal;
        return () => {};
      },
    },
    { cancellable: true },
  );
  expect(signal?.aborted).toBe(false);
  await user.click(screen.getByText('Cancel'));
  expect(await screen.findByRole('heading', { name: 'Form' })).toBeTruthy();
  expect(signal?.aborted).toBe(true);
});
