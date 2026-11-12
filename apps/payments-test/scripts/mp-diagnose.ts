// Creates Mercado Pago Checkout Pro preferences in controlled variants so the
// cause of "algo salió mal" after paying can be isolated with evidence.
//
//   cd apps/payments-test
//   node --env-file-if-exists=.env.local scripts/mp-diagnose.ts            # all variants
//   node --env-file-if-exists=.env.local scripts/mp-diagnose.ts B E F      # some of them
//   node --env-file-if-exists=.env.local scripts/mp-diagnose.ts --user     # only check the seller account
//
// Env: MP_ACCESS_TOKEN (required), MP_CURRENCY, MP_CHECKOUT_PAYER_EMAIL (the TEST BUYER's e-mail),
// MP_PAYER_EMAIL (the Brick's, only for variant H),
// DIAG_HTTP_URL (default http://localhost:5858), DIAG_HTTPS_URL (tunnel, for D),
// DIAG_AMOUNT (default 100).
//
// It creates real preferences in the account of the token: use the TEST
// seller. Open each printed URL in a PRIVATE window logged in as the TEST
// BUYER (a different user from the seller, same country) and pay with an
// official test card. The token is never printed.
import { SITE_CURRENCY, type VariantId, variants } from './mp-variants.ts';

const API = 'https://api.mercadopago.com';
const token = process.env.MP_ACCESS_TOKEN;
if (!token) {
  console.error('MP_ACCESS_TOKEN is not set (see .env.example).');
  process.exit(1);
}

const call = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON: keep the text
  }
  return { status: res.status, json, text };
};

const cfg = {
  currency: process.env.MP_CURRENCY ?? 'USD',
  amount: Number(process.env.DIAG_AMOUNT ?? 100),
  httpBase: (process.env.DIAG_HTTP_URL ?? 'http://localhost:5858').replace(
    /\/$/,
    '',
  ),
  httpsBase: process.env.DIAG_HTTPS_URL?.replace(/\/$/, ''),
  payerEmail: process.env.MP_CHECKOUT_PAYER_EMAIL,
  brickPayerEmail: process.env.MP_PAYER_EMAIL,
};

// The account behind the token: its site decides the currency it accepts.
const user = await call('/users/me');
const seller = user.json ?? {};
const site = String(seller.site_id ?? '?');
console.log(
  `token kind: ${token.startsWith('TEST-') ? 'TEST-' : token.slice(0, 7)}…  seller site: ${site}  ` +
    `accepted currency: ${SITE_CURRENCY[site] ?? '?'}  configured: ${cfg.currency}`,
);
if (SITE_CURRENCY[site] && SITE_CURRENCY[site] !== cfg.currency)
  console.log(
    `!! MP_CURRENCY (${cfg.currency}) does not match the seller site (${SITE_CURRENCY[site]})`,
  );
if (cfg.payerEmail && cfg.payerEmail === seller.email)
  console.log(
    "!! MP_CHECKOUT_PAYER_EMAIL is the seller's own e-mail: the buyer must be a different test user",
  );
if (cfg.brickPayerEmail)
  console.log(
    'note: MP_PAYER_EMAIL (the Brick workaround) is set; Checkout Pro no longer sends it. Variant H sends it on purpose.',
  );
if (
  token.startsWith('TEST-') &&
  cfg.brickPayerEmail &&
  !/@testuser\.com$/i.test(cfg.brickPayerEmail)
)
  console.log(
    '!! a TEST seller with a payer that is not a test buyer (variant H) is what ends in "una de las partes ... es de prueba"',
  );

const wanted = process.argv
  .slice(2)
  .filter((a) => /^[A-H]$/.test(a)) as VariantId[];
if (process.argv.includes('--user')) process.exit(0);

const reference = `diag-${Date.now()}`;
for (const v of variants(cfg, reference)) {
  if (wanted.length && !wanted.includes(v.id)) continue;
  console.log(`\n=== ${v.id}: ${v.title}`);
  if (!v.body) {
    console.log(`skipped: ${v.skip}`);
    continue;
  }
  console.log(`request: ${JSON.stringify(v.body)}`);
  const r = await call('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(v.body),
  });
  if (r.status >= 300) {
    console.log(`MP rejected it: HTTP ${r.status} ${r.text.slice(0, 400)}`);
    continue;
  }
  const url = r.json?.[v.open];
  console.log(`created ${String(r.json?.id)}`);
  console.log(`OPEN (${v.open}): ${String(url)}`);
}
console.log(
  '\nNow open each URL in a private window as the TEST BUYER and note: A..G -> paid / "algo salió mal" / returned to the app.',
);
