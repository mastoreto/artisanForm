import { Hono } from 'hono';
import {
  allowedUrl,
  call,
  currencyFor,
  env,
  HttpError,
  hmacHex,
  type Json,
  need,
  planOf,
  readBody,
  type Status,
  same,
} from '../common.ts';

const API = 'https://api.mercadopago.com';

const mp = (path: string, init: RequestInit = {}, key?: string) =>
  call('Mercado Pago', `${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${need('MP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
      ...(key ? { 'X-Idempotency-Key': key } : {}),
    },
  });

export const configured = () =>
  Boolean(process.env.MP_PUBLIC_KEY && process.env.MP_ACCESS_TOKEN);

export const mercadopagoRoutes = new Hono();

// Sandbox: MP rejects fake @testuser.com payers ("Invalid users involved"),
// so MP_PAYER_EMAIL replaces whatever e-mail the browser typed.
const payer = (sent: Json): Json =>
  env('MP_PAYER_EMAIL') ? { ...sent, email: env('MP_PAYER_EMAIL') } : sent;

// Checkout Pro (redirect).
mercadopagoRoutes.post('/preference', async (c) => {
  const body = await readBody(c);
  const plan = planOf(body.values);
  const back = (key: string) => allowedUrl(body[key]);
  const success = back('successUrl');
  const pref = await mp(
    '/checkout/preferences',
    {
      method: 'POST',
      body: JSON.stringify({
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
          failure: back('failureUrl'),
          pending: back('pendingUrl'),
        },
        // MP rejects auto_return with non-https back_urls (e.g. localhost).
        ...(success.startsWith('https:') ? { auto_return: 'approved' } : {}),
        // Optional, and NOT MP_PAYER_EMAIL (that one is the Brick's workaround
        // and is an ordinary address): on a test seller, Checkout Pro treats a
        // payer that is not a test buyer as a real person and stops with "una
        // de las partes ... es de prueba". Send only the test buyer's own e-mail.
        ...(env('MP_CHECKOUT_PAYER_EMAIL')
          ? { payer: { email: env('MP_CHECKOUT_PAYER_EMAIL') } }
          : {}),
        external_reference: body.idempotencyKey,
      }),
    },
    body.idempotencyKey,
  );
  return c.json({ url: pref.init_point, id: pref.id });
});

// Payment Brick (embedded): the amount is ours, the card token is theirs.
mercadopagoRoutes.post('/payment', async (c) => {
  const body = await readBody(c);
  const plan = planOf(body.values);
  const brick = body.formData as Json;
  const data = brick?.formData ?? brick;
  if (!data?.token && !data?.payment_method_id)
    throw new HttpError(400, 'Missing payment data');
  const payment = await mp(
    '/v1/payments',
    {
      method: 'POST',
      body: JSON.stringify({
        token: data.token,
        issuer_id: data.issuer_id,
        payment_method_id: data.payment_method_id,
        installments: data.installments ?? 1,
        payer: payer(data.payer),
        transaction_amount: plan.amount / 100,
        description: plan.name,
        external_reference: body.idempotencyKey,
      }),
    },
    body.idempotencyKey,
  );
  return c.json({
    status: payment.status,
    id: payment.id,
    message: payment.status_detail,
  });
});

mercadopagoRoutes.get('/status', async (c) => {
  const ref = c.req.query('ref') ?? '';
  if (!/^\d{3,20}$/.test(ref)) throw new HttpError(400, 'Invalid reference');
  const payment = await mp(`/v1/payments/${ref}`);
  const result: Status =
    payment.status === 'approved'
      ? { status: 'success' }
      : ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(
            payment.status,
          )
        ? { status: 'failed', message: payment.status_detail }
        : { status: 'pending', message: payment.status };
  return c.json(result);
});

// MP signs `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` with the secret
// of the webhook (Your integrations → Webhooks → Secret signature).
export const verifyMercadoPago = async (
  secret: string,
  dataId: string,
  requestId: string,
  signature: string,
): Promise<boolean> => {
  const part = (k: string) =>
    signature
      .split(',')
      .map((p) => p.trim().split('='))
      .find(([key]) => key === k)?.[1] ?? '';
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${part('ts')};`;
  return same(await hmacHex(secret, manifest), part('v1'));
};

// Notification only: the payment itself is re-read from the API, never taken
// from the body. /status already asks MP directly, so nothing is stored.
mercadopagoRoutes.post('/webhook', async (c) => {
  const dataId = c.req.query('data.id') ?? '';
  const ok = await verifyMercadoPago(
    need('MP_WEBHOOK_SECRET'),
    dataId,
    c.req.header('x-request-id') ?? '',
    c.req.header('x-signature') ?? '',
  );
  if (!ok) return c.json({ error: 'Bad signature' }, 401 as never);
  if (c.req.query('type') === 'payment' && /^\d{3,20}$/.test(dataId)) {
    const payment = await mp(`/v1/payments/${dataId}`);
    console.log(`[mercadopago] payment ${dataId}: ${payment.status}`);
  }
  return c.json({ ok: true });
});
