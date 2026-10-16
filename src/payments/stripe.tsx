import { useEffect, useState } from 'react';
import Loading from './Loading';
import type {
  EmbeddedRenderProps,
  PaymentPlugin,
  PaymentRequest,
  PaymentResult,
} from './types';

export interface StripeOptions {
  /** `pk_live_…` / `pk_test_…`: safe to ship to the browser. */
  publishableKey: string;
  /**
   * Embedded (Payment Element, default) or Stripe-hosted Checkout (redirect).
   */
  mode?: 'embedded' | 'redirect';
  /**
   * embedded: YOUR backend creates the PaymentIntent (it decides amount and
   * currency) and returns its client secret. Use `request.idempotencyKey`.
   */
  createPaymentIntent?: (
    request: PaymentRequest,
  ) => Promise<{ clientSecret: string }>;
  /**
   * redirect: YOUR backend creates a Checkout Session with these URLs as
   * `success_url` / `cancel_url` and returns its `url`.
   */
  createCheckoutSession?: (
    request: PaymentRequest,
    urls: { successUrl: string; cancelUrl: string },
  ) => Promise<{ url: string }>;
  /** Stripe Elements appearance API. */
  appearance?: Record<string, unknown>;
  id?: string;
  name?: string;
}

type StripeJs = typeof import('@stripe/stripe-js');
type StripeUi = typeof import('@stripe/react-stripe-js');

const message = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

const PayForm = ({
  ui,
  request,
  onResult,
  labels,
}: EmbeddedRenderProps & { ui: StripeUi }) => {
  const stripe = ui.useStripe();
  const elements = ui.useElements();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: request.returnUrl },
    });
    setBusy(false);
    if (error) {
      onResult({ status: 'failed', message: error.message });
    } else if (paymentIntent?.status === 'succeeded') {
      onResult({ status: 'succeeded', reference: paymentIntent.id });
    } else if (paymentIntent?.status === 'processing') {
      onResult({ status: 'processing', reference: paymentIntent.id });
    } else {
      onResult({ status: 'failed', message: paymentIntent?.status });
    }
  };

  return (
    <div className="space-y-4">
      <ui.PaymentElement />
      <button
        type="button"
        disabled={!stripe || busy}
        onClick={() => void pay()}
        className="rounded border px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
      >
        {busy ? labels.paymentProcessing : labels.pay}
      </button>
    </div>
  );
};

const Embedded = ({
  options,
  ...props
}: EmbeddedRenderProps & { options: StripeOptions }) => {
  const [ready, setReady] = useState<{
    stripe: Awaited<ReturnType<StripeJs['loadStripe']>>;
    ui: StripeUi;
    clientSecret: string;
  } | null>(null);
  const { request, onResult, labels } = props;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!options.createPaymentIntent)
          throw new Error('stripe(): createPaymentIntent is required');
        // The SDKs are optional peers: loaded only when this plugin is used.
        const [js, ui] = await Promise.all([
          import('@stripe/stripe-js'),
          import('@stripe/react-stripe-js'),
        ]);
        const [stripe, intent] = await Promise.all([
          js.loadStripe(options.publishableKey),
          options.createPaymentIntent(request),
        ]);
        if (!cancelled)
          setReady({ stripe, ui, clientSecret: intent.clientSecret });
      } catch (e) {
        if (!cancelled)
          onResult({
            status: 'failed',
            message: message(e, labels.paymentFailed),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <Loading message={labels.loadingPayment} />;
  }
  const { Elements } = ready.ui;
  return (
    <Elements
      stripe={ready.stripe}
      options={{
        clientSecret: ready.clientSecret,
        appearance: options.appearance as never,
      }}
    >
      <PayForm ui={ready.ui} {...props} />
    </Elements>
  );
};

const withParams = (url: string, params: string) =>
  `${url}${url.includes('?') ? '&' : '?'}${params}`;

/**
 * Stripe: embedded Payment Element (needs `@stripe/stripe-js` and
 * `@stripe/react-stripe-js`) or Stripe-hosted Checkout (no SDK needed).
 */
export const stripe = ({
  mode = 'embedded',
  id = 'stripe',
  name = 'Stripe',
  ...options
}: StripeOptions): PaymentPlugin => ({
  id,
  name,
  mode,
  resumeKeys: [
    'payment_intent',
    'payment_intent_client_secret',
    'redirect_status',
    'stripe_status',
    'session_id',
  ],
  render: (props) => <Embedded {...props} options={{ ...options, mode }} />,
  start: async (request) => {
    if (!options.createCheckoutSession)
      throw new Error('stripe(): createCheckoutSession is required');
    // `{CHECKOUT_SESSION_ID}` is replaced by Stripe, so it must stay unencoded.
    return options.createCheckoutSession(request, {
      successUrl: withParams(
        request.returnUrl,
        'stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
      ),
      cancelUrl: withParams(request.cancelUrl, 'stripe_status=cancel'),
    });
  },
  resume: (params): PaymentResult | null => {
    // Embedded payment methods that redirect (3DS, bank redirects…).
    const redirectStatus = params.get('redirect_status');
    if (redirectStatus) {
      const reference = params.get('payment_intent') ?? undefined;
      if (redirectStatus === 'succeeded')
        return { status: 'succeeded', reference };
      if (redirectStatus === 'processing')
        return { status: 'processing', reference };
      return { status: 'failed' };
    }
    // Stripe-hosted Checkout.
    const checkout = params.get('stripe_status');
    if (checkout === 'success')
      return {
        status: 'succeeded',
        reference: params.get('session_id') ?? undefined,
      };
    if (checkout === 'cancel') return { status: 'failed' };
    return null;
  },
});
