import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { app } from '../app.ts';

// What the backend sends to Mercado Pago when it creates a Checkout Pro
// preference: pinned exactly, because "algo salió mal" after paying can come
// from this body (see scripts/mp-diagnose.ts for isolating it with the real API).
const KEYS = [
  'MP_ACCESS_TOKEN',
  'MP_PUBLIC_KEY',
  'MP_CURRENCY',
  'MP_PAYER_EMAIL',
  'ALLOWED_ORIGINS',
];
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;
let sent: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
  for (const k of KEYS) saved[k] = process.env[k];
  process.env.MP_ACCESS_TOKEN = 'TEST-secret-token';
  process.env.MP_PUBLIC_KEY = 'TEST-public';
  process.env.MP_CURRENCY = 'ARS';
  delete process.env.MP_PAYER_EMAIL;
  delete process.env.MP_CHECKOUT_PAYER_EMAIL;
  process.env.ALLOWED_ORIGINS =
    'http://localhost:5858,https://demo.trycloudflare.com';
  sent = [];
  globalThis.fetch = mock(async (url: unknown, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    return new Response(
      JSON.stringify({ id: 'pref-1', init_point: 'https://mp.test/init' }),
      { status: 201 },
    );
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const preference = (
  urls: { success: string; failure?: string; pending?: string },
  plan = 'pro',
) =>
  app.request('/api/mercadopago/preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: { plan },
      idempotencyKey: 'idem-1',
      successUrl: urls.success,
      failureUrl: urls.failure ?? urls.success,
      pendingUrl: urls.pending ?? urls.success,
    }),
  });

const body = () => JSON.parse(String(sent[0].init.body));

test('over http the preference has no auto_return and carries the exact back_urls', async () => {
  const res = await preference({
    success: 'http://localhost:5858/?mp_status=success',
    failure: 'http://localhost:5858/?mp_status=failure',
    pending: 'http://localhost:5858/?mp_status=pending',
  });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    url: 'https://mp.test/init',
    id: 'pref-1',
  });
  expect(sent[0].url).toBe('https://api.mercadopago.com/checkout/preferences');
  expect(body()).toEqual({
    items: [{ title: 'Pro', quantity: 1, unit_price: 10, currency_id: 'ARS' }],
    back_urls: {
      success: 'http://localhost:5858/?mp_status=success',
      failure: 'http://localhost:5858/?mp_status=failure',
      pending: 'http://localhost:5858/?mp_status=pending',
    },
    external_reference: 'idem-1',
  });
  expect(body()).not.toHaveProperty('auto_return');
});

test('over https auto_return is sent', async () => {
  const url = 'https://demo.trycloudflare.com/?mp_status=success';
  await preference({ success: url });
  expect(body()).toMatchObject({
    auto_return: 'approved',
    back_urls: { success: url },
  });
});

test("the price and the currency are the backend's, never the browser's", async () => {
  await preference({ success: 'http://localhost:5858/' }, 'team');
  expect(body().items).toEqual([
    { title: 'Team', quantity: 1, unit_price: 25, currency_id: 'ARS' },
  ]);
  const res = await app.request('/api/mercadopago/preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: { plan: 'pro', amount: 1 },
      idempotencyKey: 'k',
      successUrl: 'http://localhost:5858/',
      failureUrl: 'http://localhost:5858/',
      pendingUrl: 'http://localhost:5858/',
      unit_price: 1,
    }),
  });
  expect(res.status).toBe(200);
  expect(JSON.parse(String(sent.at(-1)?.init.body)).items[0].unit_price).toBe(
    10,
  );
});

test("Checkout Pro never sends the Brick's MP_PAYER_EMAIL: a payer that is not a test buyer on a test seller ends in 'una de las partes ... es de prueba'", async () => {
  process.env.MP_PAYER_EMAIL = 'buyer1@example.com';
  await preference({ success: 'http://localhost:5858/' });
  expect(body()).not.toHaveProperty('payer');
});

test('a payer is sent only when MP_CHECKOUT_PAYER_EMAIL names the test buyer', async () => {
  process.env.MP_CHECKOUT_PAYER_EMAIL = 'test_user_123@testuser.com';
  await preference({ success: 'http://localhost:5858/' });
  expect(body().payer).toEqual({ email: 'test_user_123@testuser.com' });
});

test('the request is authenticated and idempotent', async () => {
  await preference({ success: 'http://localhost:5858/' });
  const headers = sent[0].init.headers as Record<string, string>;
  expect(headers.Authorization).toBe('Bearer TEST-secret-token');
  expect(headers['X-Idempotency-Key']).toBe('idem-1');
});

test('a return URL outside ALLOWED_ORIGINS is refused before calling Mercado Pago', async () => {
  const res = await preference({
    success: 'https://evil.example/?mp_status=success',
  });
  expect(res.status).toBe(400);
  expect(sent).toHaveLength(0);
});

test('an unknown plan is refused before calling Mercado Pago', async () => {
  const res = await preference({ success: 'http://localhost:5858/' }, 'free');
  expect(res.status).toBe(400);
  expect(sent).toHaveLength(0);
});

test('a Mercado Pago error becomes a 502 that does not leak the token', async () => {
  globalThis.fetch = mock(
    async () =>
      new Response(JSON.stringify({ message: 'invalid currency' }), {
        status: 400,
      }),
  ) as unknown as typeof fetch;
  const res = await preference({ success: 'http://localhost:5858/' });
  expect(res.status).toBe(502);
  const text = JSON.stringify(await res.json());
  expect(text).toContain('invalid currency');
  expect(text).not.toContain('TEST-secret-token');
});

test('notification_url is sent only when MP_NOTIFICATION_URL is public https', async () => {
  process.env.MP_NOTIFICATION_URL = 'https://demo.trycloudflare.com/hook';
  await preference({ success: 'http://localhost:5858/' });
  expect(body().notification_url).toBe('https://demo.trycloudflare.com/hook');
  process.env.MP_NOTIFICATION_URL = 'http://localhost:8787/hook';
  await preference({ success: 'http://localhost:5858/' });
  expect(JSON.parse(String(sent[1].init.body))).not.toHaveProperty(
    'notification_url',
  );
  delete process.env.MP_NOTIFICATION_URL;
});
