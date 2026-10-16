import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtisanForm from '../components/ArtisanForm/ArtisanForm';
import type { FormSchema } from '../components/ArtisanForm/types';
import { stripe } from './stripe';

afterEach(cleanup);

let confirm = mock(async (_: unknown) => ({
  paymentIntent: { id: 'pi_1', status: 'succeeded' },
}));
const fakeStripe = { confirmPayment: (a: unknown) => confirm(a) };

mock.module('@stripe/stripe-js', () => ({
  loadStripe: async () => fakeStripe,
}));
mock.module('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => <div>card element</div>,
  useStripe: () => fakeStripe,
  useElements: () => ({}),
}));

const scheme: FormSchema = {
  steps: [
    { title: 'Plan', fields: [{ type: 'text', name: 'plan', label: 'Plan' }] },
    { title: 'Pago', kind: 'payment', provider: 'stripe' },
    { title: 'Fin', kind: 'result', message: 'Pagado' },
  ],
};

const run = async (
  plugin = stripe({
    publishableKey: 'pk_test_1',
    createPaymentIntent: async () => ({ clientSecret: 'cs_1' }),
  }),
) => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={onSubmit}
      plugins={{ payments: [plugin] }}
    />,
  );
  await user.click(screen.getByText('Siguiente'));
  return { user, onSubmit };
};

test('embedded: creates the intent on your backend, mounts the Payment Element and confirms', async () => {
  const createPaymentIntent = mock(async () => ({ clientSecret: 'cs_1' }));
  const { user, onSubmit } = await run(
    stripe({ publishableKey: 'pk_test_1', createPaymentIntent }),
  );
  expect(await screen.findByText('card element')).toBeTruthy();
  expect(createPaymentIntent).toHaveBeenCalledTimes(1);
  expect(
    (
      createPaymentIntent.mock.calls[0] as unknown as [
        { idempotencyKey: string },
      ]
    )[0].idempotencyKey,
  ).toBeTruthy();

  await user.click(screen.getByText('Pagar'));
  expect(await screen.findByText('Pagado')).toBeTruthy();
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { provider: 'stripe', status: 'succeeded', reference: 'pi_1' },
  });
});

test('embedded: a declined card shows the error and offers a retry', async () => {
  confirm = mock(
    async () => ({ error: { message: 'Tu tarjeta fue rechazada' } }) as never,
  );
  const { user } = await run();
  await screen.findByText('card element');
  await user.click(screen.getByText('Pagar'));
  expect(await screen.findByText('Tu tarjeta fue rechazada')).toBeTruthy();
  expect(screen.getByText('Reintentar')).toBeTruthy();
});

test('embedded: a failing backend call is reported as a failed payment', async () => {
  await run(
    stripe({
      publishableKey: 'pk_test_1',
      createPaymentIntent: async () => {
        throw new Error('backend down');
      },
    }),
  );
  expect(await screen.findByText('backend down')).toBeTruthy();
});

test('redirect: passes success/cancel URLs and returns the hosted checkout URL', async () => {
  const createCheckoutSession = mock(async () => ({
    url: 'https://checkout.stripe.com/c/1',
  }));
  const plugin = stripe({
    publishableKey: 'pk',
    mode: 'redirect',
    createCheckoutSession,
  });
  const result = await plugin.start?.({
    values: {},
    idempotencyKey: 'k',
    returnUrl: 'https://app.test/checkout?x=1',
    cancelUrl: 'https://app.test/checkout?x=1',
    signal: new AbortController().signal,
  });
  expect(result?.url).toBe('https://checkout.stripe.com/c/1');
  const urls = (
    createCheckoutSession.mock.calls[0] as unknown as [
      unknown,
      { successUrl: string; cancelUrl: string },
    ]
  )[1];
  expect(urls.successUrl).toBe(
    'https://app.test/checkout?x=1&stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
  );
  expect(urls.cancelUrl).toBe(
    'https://app.test/checkout?x=1&stripe_status=cancel',
  );
});

test('resume reads Stripe return params (Checkout and redirect-based methods)', () => {
  const { resume } = stripe({ publishableKey: 'pk' });
  const read = (q: string) => resume?.(new URLSearchParams(q));
  expect(read('stripe_status=success&session_id=cs_9')).toEqual({
    status: 'succeeded',
    reference: 'cs_9',
  });
  expect(read('stripe_status=cancel')).toEqual({ status: 'failed' });
  expect(read('payment_intent=pi_2&redirect_status=succeeded')).toEqual({
    status: 'succeeded',
    reference: 'pi_2',
  });
  expect(read('payment_intent=pi_2&redirect_status=processing')).toEqual({
    status: 'processing',
    reference: 'pi_2',
  });
  expect(read('payment_intent=pi_2&redirect_status=failed')).toEqual({
    status: 'failed',
  });
  expect(read('foo=bar')).toBeNull();
});
