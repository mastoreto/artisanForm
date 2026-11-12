import { call, env, type Json, need } from '../../common.ts';

const API = 'https://api.mercadopago.com';

/** Authenticated call to the Mercado Pago API; `key` makes it idempotent. */
export const mp = (path: string, init: RequestInit = {}, key?: string) =>
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

/** A payment id as MP issues it; anything else never reaches the API path. */
export const isPaymentId = (value: string) => /^\d{3,20}$/.test(value);

// Sandbox: MP rejects fake @testuser.com payers ("Invalid users involved"),
// so MP_PAYER_EMAIL replaces whatever e-mail the browser typed (Bricks only).
export const brickPayer = (sent: Json): Json =>
  env('MP_PAYER_EMAIL') ? { ...sent, email: env('MP_PAYER_EMAIL') } : sent;
