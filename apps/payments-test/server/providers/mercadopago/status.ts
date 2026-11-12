import type { Context } from 'hono';
import { HttpError, type Status } from '../../common.ts';
import { isPaymentId, mp } from './client.ts';

const FAILED = ['rejected', 'cancelled', 'refunded', 'charged_back'];

/** The truth always comes from the API, never from the back_url query. */
export const paymentStatus = async (c: Context) => {
  const ref = c.req.query('ref') ?? '';
  if (!isPaymentId(ref)) throw new HttpError(400, 'Invalid reference');
  const payment = await mp(`/v1/payments/${ref}`);
  const result: Status =
    payment.status === 'approved'
      ? { status: 'success' }
      : FAILED.includes(payment.status)
        ? { status: 'failed', message: payment.status_detail }
        : { status: 'pending', message: payment.status };
  return c.json(result);
};
