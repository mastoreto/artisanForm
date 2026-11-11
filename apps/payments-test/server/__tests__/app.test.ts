import { expect, test } from 'bun:test';
import { app } from '../app.ts';
import { allowedUrl, planOf } from '../common.ts';
import { signWebhook } from '../providers/lemonsqueezy.ts';

const post = (path: string, body: unknown, headers: HeadersInit = {}) =>
  app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

test('config only lists configured providers', async () => {
  const res = await app.request('/api/config');
  expect(res.status).toBe(200);
  expect(await res.json()).toHaveProperty('stripe');
});

test('the browser names a plan, never a price', () => {
  expect(planOf({ plan: 'pro' }).amount).toBe(1000);
  expect(() => planOf({ plan: 'free', amount: 1 })).toThrow('Unknown plan');
});

test('return URLs are limited to ALLOWED_ORIGINS', () => {
  expect(() => allowedUrl('https://evil.example/x')).toThrow('not allowed');
  expect(allowedUrl('http://localhost:5174/?a=1')).toContain('localhost:5174');
});

test('a provider without credentials answers 503, bad bodies 400', async () => {
  const body = { values: { plan: 'pro' }, idempotencyKey: 'k' };
  const saved = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  expect((await post('/api/stripe/payment-intent', body)).status).toBe(503);
  process.env.STRIPE_SECRET_KEY = saved ?? '';
  expect((await post('/api/stripe/payment-intent', {})).status).toBe(400);
});

test('the Lemon Squeezy webhook needs a valid signature', async () => {
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 's3cret';
  const raw = JSON.stringify({
    meta: { event_name: 'order_created' },
    data: { attributes: { user_email: 'A@b.co', status: 'paid' } },
  });
  expect(
    (await post('/api/lemonsqueezy/webhook', raw, { 'X-Signature': 'bad' }))
      .status,
  ).toBe(401);
  const sig = await signWebhook(raw, 's3cret');
  expect(
    (await post('/api/lemonsqueezy/webhook', raw, { 'X-Signature': sig }))
      .status,
  ).toBe(200);
  const status = await app.request('/api/lemonsqueezy/status?email=a@b.co');
  expect(await status.json()).toEqual({ status: 'success' });
});

test('the Stripe webhook verifies the signature and its age', async () => {
  const { verifyStripe } = await import('../providers/stripe.ts');
  const { hmacHex } = await import('../common.ts');
  const t = 1_700_000_000;
  const raw = '{"id":"evt_1","type":"payment_intent.succeeded"}';
  const header = `t=${t},v1=${await hmacHex('whsec_x', `${t}.${raw}`)}`;
  expect(await verifyStripe(raw, header, 'whsec_x', t)).toBe(true);
  expect(await verifyStripe(`${raw} `, header, 'whsec_x', t)).toBe(false);
  expect(await verifyStripe(raw, header, 'whsec_x', t + 301)).toBe(false);
});

test('the Mercado Pago webhook needs a valid signature', async () => {
  const { verifyMercadoPago } = await import('../providers/mercadopago.ts');
  const { hmacHex } = await import('../common.ts');
  process.env.MP_WEBHOOK_SECRET = 's3cret';
  const url = '/api/mercadopago/webhook?type=payment&data.id=12345';
  const headers = { 'x-request-id': 'req-1', 'x-signature': 'ts=1,v1=bad' };
  expect((await post(url, {}, headers)).status).toBe(401);
  const v1 = await hmacHex('s3cret', 'id:12345;request-id:req-1;ts:1;');
  expect(
    await verifyMercadoPago('s3cret', '12345', 'req-1', `ts=1,v1=${v1}`),
  ).toBe(true);
});
