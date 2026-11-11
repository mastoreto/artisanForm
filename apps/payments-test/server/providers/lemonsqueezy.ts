import { Hono } from 'hono';
import {
  allowedUrl,
  call,
  HttpError,
  hmacHex,
  need,
  planOf,
  readBody,
  type Status,
  same,
} from '../common.ts';

export const configured = () =>
  Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_VARIANT_PRO,
  );

// ponytail: in-memory, lost on restart and not shared between instances.
// Use a database or KV store if this backend is ever deployed serverless.
const paid = new Map<string, Status>();

const sign = (raw: string, secret: string) => hmacHex(secret, raw);

export const lemonRoutes = new Hono();

// The price is the variant's (set in the Lemon Squeezy dashboard).
lemonRoutes.post('/checkout', async (c) => {
  const body = await readBody(c);
  const plan = planOf(body.values);
  const variant = process.env[`LEMONSQUEEZY_VARIANT_${plan.id.toUpperCase()}`];
  if (!variant) throw new HttpError(503, `No variant set for plan ${plan.id}`);
  const email = typeof body.values.email === 'string' ? body.values.email : '';
  const data = await call(
    'Lemon Squeezy',
    'https://api.lemonsqueezy.com/v1/checkouts',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${need('LEMONSQUEEZY_API_KEY')}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: { email, custom: { plan: plan.id } },
            product_options: { redirect_url: allowedUrl(body.redirectUrl) },
          },
          relationships: {
            store: {
              data: { type: 'stores', id: need('LEMONSQUEEZY_STORE_ID') },
            },
            variant: { data: { type: 'variants', id: variant } },
          },
        },
      }),
    },
  );
  return c.json({ url: data.data.attributes.url });
});

// Lemon Squeezy has no reference on return: confirmation comes from the
// signed webhook and is looked up by the customer's email.
lemonRoutes.post('/webhook', async (c) => {
  const raw = await c.req.text();
  const expected = await sign(raw, need('LEMONSQUEEZY_WEBHOOK_SECRET'));
  if (!same(expected, c.req.header('X-Signature') ?? ''))
    return c.json({ error: 'Bad signature' }, 401 as never);
  const event = JSON.parse(raw);
  const email = event?.data?.attributes?.user_email;
  if (event?.meta?.event_name === 'order_created' && typeof email === 'string')
    paid.set(email.toLowerCase(), {
      status: event.data.attributes.status === 'paid' ? 'success' : 'pending',
    });
  return c.json({ ok: true });
});

lemonRoutes.get('/status', (c) =>
  c.json(
    paid.get((c.req.query('email') ?? '').toLowerCase()) ?? {
      status: 'pending',
      message: 'Waiting for the webhook',
    },
  ),
);

export { sign as signWebhook };
