import { expect, test } from 'bun:test';
import { lemonSqueezy } from '../providers/lemonsqueezy';
import { mercadoPago } from '../providers/mercadopago';
import { stripe } from '../providers/stripe';
import { fromReturnUrl } from '../resume';

test('fromReturnUrl turns a success into processing and keeps the rest', () => {
  expect(fromReturnUrl({ status: 'succeeded', reference: 'r' })).toEqual({
    status: 'processing',
    reference: 'r',
  });
  expect(fromReturnUrl({ status: 'processing' })).toEqual({
    status: 'processing',
  });
  expect(fromReturnUrl({ status: 'failed', message: 'm' })).toEqual({
    status: 'failed',
    message: 'm',
  });
});

test('no forged return URL can produce "succeeded"', () => {
  const plugins = [
    [
      stripe({ publishableKey: 'pk' }),
      ['stripe_status=success', 'redirect_status=succeeded'],
    ],
    [
      mercadoPago({ publicKey: 'pk' }),
      [
        'mp_status=success&status=approved',
        'mp_status=success&collection_status=approved',
      ],
    ],
    [
      lemonSqueezy({ storeUrl: 'https://s.test' } as never),
      ['lemon_status=success'],
    ],
  ] as const;
  for (const [plugin, queries] of plugins)
    for (const q of queries) {
      const result = plugin.resume?.(new URLSearchParams(q));
      expect(result).not.toBeNull();
      expect(result?.status).not.toBe('succeeded');
    }
});
