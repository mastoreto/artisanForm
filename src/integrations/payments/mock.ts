import { createElement } from 'react';
import type { PaymentPlugin, PaymentResult } from './types';

/** Fake provider for demos and tests; nothing is charged. */
export const mockPayment = ({
  mode = 'embedded',
  outcome = 'succeeded',
  delay = 400,
  id = 'mock',
  name = 'Mock',
}: {
  mode?: 'embedded' | 'redirect';
  outcome?: PaymentResult['status'] | (() => PaymentResult['status']);
  delay?: number;
  id?: string;
  name?: string;
} = {}): PaymentPlugin => {
  const resolveOutcome = (): PaymentResult => {
    const status = typeof outcome === 'function' ? outcome() : outcome;
    return status === 'failed'
      ? { status, message: 'Payment rejected (mock)' }
      : { status, reference: 'mock_ref_1' };
  };
  return {
    id,
    name,
    mode,
    resumeKeys: [`mock_payment_${id}`, `mock_message_${id}`],
    render: ({ onResult }) =>
      createElement(
        'button',
        {
          type: 'button',
          className: 'rounded border px-4 py-2',
          onClick: () => setTimeout(() => onResult(resolveOutcome()), delay),
        },
        'Pay (mock)',
      ),
    start: async (request) => {
      const result = resolveOutcome();
      const url = new URL(request.returnUrl);
      url.searchParams.set(`mock_payment_${id}`, result.status);
      if (result.status === 'failed' && result.message)
        url.searchParams.set(`mock_message_${id}`, result.message);
      return { url: url.toString() };
    },
    resume: (params) => {
      const status = params.get(`mock_payment_${id}`);
      if (!status) return null;
      return status === 'failed'
        ? { status, message: params.get(`mock_message_${id}`) ?? undefined }
        : {
            status: status as 'succeeded' | 'processing',
            reference: 'mock_ref_1',
          };
    },
  };
};
