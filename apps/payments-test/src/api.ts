/** Thin client for the test backend (any API with these routes would do). */
export const api = async <T>(path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
};

export interface Config {
  stripe: { publishableKey: string } | null;
  paypal: { clientId: string; currency: string } | null;
  mercadopago: { publicKey: string } | null;
  lemonsqueezy: Record<string, never> | null;
}
