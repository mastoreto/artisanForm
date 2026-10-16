import { ArtisanForm, type FormSchema, polling } from 'artisanform';
import { useState } from 'react';

// Pretends to ask a service whether the order is confirmed.
let calls = 0;
const confirmation = polling(
  async ({ values }) => {
    calls += 1;
    if (values.simulateFailure) {
      return { status: 'failed', message: 'El servicio rechazó la operación' };
    }
    return calls < 3
      ? {
          status: 'pending',
          message: `Consultando al servicio (intento ${calls})…`,
        }
      : { status: 'success', data: 'ORD-1234' };
  },
  { interval: 500 },
);

const scheme: FormSchema = {
  steps: [
    {
      title: 'Solicitud',
      fields: [
        { type: 'text', name: 'name', label: 'Nombre', required: true },
        { type: 'checkbox', name: 'simulateFailure', label: 'Simular fallo' },
      ],
      onEnter: () => {
        calls = 0;
      },
    },
    {
      title: 'Confirmando',
      kind: 'pending',
      wait: confirmation,
      resultName: 'orderId',
    },
    { title: 'Listo', kind: 'result', message: 'Operación confirmada' },
  ],
};

const Pending = () => {
  const [result, setResult] = useState<unknown>(null);
  return (
    <>
      <ArtisanForm scheme={scheme} onSubmit={(values) => setResult(values)} />
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

export default Pending;
