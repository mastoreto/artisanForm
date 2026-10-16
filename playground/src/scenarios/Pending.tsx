import { ArtisanForm, type FormSchema, polling } from 'artisanform';
import { useState } from 'react';

// Pretends to ask a service whether the order is confirmed.
let calls = 0;
const confirmation = polling(
  async ({ values }) => {
    calls += 1;
    if (values.simulateFailure) {
      return {
        status: 'failed',
        message: 'The service rejected the operation',
      };
    }
    return calls < 3
      ? {
          status: 'pending',
          message: `Querying the service (attempt ${calls})…`,
        }
      : { status: 'success', data: 'ORD-1234' };
  },
  { interval: 500 },
);

const scheme: FormSchema = {
  steps: [
    {
      title: 'Request',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        {
          type: 'checkbox',
          name: 'simulateFailure',
          label: 'Simulate failure',
        },
      ],
      onEnter: () => {
        calls = 0;
      },
    },
    {
      title: 'Confirming',
      kind: 'pending',
      wait: confirmation,
      resultName: 'orderId',
    },
    { title: 'Done', kind: 'result', message: 'Operation confirmed' },
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
