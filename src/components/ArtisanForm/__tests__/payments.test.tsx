import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockPayment } from '../../../integrations/payments/mock';
import type {
  PaymentPlugin,
  PaymentRequest,
} from '../../../integrations/payments/types';
import type { FormSchema } from '../../../schema/legacy/types';
import ArtisanForm from '../ArtisanForm';

// happy-dom: navigate the fake window.
const setUrl = (path: string) =>
  (
    window as unknown as { happyDOM: { setURL: (u: string) => void } }
  ).happyDOM.setURL(`http://localhost${path}`);

afterEach(() => {
  cleanup();
  setUrl('/');
});

const scheme = (payment: Record<string, unknown> = { provider: 'mock' }) =>
  ({
    steps: [
      {
        title: 'Plan',
        fields: [{ type: 'text', name: 'plan', label: 'Plan' }],
      },
      { title: 'Payment', kind: 'payment', ...payment },
      { title: 'End', kind: 'result', message: 'Paid' },
    ],
  }) as FormSchema;

test('embedded plugin: succeeds, stores the payment record and submits it', async () => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={scheme()}
      onSubmit={onSubmit}
      plugins={{ payments: [mockPayment({ delay: 10 })] }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('Pay (mock)'));
  expect(await screen.findByText('Paid')).toBeTruthy();
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { provider: 'mock', status: 'succeeded', reference: 'mock_ref_1' },
  });
});

test('a rejected payment can be retried with a fresh idempotency key', async () => {
  const user = userEvent.setup();
  const keys: string[] = [];
  let attempt = 0;
  const plugin: PaymentPlugin = {
    id: 'custom',
    name: 'Custom',
    mode: 'embedded',
    render: ({ request, onResult }) => (
      <button
        type="button"
        onClick={() => {
          keys.push(request.idempotencyKey);
          attempt++;
          onResult(
            attempt === 1
              ? { status: 'failed', message: 'Card declined' }
              : { status: 'succeeded', reference: 'ok' },
          );
        }}
      >
        pay custom
      </button>
    ),
  };
  render(
    <ArtisanForm
      scheme={scheme({ provider: 'custom' })}
      onSubmit={() => {}}
      plugins={{ payments: [plugin] }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('pay custom'));
  expect(await screen.findByText('Card declined')).toBeTruthy();
  await user.click(screen.getByText('Retry'));
  await user.click(await screen.findByText('pay custom'));
  expect(await screen.findByText('Paid')).toBeTruthy();
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
});

test('several providers: the user picks one; unknown provider shows a notice', async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={scheme({ providers: ['a', 'b'] })}
      onSubmit={() => {}}
      plugins={{
        payments: [
          mockPayment({ id: 'a', delay: 1 }),
          mockPayment({ id: 'b', delay: 1 }),
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  expect(await screen.findAllByText('Pay with Mock')).toHaveLength(2);

  cleanup();
  render(
    <ArtisanForm scheme={scheme({ provider: 'nope' })} onSubmit={() => {}} />,
  );
  await user.click(screen.getByText('Next'));
  expect(
    await screen.findByText('No payment method is configured for this step'),
  ).toBeTruthy();
});

test('redirect plugin: sends the user to the checkout URL', async () => {
  const user = userEvent.setup();
  const navigate = mock((_: string) => {});
  const start = mock(async (r: PaymentRequest) => ({
    url: `https://pay.example/checkout?back=${encodeURIComponent(r.returnUrl)}`,
  }));
  const plugin: PaymentPlugin = {
    id: 'hosted',
    name: 'Hosted',
    mode: 'redirect',
    start,
  };
  render(
    <ArtisanForm
      scheme={scheme({ provider: 'hosted' })}
      onSubmit={() => {}}
      plugins={{ payments: [plugin], navigate }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('Pay with Hosted'));
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  expect(navigate.mock.calls[0][0]).toContain('https://pay.example/checkout');
  expect(start.mock.calls[0][0].idempotencyKey).toBeTruthy();
});

test('redirect plugin: resumes on return, cleans the URL and advances', async () => {
  localStorage.clear();
  const onSubmit = mock((_: unknown) => {});
  // The user left from the payment step; the draft brings the wizard back to it.
  localStorage.setItem(
    'artisanform:pay',
    JSON.stringify({ values: { plan: 'pro' }, step: 1 }),
  );
  setUrl('/?mock_payment_mock=succeeded&keep=1');
  render(
    <ArtisanForm
      scheme={scheme()}
      onSubmit={onSubmit}
      persistKey="pay"
      plugins={{ payments: [mockPayment({ mode: 'redirect' })] }}
    />,
  );
  expect(await screen.findByText('Paid')).toBeTruthy();
  expect(window.location.search).toBe('?keep=1');
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    plan: 'pro',
    payment: { status: 'succeeded' },
  });
});

test('a "processing" result moves on so a pending step can confirm it', async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={scheme()}
      onSubmit={() => {}}
      plugins={{ payments: [mockPayment({ outcome: 'processing', delay: 5 })] }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('Pay (mock)'));
  expect(await screen.findByText('Paid')).toBeTruthy();
});

test('after a failure the user can switch to another payment method', async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={scheme({ providers: ['bad', 'good'] })}
      onSubmit={() => {}}
      plugins={{
        payments: [
          mockPayment({ id: 'bad', name: 'Bad', outcome: 'failed', delay: 1 }),
          mockPayment({ id: 'good', name: 'Good', delay: 1 }),
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('Pay with Bad'));
  await user.click(await screen.findByText('Pay (mock)'));
  await user.click(await screen.findByText('Choose another payment method'));
  await user.click(await screen.findByText('Pay with Good'));
  await user.click(await screen.findByText('Pay (mock)'));
  expect(await screen.findByText('Paid')).toBeTruthy();
});
