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
    // the return URL is forgeable, so it never produces "succeeded"
    payment: { status: 'processing' },
  });
});

// Two plugins of one provider that read the same return parameters.
const sharing = (id: string): PaymentPlugin => ({
  id,
  name: id.toUpperCase(),
  mode: 'redirect',
  resumeKeys: ['ret'],
  start: async () => ({ url: `https://pay.example/${id}` }),
  resume: (params) =>
    params.get('ret') === 'ok' ? { status: 'processing', reference: id } : null,
});

const draft = () => {
  localStorage.clear();
  localStorage.setItem(
    'artisanform:pay',
    JSON.stringify({ values: { plan: 'pro' }, step: 1 }),
  );
};

test('on return, the plugin the user left with answers, not the first one that can', async () => {
  sessionStorage.clear();
  draft();
  const user = userEvent.setup();
  const navigate = mock((_: string) => {});
  const plugins = { payments: [sharing('a'), sharing('b')], navigate };
  // 1) the user picks the SECOND plugin and is sent away
  setUrl('/');
  const first = render(
    <ArtisanForm
      scheme={scheme({ providers: ['a', 'b'] })}
      onSubmit={() => {}}
      persistKey="pay"
      plugins={plugins}
    />,
  );
  await user.click(await screen.findByText('Pay with B'));
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  first.unmount();

  // 2) they come back: both plugins can read `?ret=ok`
  setUrl('/?ret=ok');
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={scheme({ providers: ['a', 'b'] })}
      onSubmit={onSubmit}
      persistKey="pay"
      plugins={plugins}
    />,
  );
  expect(await screen.findByText('Paid')).toBeTruthy();
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { provider: 'b', reference: 'b' },
  });
  expect(
    sessionStorage.getItem('artisanform:payment-plugin:payment'),
  ).toBeNull();
});

test('without that memory the first registered plugin answers (the old behavior)', async () => {
  sessionStorage.clear();
  draft();
  setUrl('/?ret=ok');
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={scheme({ providers: ['a', 'b'] })}
      onSubmit={onSubmit}
      persistKey="pay"
      plugins={{ payments: [sharing('a'), sharing('b')] }}
    />,
  );
  expect(await screen.findByText('Paid')).toBeTruthy();
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { provider: 'a' },
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

test('the core downgrades a custom plugin that reports "succeeded" from the return URL', async () => {
  localStorage.clear();
  const onSubmit = mock((_: unknown) => {});
  localStorage.setItem(
    'artisanform:pay-custom',
    JSON.stringify({ values: { plan: 'pro' }, step: 1 }),
  );
  setUrl('/?paid=1');
  const naive: PaymentPlugin = {
    id: 'naive',
    name: 'Naive',
    mode: 'redirect',
    resumeKeys: ['paid'],
    start: async () => ({ url: 'https://pay.example' }),
    // a plugin that trusts the query string
    resume: (params) =>
      params.get('paid') ? { status: 'succeeded', reference: 'r1' } : null,
  };
  render(
    <ArtisanForm
      scheme={scheme({ provider: 'naive' })}
      onSubmit={onSubmit}
      persistKey="pay-custom"
      plugins={{ payments: [naive] }}
    />,
  );
  expect(await screen.findByText('Paid')).toBeTruthy();
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { provider: 'naive', status: 'processing', reference: 'r1' },
  });
});

test('the request signal is aborted when the payment step unmounts', async () => {
  const user = userEvent.setup();
  let signal: AbortSignal | undefined;
  const plugin: PaymentPlugin = {
    id: 'slow',
    name: 'Slow',
    mode: 'redirect',
    start: (request: PaymentRequest) => {
      signal = request.signal;
      return new Promise(() => {}); // never resolves
    },
  };
  const view = render(
    <ArtisanForm
      scheme={scheme({ provider: 'slow' })}
      onSubmit={() => {}}
      plugins={{ payments: [plugin] }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('Pay with Slow'));
  await waitFor(() => expect(signal).toBeTruthy());
  expect(signal?.aborted).toBe(false);
  view.unmount();
  expect(signal?.aborted).toBe(true);
});

// ---- the method selector: logo, name and a hint per method ----

const method = (over: Partial<PaymentPlugin> = {}): PaymentPlugin => ({
  id: 'm',
  name: 'Method',
  mode: 'embedded',
  render: () => null,
  ...over,
});

const choose = async (plugins: PaymentPlugin[], labels = {}) => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={scheme({ providers: plugins.map((p) => p.id) })}
      onSubmit={() => {}}
      labels={labels}
      plugins={{ payments: plugins }}
    />,
  );
  await user.click(screen.getByText('Next'));
};

test('each method is a button named after the method, with its hint as the description', async () => {
  await choose([
    method({ id: 'a', name: 'A' }),
    method({
      id: 'b',
      name: 'B',
      mode: 'redirect',
      start: async () => ({ url: 'x' }),
    }),
  ]);
  const a = await screen.findByRole('button', { name: 'Pay with A' });
  expect(a.getAttribute('aria-describedby')).toBeTruthy();
  expect(a.textContent).toContain('Pay on this page');
  expect(
    screen.getByRole('button', { name: 'Pay with B' }).textContent,
  ).toContain('You will be redirected');
});

test('a plugin can set its own description, and labels can change the default hints', async () => {
  await choose(
    [
      method({ id: 'a', name: 'A', description: 'Cards and wallets' }),
      method({ id: 'b', name: 'B' }),
    ],
    { payHintEmbedded: 'Pagá acá' },
  );
  expect(
    (await screen.findByRole('button', { name: 'Pay with A' })).textContent,
  ).toContain('Cards and wallets');
  expect(
    screen.getByRole('button', { name: 'Pay with B' }).textContent,
  ).toContain('Pagá acá');
});

test('the logo is decorative and only rendered when the plugin has one', async () => {
  await choose([
    method({ id: 'a', name: 'A', icon: <svg data-testid="logo" /> }),
    method({ id: 'b', name: 'B' }),
  ]);
  const a = await screen.findByRole('button', { name: 'Pay with A' });
  const logo = screen.getByTestId('logo');
  expect(a.contains(logo)).toBe(true);
  expect(logo.closest('[aria-hidden="true"]')).toBeTruthy();
  const b = screen.getByRole('button', { name: 'Pay with B' });
  expect(b.querySelector('svg')).toBeNull();
  // no empty logo box either (it would leave a gap)
  expect(b.querySelector('[aria-hidden="true"]')).toBeNull();
});

test('the built-in plugins ship their logo and icon: null hides it', async () => {
  const { stripe } = await import(
    '../../../integrations/payments/providers/stripe'
  );
  const { paypal } = await import(
    '../../../integrations/payments/providers/paypal'
  );
  const { mercadoPago } = await import(
    '../../../integrations/payments/providers/mercadopago'
  );
  const { lemonSqueezy } = await import(
    '../../../integrations/payments/providers/lemonsqueezy'
  );
  const make = [
    stripe({
      publishableKey: 'k',
      createPaymentIntent: async () => ({ clientSecret: 's' }),
    }),
    paypal({
      clientId: 'c',
      createOrder: async () => ({ orderId: 'o' }),
      captureOrder: async () => ({ status: 'COMPLETED' }),
    }),
    mercadoPago({
      publicKey: 'k',
      mode: 'redirect',
      createPreference: async () => ({ url: 'u' }),
    }),
    lemonSqueezy({ createCheckout: async () => ({ url: 'u' }) }),
  ];
  for (const p of make) expect(p.icon).toBeTruthy();
  expect(
    stripe({
      publishableKey: 'k',
      icon: null,
      createPaymentIntent: async () => ({ clientSecret: 's' }),
    }).icon,
  ).toBeUndefined();
  const custom = <b />;
  expect(
    stripe({
      publishableKey: 'k',
      icon: custom,
      createPaymentIntent: async () => ({ clientSecret: 's' }),
    }).icon,
  ).toBe(custom);
});

test('choosing a method still works from the card (embedded and redirect)', async () => {
  const user = userEvent.setup();
  const navigate = mock((_: string) => {});
  const hosted: PaymentPlugin = {
    id: 'h',
    name: 'Hosted',
    mode: 'redirect',
    icon: <svg />,
    start: async () => ({ url: 'https://pay.example/h' }),
  };
  render(
    <ArtisanForm
      scheme={scheme({ providers: ['h'] })}
      onSubmit={() => {}}
      plugins={{ payments: [hosted], navigate }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(
    await screen.findByRole('button', { name: 'Pay with Hosted' }),
  );
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith('https://pay.example/h'),
  );
});
