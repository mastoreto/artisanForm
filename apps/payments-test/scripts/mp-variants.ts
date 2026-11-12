// Pure builders for the Mercado Pago Checkout Pro diagnosis (no network, no
// secrets): each variant changes ONE thing from the previous one, so the first
// variant that behaves differently isolates the cause. See mp-diagnose.ts.

export type VariantId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface DiagConfig {
  currency: string;
  amount: number;
  /** Origin of the app over plain http (where the app really runs), e.g. http://localhost:5858 */
  httpBase: string;
  /** https tunnel to the app (e.g. cloudflared). Needed for variant D. */
  httpsBase?: string;
  /** The TEST BUYER's own e-mail (MP_CHECKOUT_PAYER_EMAIL). Needed for variant E. */
  payerEmail?: string;
  /** The Brick's MP_PAYER_EMAIL, an ordinary address. Variant H sends it to show what it does. */
  brickPayerEmail?: string;
}

export interface Variant {
  id: VariantId;
  title: string;
  /** Preference body; `null` when the variant cannot run with this config. */
  body: Record<string, unknown> | null;
  /** Why it was skipped. */
  skip?: string;
  /** Which URL of the response to open with the TEST BUYER. */
  open: 'init_point' | 'sandbox_init_point';
}

/** The currency each Mercado Pago site (the seller's country) accepts. */
export const SITE_CURRENCY: Record<string, string> = {
  MLA: 'ARS',
  MLB: 'BRL',
  MLC: 'CLP',
  MCO: 'COP',
  MLM: 'MXN',
  MPE: 'PEN',
  MLU: 'UYU',
};

const urls = (base: string, query = '') => ({
  success: `${base}/${query}`,
  failure: `${base}/${query}`,
  pending: `${base}/${query}`,
});

export const variants = (cfg: DiagConfig, reference: string): Variant[] => {
  const items = [
    {
      title: 'Diagnostic item',
      quantity: 1,
      unit_price: cfg.amount,
      currency_id: cfg.currency,
    },
  ];
  const minimal = { items, external_reference: reference };
  const withBack = { ...minimal, back_urls: urls(cfg.httpBase) };

  return [
    {
      id: 'A',
      title: 'minimal: items, currency and external_reference only',
      body: minimal,
      open: 'init_point',
    },
    {
      id: 'B',
      title: 'A + back_urls (plain http, no query string)',
      body: withBack,
      open: 'init_point',
    },
    {
      id: 'C',
      title: 'B + auto_return (expected to be rejected for http)',
      body: { ...withBack, auto_return: 'approved' },
      open: 'init_point',
    },
    {
      id: 'D',
      title: 'C over the https tunnel (auto_return is allowed)',
      body: cfg.httpsBase
        ? {
            ...minimal,
            back_urls: urls(cfg.httpsBase),
            auto_return: 'approved',
          }
        : null,
      skip: cfg.httpsBase ? undefined : 'set DIAG_HTTPS_URL to the tunnel URL',
      open: 'init_point',
    },
    {
      id: 'E',
      title: "B + payer.email = the TEST BUYER's own e-mail",
      body: cfg.payerEmail
        ? { ...withBack, payer: { email: cfg.payerEmail } }
        : null,
      skip: cfg.payerEmail
        ? undefined
        : 'set MP_CHECKOUT_PAYER_EMAIL to the test buyer e-mail',
      open: 'init_point',
    },
    {
      id: 'F',
      title: 'B, but open sandbox_init_point instead of init_point',
      body: withBack,
      open: 'sandbox_init_point',
    },
    {
      id: 'G',
      title: 'B with the query string the app really sends in back_urls',
      body: {
        ...minimal,
        back_urls: urls(cfg.httpBase, '?ex=signup-event-paid&kit=default'),
      },
      open: 'init_point',
    },
    {
      id: 'H',
      title:
        'B + the Brick MP_PAYER_EMAIL (an ordinary address): what the app used to send',
      body: cfg.brickPayerEmail
        ? { ...withBack, payer: { email: cfg.brickPayerEmail } }
        : null,
      skip: cfg.brickPayerEmail ? undefined : 'MP_PAYER_EMAIL is not set',
      open: 'init_point',
    },
  ];
};
