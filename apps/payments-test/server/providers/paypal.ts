import { Hono } from 'hono';
import {
  call,
  currencyFor,
  env,
  HttpError,
  need,
  planOf,
  readBody,
  type Status,
} from '../common.ts';

const base = () =>
  env('PAYPAL_ENV') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const token = async (): Promise<string> => {
  const auth = btoa(
    `${need('PAYPAL_CLIENT_ID')}:${need('PAYPAL_CLIENT_SECRET')}`,
  );
  const data = await call('PayPal', `${base()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  return data.access_token;
};

const paypal = async (path: string, init: RequestInit = {}, key?: string) =>
  call('PayPal', `${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/json',
      ...(key ? { 'PayPal-Request-Id': key } : {}),
    },
  });

export const configured = () =>
  Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

const orderId = (raw: unknown): string => {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{5,40}$/.test(raw))
    throw new HttpError(400, 'Invalid order id');
  return raw;
};

export const paypalRoutes = new Hono();

paypalRoutes.post('/orders', async (c) => {
  const body = await readBody(c);
  const plan = planOf(body.values);
  const order = await paypal(
    '/v2/checkout/orders',
    {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: plan.id,
            amount: {
              currency_code: currencyFor('paypal'),
              value: (plan.amount / 100).toFixed(2),
            },
          },
        ],
      }),
    },
    body.idempotencyKey,
  );
  return c.json({ orderId: order.id });
});

paypalRoutes.post('/orders/:id/capture', async (c) => {
  const body = await readBody(c);
  const id = orderId(c.req.param('id'));
  const capture = await paypal(
    `/v2/checkout/orders/${id}/capture`,
    { method: 'POST', body: '{}' },
    `${body.idempotencyKey}-capture`,
  );
  return c.json({ status: capture.status, id: capture.id });
});

paypalRoutes.get('/status', async (c) => {
  const order = await paypal(
    `/v2/checkout/orders/${orderId(c.req.query('ref'))}`,
  );
  const result: Status =
    order.status === 'COMPLETED'
      ? { status: 'success' }
      : order.status === 'VOIDED'
        ? { status: 'failed', message: 'Order voided' }
        : { status: 'pending', message: order.status };
  return c.json(result);
});
