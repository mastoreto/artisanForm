import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtisanForm from '../components/ArtisanForm/ArtisanForm';
import type { FormSchema } from '../components/ArtisanForm/types';
import { mercadoPago } from './mercadopago';

afterEach(cleanup);

const initMercadoPago = mock((_k: string, _o?: unknown) => {});
let initialization: unknown;
mock.module('@mercadopago/sdk-react', () => ({
  initMercadoPago,
  Payment: (props: {
    initialization: unknown;
    onSubmit: (p: { formData: unknown }) => Promise<void>;
  }) => {
    initialization = props.initialization;
    return (
      <button
        type="button"
        onClick={() => props.onSubmit({ formData: { token: 'tok_1' } })}
      >
        brick pay
      </button>
    );
  },
}));

const scheme: FormSchema = {
  steps: [
    { title: 'Plan', fields: [{ type: 'text', name: 'plan', label: 'Plan' }] },
    { title: 'Pago', kind: 'payment', provider: 'mercadopago' },
    { title: 'Fin', kind: 'result', message: 'Pagado' },
  ],
};

const pay = async (
  createPayment: () => Promise<{
    status: string;
    id?: number;
    message?: string;
  }>,
) => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={onSubmit}
      plugins={{
        payments: [
          mercadoPago({
            publicKey: 'TEST-1',
            createPayment,
            brick: { amount: (v) => (v.plan === 'pro' ? 100 : 10) },
          }),
        ],
      }}
      initialValues={{ plan: 'pro' }}
    />,
  );
  await user.click(screen.getByText('Siguiente'));
  await user.click(await screen.findByText('brick pay'));
  return onSubmit;
};

test('embedded: the Payment Brick posts formData to your backend; approved succeeds', async () => {
  const createPayment = mock(async (_r: unknown, _f: unknown) => ({
    status: 'approved',
    id: 99,
  }));
  const onSubmit = await pay(createPayment as never);
  expect(await screen.findByText('Pagado')).toBeTruthy();
  expect(initMercadoPago).toHaveBeenCalledWith('TEST-1', expect.anything());
  expect(initialization).toMatchObject({ amount: 100 });
  expect(createPayment.mock.calls[0][1]).toEqual({ token: 'tok_1' });
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { provider: 'mercadopago', status: 'succeeded', reference: '99' },
  });
});

test('embedded: in_process moves on as processing; rejected shows an error', async () => {
  const onSubmit = await pay(async () => ({ status: 'in_process', id: 5 }));
  expect(await screen.findByText('Pagado')).toBeTruthy();
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { status: 'processing' },
  });

  cleanup();
  await pay(async () => ({
    status: 'rejected',
    message: 'cc_rejected_insufficient_amount',
  }));
  expect(
    await screen.findByText('cc_rejected_insufficient_amount'),
  ).toBeTruthy();
});

test('redirect: start passes marked back_urls; resume maps the real MP status', async () => {
  const createPreference = mock(async (_r: unknown, _u: unknown) => ({
    url: 'https://mp/init',
  }));
  const plugin = mercadoPago({
    publicKey: 'k',
    mode: 'redirect',
    createPreference,
  });
  const out = await plugin.start?.({
    values: {},
    idempotencyKey: 'k',
    returnUrl: 'https://app.test/co',
    cancelUrl: 'https://app.test/co',
    signal: new AbortController().signal,
  });
  expect(out?.url).toBe('https://mp/init');
  const urls = createPreference.mock.calls[0][1] as {
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
  };
  expect(urls.successUrl).toBe('https://app.test/co?mp_status=success');
  expect(urls.failureUrl).toBe('https://app.test/co?mp_status=failure');
  expect(urls.pendingUrl).toBe('https://app.test/co?mp_status=pending');

  const read = (q: string) => plugin.resume?.(new URLSearchParams(q));
  expect(read('mp_status=success&status=approved&payment_id=7')).toEqual({
    status: 'succeeded',
    reference: '7',
  });
  expect(read('mp_status=pending&status=in_process&payment_id=8')).toEqual({
    status: 'processing',
    reference: '8',
  });
  expect(read('mp_status=failure&status=rejected')).toMatchObject({
    status: 'failed',
  });
  // a tampered marker cannot turn a rejected payment into a success
  expect(read('mp_status=success&status=rejected')).toMatchObject({
    status: 'failed',
  });
  expect(read('foo=1')).toBeNull();
});
