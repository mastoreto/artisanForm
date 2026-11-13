import type { Context } from 'hono';
import { HttpError, type Json, planOf, readBody } from '../../common.ts';
import { brickPayer, mp } from './client.ts';

// Payment Brick (embedded): the amount is ours, the card token is theirs.
export const createPayment = async (c: Context) => {
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
        payer: brickPayer(data.payer),
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
};
