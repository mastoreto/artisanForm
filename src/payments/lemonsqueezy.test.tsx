import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtisanForm from '../components/ArtisanForm/ArtisanForm';
import type { FormSchema } from '../components/ArtisanForm/types';
import { lemonSqueezy } from './lemonsqueezy';

afterEach(() => {
  cleanup();
  const w = window as unknown as Record<string, unknown>;
  w.createLemonSqueezy = undefined;
  w.LemonSqueezy = undefined;
});

const scheme: FormSchema = {
  steps: [
    { title: 'Plan', fields: [{ type: 'text', name: 'plan', label: 'Plan' }] },
    { title: 'Pago', kind: 'payment', provider: 'lemonsqueezy' },
    { title: 'Fin', kind: 'result', message: 'Pagado' },
  ],
};

test('redirect: your backend returns the checkout URL; the redirect URL is passed along', async () => {
  const user = userEvent.setup();
  const navigate = mock((_: string) => {});
  const createCheckout = mock(
    async (_r: unknown, _u: { redirectUrl: string }) => ({
      url: 'https://store.lemonsqueezy.com/checkout/buy/abc',
    }),
  );
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={() => {}}
      plugins={{ payments: [lemonSqueezy({ createCheckout })], navigate }}
    />,
  );
  await user.click(screen.getByText('Siguiente'));
  await user.click(await screen.findByText('Pagar con Lemon Squeezy'));
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  expect(navigate.mock.calls[0][0]).toBe(
    'https://store.lemonsqueezy.com/checkout/buy/abc',
  );
  expect(createCheckout.mock.calls[0][1].redirectUrl).toContain(
    'lemon_status=success',
  );
});

test('resume: the success redirect finishes the step', () => {
  const { resume } = lemonSqueezy({
    createCheckout: async () => ({ url: '' }),
  });
  expect(resume?.(new URLSearchParams('lemon_status=success'))).toEqual({
    status: 'succeeded',
  });
  expect(resume?.(new URLSearchParams('x=1'))).toBeNull();
});

test('overlay: loads lemon.js, opens the checkout and reports Checkout.Success', async () => {
  const user = userEvent.setup();
  let handler: (e: { event: string; data?: unknown }) => void = () => {};
  const open = mock((_: string) => {});
  const w = window as unknown as Record<string, unknown>;
  w.createLemonSqueezy = () => {};
  w.LemonSqueezy = {
    Setup: (c: { eventHandler: typeof handler }) => {
      handler = c.eventHandler;
    },
    Url: { Open: open },
  };
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={onSubmit}
      plugins={{
        payments: [
          lemonSqueezy({
            mode: 'overlay',
            createCheckout: async () => ({ url: 'https://store/checkout/1' }),
          }),
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Siguiente'));
  await user.click(await screen.findByText('Pagar'));
  expect(open).toHaveBeenCalledWith('https://store/checkout/1');

  handler({
    event: 'Checkout.Success',
    data: { order: { data: { id: 'ord_7' } } },
  });
  expect(await screen.findByText('Pagado')).toBeTruthy();
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    payment: {
      provider: 'lemonsqueezy',
      status: 'succeeded',
      reference: 'ord_7',
    },
  });
});
