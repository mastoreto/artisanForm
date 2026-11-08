import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtisanForm from '../../../components/ArtisanForm/ArtisanForm';
import type { FormSchema } from '../../../schema/legacy/types';
import { paypal } from '../providers/paypal';

afterEach(cleanup);

let scriptOptions: unknown;
mock.module('@paypal/react-paypal-js', () => ({
  PayPalScriptProvider: ({
    options,
    children,
  }: {
    options: unknown;
    children: unknown;
  }) => {
    scriptOptions = options;
    return children;
  },
  PayPalButtons: (props: {
    createOrder: () => Promise<string>;
    onApprove: (d: { orderID: string }) => Promise<void>;
    onError: (e: unknown) => void;
  }) => (
    <button
      type="button"
      onClick={async () => {
        try {
          const orderID = await props.createOrder();
          await props.onApprove({ orderID });
        } catch (e) {
          props.onError(e);
        }
      }}
    >
      paypal button
    </button>
  ),
}));

const scheme: FormSchema = {
  steps: [
    { title: 'Plan', fields: [{ type: 'text', name: 'plan', label: 'Plan' }] },
    { title: 'Payment', kind: 'payment', provider: 'paypal' },
    { title: 'End', kind: 'result', message: 'Paid' },
  ],
};

const pay = async (opts: Partial<Parameters<typeof paypal>[0]>) => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={onSubmit}
      plugins={{
        payments: [
          paypal({
            clientId: 'cid',
            currency: 'EUR',
            createOrder: async () => ({ orderId: 'ORDER-1' }),
            captureOrder: async () => ({ status: 'COMPLETED', id: 'CAP-1' }),
            ...opts,
          }),
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('paypal button'));
  return onSubmit;
};

test('creates the order and captures it on your backend; COMPLETED succeeds', async () => {
  const captureOrder = mock(async (_r: unknown, _o: string) => ({
    status: 'COMPLETED',
    id: 'CAP-1',
  }));
  const onSubmit = await pay({ captureOrder });
  expect(await screen.findByText('Paid')).toBeTruthy();
  expect(captureOrder.mock.calls[0][1]).toBe('ORDER-1');
  expect(scriptOptions).toMatchObject({
    clientId: 'cid',
    currency: 'EUR',
    intent: 'capture',
  });
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { provider: 'paypal', status: 'succeeded', reference: 'CAP-1' },
  });
});

test('PENDING moves on as processing; other statuses and errors fail', async () => {
  const onSubmit = await pay({
    captureOrder: async () => ({ status: 'PENDING' }),
  });
  expect(await screen.findByText('Paid')).toBeTruthy();
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: { status: 'processing', reference: 'ORDER-1' },
  });

  cleanup();
  await pay({
    captureOrder: async () => ({
      status: 'DECLINED',
      message: 'Instrument declined',
    }),
  });
  expect(await screen.findByText('Instrument declined')).toBeTruthy();

  cleanup();
  await pay({
    createOrder: async () => {
      throw new Error('order not created');
    },
  });
  expect(await screen.findByText('order not created')).toBeTruthy();
});
