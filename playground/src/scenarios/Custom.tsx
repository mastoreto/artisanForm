import { ArtisanForm } from 'artisanform';
import { useState } from 'react';
import { acme } from '../ui/acme';

/** A custom design system plugged in through `components`: the engine is untouched. */
const Custom = () => {
  const [result, setResult] = useState<unknown>(null);
  return (
    <>
      <ArtisanForm
        components={acme}
        unstyled
        scheme={{
          steps: [
            {
              title: 'Account',
              fields: [
                {
                  type: 'text',
                  name: 'name',
                  label: 'Name',
                  required: true,
                  min: 3,
                  helperText: 'At least 3 letters',
                },
                {
                  type: 'email',
                  name: 'email',
                  label: 'Email',
                  required: true,
                },
              ],
            },
            {
              title: 'Plan',
              fields: [
                {
                  type: 'select',
                  name: 'plan',
                  label: 'Plan',
                  options: [
                    { value: 'free', label: 'Free' },
                    { value: 'pro', label: 'Pro' },
                  ],
                },
              ],
            },
          ],
        }}
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

export default Custom;
