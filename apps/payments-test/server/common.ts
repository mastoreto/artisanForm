import type { Context } from 'hono';

export class HttpError extends Error {
  status: 400 | 404 | 502 | 503;
  constructor(status: 400 | 404 | 502 | 503, message: string) {
    super(message);
    this.status = status;
  }
}

export const env = (name: string): string | undefined =>
  process.env[name] || undefined;

/** A required variable; 503 tells the UI the provider is not configured. */
export const need = (name: string): string => {
  const value = env(name);
  if (!value) throw new HttpError(503, `${name} is not set`);
  return value;
};

/** The catalog lives here: the browser only names a plan, never a price. */
export const plans: Record<string, { name: string; amount: number }> = {
  pro: { name: 'Pro', amount: 1000 },
  team: { name: 'Team', amount: 2500 },
};

export const planOf = (values: Record<string, unknown>) => {
  const plan = typeof values.plan === 'string' ? plans[values.plan] : undefined;
  if (!plan) throw new HttpError(400, 'Unknown plan');
  return { id: values.plan as string, ...plan };
};

export const currencyFor = (provider: string): string =>
  env(`${provider.toUpperCase()}_CURRENCY`) ?? env('CURRENCY') ?? 'USD';

export interface PayBody {
  values: Record<string, unknown>;
  idempotencyKey: string;
  returnUrl?: string;
  cancelUrl?: string;
  successUrl?: string;
  redirectUrl?: string;
  [key: string]: unknown;
}

export const readBody = async (c: Context): Promise<PayBody> => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object' || typeof body.values !== 'object')
    throw new HttpError(400, 'Invalid body');
  if (typeof body.idempotencyKey !== 'string' || !body.idempotencyKey)
    throw new HttpError(400, 'idempotencyKey is required');
  return body as PayBody;
};

/** Where the web app runs (vite.config.ts `server.port`); the default allowed origin. */
export const DEFAULT_ORIGIN = 'http://localhost:5858';

/** The front-end origins this backend talks to and may send users back to. */
export const allowedOrigins = (): string[] =>
  (env('ALLOWED_ORIGINS') ?? DEFAULT_ORIGIN).split(',').map((o) => o.trim());

/** Hosted checkouts redirect here: only accept our own front-end origins. */
export const allowedUrl = (raw: unknown): string => {
  const allowed = allowedOrigins();
  try {
    const url = new URL(String(raw));
    if (allowed.includes(url.origin)) return url.toString();
  } catch {}
  throw new HttpError(400, 'URL origin not allowed (ALLOWED_ORIGINS)');
};

export const withParam = (url: string, param: string): string =>
  `${url}${url.includes('?') ? '&' : '?'}${param}`;

// Provider responses are not modelled: each route reads the few fields it needs.
// biome-ignore lint/suspicious/noExplicitAny: untyped third-party JSON
export type Json = any;

/** Calls a provider API; failures become a 502 with the provider's message. */
export const call = async (
  provider: string,
  url: string,
  init: RequestInit,
): Promise<Json> => {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: Json = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const detail =
      data?.error?.message ??
      data?.message ??
      data?.errors?.[0]?.detail ??
      text;
    throw new HttpError(
      502,
      `${provider} ${res.status}: ${detail}`.slice(0, 300),
    );
  }
  return data;
};

export type Status = {
  status: 'pending' | 'success' | 'failed';
  message?: string;
};

const hmacHex = async (secret: string, data: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data),
  );
  return [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/** Constant-time string comparison. */
export const same = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export { hmacHex };
