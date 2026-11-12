import { expect, test } from 'bun:test';
import { type DiagConfig, variants } from '../../scripts/mp-variants.ts';

const cfg: DiagConfig = {
  currency: 'ARS',
  amount: 100,
  httpBase: 'http://localhost:5858',
  httpsBase: 'https://demo.trycloudflare.com',
  payerEmail: 'buyer1@example.com',
};
const byId = (c: DiagConfig = cfg) =>
  Object.fromEntries(variants(c, 'ref-1').map((v) => [v.id, v]));

test('each variant adds one thing to the previous one', () => {
  const v = byId();
  expect(Object.keys(v)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  expect(v.A.body).not.toHaveProperty('back_urls');
  expect(v.B.body).toHaveProperty('back_urls');
  expect(v.B.body).not.toHaveProperty('auto_return');
  expect(v.C.body).toMatchObject({ auto_return: 'approved' });
  expect(v.E.body).toMatchObject({ payer: { email: 'buyer1@example.com' } });
});

test('every body carries the currency, amount and external_reference', () => {
  for (const v of Object.values(byId()))
    expect(v.body).toMatchObject({
      external_reference: 'ref-1',
      items: [{ currency_id: 'ARS', unit_price: 100, quantity: 1 }],
    });
});

test('D uses the https tunnel, the others the http origin', () => {
  const v = byId();
  expect(JSON.stringify(v.D.body)).toContain('https://demo.trycloudflare.com');
  expect(JSON.stringify(v.B.body)).toContain('http://localhost:5858');
});

test('F opens sandbox_init_point and G keeps the real query string', () => {
  const v = byId();
  expect(v.F.open).toBe('sandbox_init_point');
  expect(v.A.open).toBe('init_point');
  expect(JSON.stringify(v.G.body)).toContain(
    '?ex=signup-event-paid&kit=default',
  );
});

test('D and E are skipped, with the reason, when their input is missing', () => {
  const v = byId({ ...cfg, httpsBase: undefined, payerEmail: undefined });
  expect(v.D.body).toBeNull();
  expect(v.D.skip).toContain('DIAG_HTTPS_URL');
  expect(v.E.body).toBeNull();
  expect(v.E.skip).toContain('MP_PAYER_EMAIL');
});
