// Sandbox data shown beside the payment step. Only methods whose payment
// happens ON the page are listed (the user types the data here); a method that
// sends the user to the provider asks for it on the provider's own page.

export interface TestRow {
  label: string;
  value: string;
  /** Free text rather than something to paste: no copy button. */
  plain?: boolean;
}

export interface TestData {
  rows: TestRow[];
  note?: string;
}

/** By plugin id (see payments.ts). */
export const testData: Record<string, TestData> = {
  stripe: {
    rows: [
      { label: 'Card', value: '4242 4242 4242 4242' },
      { label: 'Expiry', value: 'Any future date', plain: true },
      { label: 'CVC', value: 'Any 3 digits', plain: true },
      { label: '3-D Secure card', value: '4000 0027 6000 3184' },
    ],
  },
  paypal: {
    rows: [
      {
        label: 'Account',
        value: 'A sandbox personal account from the PayPal developer dashboard',
        plain: true,
      },
    ],
  },
  mercadopago: {
    rows: [
      { label: 'Card', value: '5031 7557 3453 0604' },
      { label: 'Expiry', value: '11/30' },
      { label: 'CVV', value: '123' },
      { label: 'Name', value: 'APRO' },
      { label: 'ID (CI)', value: '1.234.567-2' },
      { label: 'E-mail', value: 'buyer1@example.com' },
    ],
    note: 'Not an @testuser.com address and not your own Mercado Pago account.',
  },
};

export interface PanelPlugin {
  id: string;
  name: string;
  mode: 'embedded' | 'redirect';
}

/**
 * What the panel shows. With no method chosen: every on-page method that has
 * test data. With one chosen: only that one; if it takes the user to the
 * provider's page, nothing is listed and `offsite` says which.
 */
export const panelFor = <T extends PanelPlugin>(
  plugins: readonly T[],
  active: string | null,
): { shown: T[]; offsite?: T } => {
  const chosen = active ? plugins.find((p) => p.id === active) : undefined;
  if (chosen?.mode === 'redirect') return { shown: [], offsite: chosen };
  const onPage = plugins.filter((p) => p.mode === 'embedded' && testData[p.id]);
  return { shown: chosen ? onPage.filter((p) => p.id === chosen.id) : onPage };
};
