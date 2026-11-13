import type { Context } from 'hono';
import { hmacHex, need, same } from '../../common.ts';
import { isPaymentId, mp } from './client.ts';

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
export const receiveWebhook = async (c: Context) => {
  const dataId = c.req.query('data.id') ?? '';
  const ok = await verifyMercadoPago(
    need('MP_WEBHOOK_SECRET'),
    dataId,
    c.req.header('x-request-id') ?? '',
    c.req.header('x-signature') ?? '',
  );
  if (!ok) return c.json({ error: 'Bad signature' }, 401 as never);
  if (c.req.query('type') === 'payment' && isPaymentId(dataId)) {
    const payment = await mp(`/v1/payments/${dataId}`);
    console.log(`[mercadopago] payment ${dataId}: ${payment.status}`);
  }
  return c.json({ ok: true });
};
