import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { allowedOrigins, env, HttpError } from './common.ts';
import * as lemon from './providers/lemonsqueezy.ts';
import * as mp from './providers/mercadopago.ts';
import * as paypal from './providers/paypal.ts';
import * as stripe from './providers/stripe.ts';

/**
 * Portable: `app.fetch` is a standard (Request) => Response handler, so it runs
 * on Node (`dev.ts`), Cloudflare Workers, Vercel, Bun or Deno unchanged.
 */
export const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: allowedOrigins(),
  }),
);

app.onError((e, c) => {
  if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
  console.error(e);
  return c.json({ error: 'Internal error' }, 500);
});

// Only public values: which providers are configured and their public keys.
app.get('/api/config', (c) =>
  c.json({
    stripe: stripe.configured()
      ? { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY }
      : null,
    paypal: paypal.configured()
      ? {
          clientId: process.env.PAYPAL_CLIENT_ID,
          currency: env('PAYPAL_CURRENCY') ?? env('CURRENCY') ?? 'USD',
        }
      : null,
    mercadopago: mp.configured()
      ? { publicKey: process.env.MP_PUBLIC_KEY }
      : null,
    lemonsqueezy: lemon.configured() ? {} : null,
  }),
);

app.route('/api/stripe', stripe.stripeRoutes);
app.route('/api/paypal', paypal.paypalRoutes);
app.route('/api/mercadopago', mp.mercadopagoRoutes);
app.route('/api/lemonsqueezy', lemon.lemonRoutes);

export default app;
