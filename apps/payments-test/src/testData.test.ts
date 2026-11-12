import { expect, test } from 'bun:test';
import { type PanelPlugin, panelFor, testData } from './testData.ts';

const plugins: PanelPlugin[] = [
  { id: 'stripe', name: 'Stripe', mode: 'embedded' },
  { id: 'stripe-checkout', name: 'Stripe Checkout', mode: 'redirect' },
  { id: 'paypal', name: 'PayPal', mode: 'embedded' },
  { id: 'mercadopago', name: 'Mercado Pago', mode: 'embedded' },
  {
    id: 'mercadopago-checkout',
    name: 'Mercado Pago Checkout Pro',
    mode: 'redirect',
  },
  { id: 'lemonsqueezy', name: 'Lemon Squeezy', mode: 'redirect' },
];
const ids = (xs: PanelPlugin[]) => xs.map((p) => p.id);

test('with nothing chosen, every on-page method with data is listed and no redirect one', () => {
  const { shown, offsite } = panelFor(plugins, null);
  expect(ids(shown)).toEqual(['stripe', 'paypal', 'mercadopago']);
  expect(offsite).toBeUndefined();
});

test('choosing an on-page method hides the others', () => {
  expect(ids(panelFor(plugins, 'paypal').shown)).toEqual(['paypal']);
  expect(ids(panelFor(plugins, 'mercadopago').shown)).toEqual(['mercadopago']);
});

test('choosing a method that leaves the page lists nothing and says which one', () => {
  const r = panelFor(plugins, 'mercadopago-checkout');
  expect(r.shown).toEqual([]);
  expect(r.offsite?.id).toBe('mercadopago-checkout');
});

test('only providers that are configured (present in the list) can appear', () => {
  expect(
    ids(
      panelFor(
        plugins.filter((p) => p.id !== 'stripe'),
        null,
      ).shown,
    ),
  ).toEqual(['paypal', 'mercadopago']);
  expect(panelFor([], null)).toEqual({ shown: [] });
});

test('a method without test data (the mock) is not listed', () => {
  expect(
    panelFor([{ id: 'mock', name: 'Mock', mode: 'embedded' }], null).shown,
  ).toEqual([]);
});

test('an unknown active id falls back to the full list', () => {
  expect(ids(panelFor(plugins, 'gone').shown)).toEqual([
    'stripe',
    'paypal',
    'mercadopago',
  ]);
});

test('every listed method has rows, and the Brick card matches the sandbox docs', () => {
  for (const d of Object.values(testData))
    expect(d.rows.length).toBeGreaterThan(0);
  expect(testData.mercadopago.rows[0].value).toBe('5031 7557 3453 0604');
  expect(testData.stripe.rows[0].value).toBe('4242 4242 4242 4242');
});
