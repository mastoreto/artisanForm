import { ArtisanForm, type FormSchema, mockPayment } from 'artisanform';
import { stripe } from 'artisanform/payments/stripe';
import { useState } from 'react';

const scheme: FormSchema = {
  steps: [
    {
      title: 'Plan',
      fields: [
        {
          type: 'radio',
          name: 'plan',
          label: 'Plan',
          required: true,
          options: [
            { value: 'pro', label: 'Pro' },
            { value: 'team', label: 'Team' },
          ],
        },
      ],
    },
    {
      title: 'Pago',
      kind: 'payment',
      providers: ['card', 'hosted', 'declined', 'stripe'],
      summary: 'Total a pagar lo calcula tu servidor.',
    },
    { title: 'Listo', kind: 'result', message: 'Pago registrado' },
  ],
};

// Real Stripe plugin whose backend never answers: shows the loading state.
const payments = [
  stripe({
    publishableKey: 'pk_test_playground',
    name: 'Stripe (cargando)',
    createPaymentIntent: () => new Promise(() => {}),
  }),
  mockPayment({ id: 'card', name: 'Tarjeta (embebido)', delay: 300 }),
  mockPayment({ id: 'hosted', name: 'Checkout (redirect)', mode: 'redirect' }),
  mockPayment({
    id: 'declined',
    name: 'Tarjeta rechazada',
    outcome: 'failed',
    delay: 300,
  }),
];

const Payments = () => {
  const [result, setResult] = useState<unknown>(null);
  return (
    <>
      <ArtisanForm
        scheme={scheme}
        persistKey="playground-payments"
        plugins={{ payments }}
        onSubmit={(values) => setResult(values)}
      />
      {result !== null && (
        <pre
          data-testid="result"
          className="mt-6 rounded bg-gray-100 p-3 text-xs"
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </>
  );
};

export default Payments;
