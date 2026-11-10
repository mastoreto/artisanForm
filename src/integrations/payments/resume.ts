import type { PaymentResult } from './types';

/**
 * A result read from the return URL is only a hint: anyone can type
 * `?stripe_status=success`. It can say "processing" (the wizard moves on to a
 * `pending` step where your backend confirms the real state) but never
 * "succeeded".
 */
export const fromReturnUrl = (result: PaymentResult): PaymentResult =>
  result.status === 'succeeded'
    ? { status: 'processing', reference: result.reference }
    : result;
