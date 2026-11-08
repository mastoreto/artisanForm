import {
  ArtisanForm,
  type FieldRegistry,
  type StepRegistry,
} from 'artisanform';
import { useState } from 'react';
import { acme } from '../ui/acme';
import contact from '../ui/contact.json';

/** A custom field type, registered locally; the JSON only says `x-satisfaction`. */
const fields: FieldRegistry = {
  satisfaction: {
    initialValues: (f) => ({ [f.name]: '' }),
    rules: () => ({}),
    render: (f) => (
      <fieldset>
        <legend>{f.label}</legend>
        {['😞', '😐', '😀'].map((face, i) => (
          <button
            key={face}
            type="button"
            aria-label={`${i + 1}`}
            onClick={() => undefined}
          >
            {face}
          </button>
        ))}
      </fieldset>
    ),
  },
};

/** A custom step that uses only the public step API. */
const stepTypes: StepRegistry = {
  verify: {
    render: ({ api }) => (
      <div>
        <p>Confirm your identity to continue.</p>
        <button
          type="button"
          onClick={() => {
            api.setValue('verified', true);
            void api.next();
          }}
        >
          I am human
        </button>
      </div>
    ),
    controls: { hidden: true },
  },
};

/** A JSON schema rendered with local extensions and a custom UI. */
const Extensions = () => {
  const [result, setResult] = useState<unknown>(null);
  return (
    <>
      <ArtisanForm
        scheme={contact}
        fields={fields}
        stepTypes={stepTypes}
        components={acme}
        unstyled
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

export default Extensions;
