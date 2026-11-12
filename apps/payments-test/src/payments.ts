import { type PaymentPlugin, polling } from 'artisanform';
import { lemonSqueezy } from 'artisanform/payments/lemonsqueezy';
import { mercadoPago } from 'artisanform/payments/mercadopago';
import { paypal } from 'artisanform/payments/paypal';
import { stripe } from 'artisanform/payments/stripe';
import { createElement, type ReactNode, useEffect } from 'react';
import { api, type Config } from './api';

/**
 * Tells the page which method the user picked, so the test-data panel can show
 * only that one: an embedded method reports while its UI is mounted, a redirect
 * one when its checkout is requested (and forgets it if that fails).
 */
type OnActive = (id: string | null) => void;

const Active = ({
  id,
  onActive,
  children,
}: {
  id: string;
  onActive: OnActive;
  children?: ReactNode;
}) => {
  useEffect(() => {
    onActive(id);
    return () => onActive(null);
  }, [id, onActive]);
  return children;
};

const track = (plugin: PaymentPlugin, onActive?: OnActive): PaymentPlugin => {
  if (!onActive) return plugin;
  const { render, start } = plugin;
  return {
    ...plugin,
    render:
      render &&
      ((props) =>
        createElement(Active, { id: plugin.id, onActive }, render(props))),
    start:
      start &&
      (async (request) => {
        onActive(plugin.id);
        try {
          return await start(request);
        } catch (e) {
          onActive(null);
          throw e;
        }
      }),
  };
};

export const buildPlugins = (
  cfg: Config,
  onActive?: OnActive,
): PaymentPlugin[] => {
  const out: PaymentPlugin[] = [];
  if (cfg.stripe) {
    const { publishableKey } = cfg.stripe;
    out.push(
      stripe({
        publishableKey,
        createPaymentIntent: (r) => api('/stripe/payment-intent', r),
      }),
      stripe({
        id: 'stripe-checkout',
        name: 'Stripe Checkout',
        publishableKey,
        mode: 'redirect',
        createCheckoutSession: (r, urls) =>
          api('/stripe/checkout-session', { ...r, ...urls }),
      }),
    );
  }
  if (cfg.paypal)
    out.push(
      paypal({
        clientId: cfg.paypal.clientId,
        currency: cfg.paypal.currency,
        createOrder: (r) => api('/paypal/orders', r),
        captureOrder: (r, orderId) =>
          api(`/paypal/orders/${orderId}/capture`, r),
      }),
    );
  if (cfg.mercadopago)
    out.push(
      mercadoPago({
        publicKey: cfg.mercadopago.publicKey,
        brick: {
          // Display only: the backend decides what is charged.
          amount: (values) => (values.plan === 'team' ? 25 : 10),
          // Creates a preference so the brick offers the MP account login.
          preferenceId: async (r, urls) =>
            (
              await api<{ id: string }>('/mercadopago/preference', {
                ...r,
                ...urls,
              })
            ).id,
          customization: {
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              mercadoPago: 'all',
            },
          },
        },
        createPayment: (r, formData) =>
          api('/mercadopago/payment', { ...r, formData }),
      }),
      mercadoPago({
        id: 'mercadopago-checkout',
        name: 'Mercado Pago Checkout Pro',
        publicKey: cfg.mercadopago.publicKey,
        mode: 'redirect',
        createPreference: (r, urls) =>
          api('/mercadopago/preference', { ...r, ...urls }),
      }),
    );
  if (cfg.lemonsqueezy)
    out.push(
      lemonSqueezy({
        createCheckout: (r, urls) =>
          api('/lemonsqueezy/checkout', { ...r, ...urls }),
      }),
    );
  return out.map((p) => track(p, onActive));
};

// Asks OUR backend, which asks the provider: the return URL proves nothing.
export const confirmation = polling(
  async ({ values }) => {
    const payment = values.payment as
      | { provider: string; reference?: string }
      | undefined;
    if (!payment) return { status: 'failed', message: 'No payment recorded' };
    const provider = payment.provider.split('-')[0];
    const query = payment.reference
      ? `ref=${encodeURIComponent(payment.reference)}`
      : `email=${encodeURIComponent(String(values.email ?? ''))}`;
    return api(`/${provider}/status?${query}`);
  },
  { interval: 2000, timeout: 180_000 },
);
