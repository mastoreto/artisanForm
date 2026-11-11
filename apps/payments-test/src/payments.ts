import { type PaymentPlugin, polling } from 'artisanform';
import { lemonSqueezy } from 'artisanform/payments/lemonsqueezy';
import { mercadoPago } from 'artisanform/payments/mercadopago';
import { paypal } from 'artisanform/payments/paypal';
import { stripe } from 'artisanform/payments/stripe';
import { api, type Config } from './api';

// Test credentials to use in each sandbox.
export const hints: Record<string, string> = {
  stripe:
    'Card 4242 4242 4242 4242, any future date and CVC (3DS: 4000 0027 6000 3184)',
  paypal: 'A sandbox personal account from the PayPal developer dashboard',
  mercadopago:
    'Test card 5031 7557 3453 0604, 11/30, CVV 123, name APRO, CI 1.234.567-2, e-mail like buyer1@example.com (not @testuser.com, not your own MP account)',
  lemonsqueezy:
    'Test mode card 4242 4242 4242 4242; needs a webhook to the public URL',
};

export const buildPlugins = (cfg: Config): PaymentPlugin[] => {
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
  return out;
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
