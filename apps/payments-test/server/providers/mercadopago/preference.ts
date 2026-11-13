import type { Context } from 'hono';
import {
  allowedUrl,
  currencyFor,
  env,
  type Json,
  type PayBody,
  planOf,
  readBody,
} from '../../common.ts';
import { mp } from './client.ts';

/** Public HTTPS only: MP rejects `auto_return`/`notification_url` otherwise. */
const isPublicHttps = (url: string | undefined): url is string => {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === 'https:' &&
      !['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)
    );
  } catch {
    return false;
  }
};

/** The Checkout Pro preference: pure, so tests pin it without the network. */
export const buildPreference = (body: PayBody): Json => {
  const plan = planOf(body.values);
  const success = allowedUrl(body.successUrl);
  const notificationUrl = env('MP_NOTIFICATION_URL');
  return {
    items: [
      {
        title: plan.name,
        quantity: 1,
        unit_price: plan.amount / 100,
        currency_id: currencyFor('mp'),
      },
    ],
    back_urls: {
      success,
      failure: allowedUrl(body.failureUrl),
      pending: allowedUrl(body.pendingUrl),
    },
    // MP rejects auto_return with non-https back_urls (e.g. localhost).
    ...(isPublicHttps(success) ? { auto_return: 'approved' } : {}),
    // Per-preference webhook; otherwise the one set in the MP panel is used.
    ...(isPublicHttps(notificationUrl)
      ? { notification_url: notificationUrl }
      : {}),
    // Optional, and NOT MP_PAYER_EMAIL (that one is the Brick's workaround and
    // is an ordinary address): on a test seller, Checkout Pro treats a payer
    // that is not a test buyer as a real person and stops with "una de las
    // partes ... es de prueba". Send only the test buyer's own e-mail.
    ...(env('MP_CHECKOUT_PAYER_EMAIL')
      ? { payer: { email: env('MP_CHECKOUT_PAYER_EMAIL') } }
      : {}),
    external_reference: body.idempotencyKey,
  };
};

// Checkout Pro (redirect): always `init_point`, MP has no sandbox URL.
export const createPreference = async (c: Context) => {
  const body = await readBody(c);
  const pref = await mp(
    '/checkout/preferences',
    { method: 'POST', body: JSON.stringify(buildPreference(body)) },
    body.idempotencyKey,
  );
  return c.json({ url: pref.init_point, id: pref.id });
};
