import { Hono } from 'hono';
import {
  allowedUrl,
  call,
  currencyFor,
  HttpError,
  hmacHex,
  need,
  planOf,
  readBody,
  type Status,
  same,
} from '../common.ts';

const API = 'https://api.stripe.com/v1';

const stripe = (path: string, init: RequestInit = {}, key?: string) =>
  call('Stripe', `${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${need('STRIPE_SECRET_KEY')}`,
      ...(key ? { 'Idempotency-Key': key } : {}),
      ...(init.body
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : {}),
    },
  });

export const configured = () =>
  Boolean(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY);

export const stripeRoutes = new Hono();

// Embedded: the Payment Element confirms a PaymentIntent we create here.
stripeRoutes.post('/payment-intent', async (c) => {
  const body = await readBody(c);
  const plan = planOf(body.values);
  const intent = await stripe(
    '/payment_intents',
    {
      method: 'POST',
      body: new URLSearchParams({
        amount: String(plan.amount),
        currency: currencyFor('stripe').toLowerCase(),
        'automatic_payment_methods[enabled]': 'true',
        'metadata[plan]': plan.id,
      }),
    },
    body.idempotencyKey,
  );
  return c.json({ clientSecret: intent.client_secret });
});

// Hosted Checkout (redirect).
stripeRoutes.post('/checkout-session', async (c) => {
  const body = await readBody(c);
  const plan = planOf(body.values);
  const session = await stripe(
    '/checkout/sessions',
    {
      method: 'POST',
      body: new URLSearchParams({
        mode: 'payment',
        // The braces are Stripe's placeholder, so the URL is passed as given.
        success_url: allowedUrl(body.successUrl),
        cancel_url: allowedUrl(body.cancelUrl),
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]':
          currencyFor('stripe').toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(plan.amount),
        'line_items[0][price_data][product_data][name]': plan.name,
        'metadata[plan]': plan.id,
      }),
    },
    body.idempotencyKey,
  );
  return c.json({ url: session.url });
});

// The real state comes from Stripe's API, never from the return URL.
stripeRoutes.get('/status', async (c): Promise<Response> => {
  const ref = c.req.query('ref') ?? '';
  const match = /^(pi|cs)_[A-Za-z0-9_]+$/.exec(ref);
  if (!match) throw new HttpError(400, 'Invalid reference');
  const result: Status =
    match[1] === 'cs'
      ? await stripe(`/checkout/sessions/${ref}`).then((s) =>
          s.payment_status === 'paid'
            ? { status: 'success' as const }
            : s.status === 'expired'
              ? { status: 'failed' as const, message: 'Checkout expired' }
              : { status: 'pending' as const },
        )
      : await stripe(`/payment_intents/${ref}`).then((p) =>
          p.status === 'succeeded'
            ? { status: 'success' as const }
            : p.status === 'canceled' || p.status === 'requires_payment_method'
              ? { status: 'failed' as const, message: p.status }
              : { status: 'pending' as const, message: p.status },
        );
  return c.json(result);
});

// ponytail: in-memory log of the last events, only to see webhooks arrive
// (GET /events). The payment state itself is read from Stripe's API.
const events: { type: string; id: string }[] = [];

/** `Stripe-Signature: t=<unix>,v1=<hmac of "t.body">`, 5 minute tolerance. */
export const verifyStripe = async (
  raw: string,
  header: string,
  secret: string,
  now = Date.now() / 1000,
): Promise<boolean> => {
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=') as [string, string]),
  );
  const t = Number(parts.t);
  if (!t || Math.abs(now - t) > 300) return false;
  return same(await hmacHex(secret, `${parts.t}.${raw}`), parts.v1 ?? '');
};

stripeRoutes.post('/webhook', async (c) => {
  const raw = await c.req.text();
  const ok = await verifyStripe(
    raw,
    c.req.header('Stripe-Signature') ?? '',
    need('STRIPE_WEBHOOK_SECRET'),
  );
  if (!ok) throw new HttpError(400, 'Bad signature');
  const event = JSON.parse(raw);
  events.unshift({ type: event.type, id: event.id });
  events.length = Math.min(events.length, 20);
  return c.json({ received: true });
});

stripeRoutes.get('/events', (c) => c.json(events));
