import { type BuilderResult, FormBuilder } from 'artisanform/builder';
import { describeCapabilities } from 'artisanform/schema';
import 'artisanform/builder.css';
import { useMemo, useState } from 'react';

/**
 * The visual form builder. The schema it produces is shown below so the e2e
 * test can read it; `?mode=advanced` opens the advanced mode.
 */
const Builder = () => {
  const params = new URLSearchParams(location.search);
  const [result, setResult] = useState<BuilderResult | undefined>();
  const [saved, setSaved] = useState<string | undefined>();
  const manifest = useMemo(
    () =>
      describeCapabilities({
        customTypes: [
          {
            type: 'x-satisfaction',
            kind: 'field',
            config: {
              type: 'object',
              properties: {
                scale: { type: 'integer', minimum: 3, maximum: 10 },
              },
            },
          },
        ],
      }),
    [],
  );
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <FormBuilder
        manifest={manifest}
        mode={params.get('mode') === 'advanced' ? 'advanced' : 'simple'}
        onChange={setResult}
        onSave={(payload) => setSaved(payload.hash)}
      />
      <pre
        data-testid="schema-json"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable (axe: scrollable-region-focusable)
        tabIndex={0}
        style={{ maxHeight: 240, overflow: 'auto' }}
      >
        {result ? JSON.stringify(result.schema, null, 2) : ''}
      </pre>
      <p data-testid="ok">{result ? String(result.ok) : ''}</p>
      <p data-testid="saved">{saved ?? ''}</p>
    </div>
  );
};

export default Builder;
