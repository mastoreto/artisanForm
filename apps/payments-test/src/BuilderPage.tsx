import 'artisanform/builder.css';
import { type ArtisanUiKit, mockPayment } from 'artisanform';
import {
  type BuilderResult,
  FormBuilder,
  type SavePayload,
} from 'artisanform/builder';
import { useMemo, useState } from 'react';
import { examples } from './catalog/examples';

const params = new URLSearchParams(location.search);

const snippet = `import 'artisanform/style.css';
import 'artisanform/builder.css';
import { FormBuilder } from 'artisanform/builder';

<FormBuilder
  defaultValue={stored}                       // an ArtisanSchemaV1, or nothing
  onChange={({ schema, ok }) => setDraft(schema)}
  onSave={({ schema, hash }) => api.save(schema, hash)}
/>

// later, anywhere (even another app):
<ArtisanForm scheme={savedSchema} onSubmit={send} />`;

/**
 * The visual builder, as a CRM would embed it: build a form, see it live,
 * save the schema. `?from=<example>` starts from one of the catalog's forms.
 */
const BuilderPage = ({ kit }: { kit?: ArtisanUiKit }) => {
  const start = useMemo(() => {
    const from = examples.find((e) => e.id === params.get('from'));
    return from
      ? from.build({ plugins: [mockPayment()], real: false, restart: () => {} })
          .scheme
      : undefined;
  }, []);
  const [draft, setDraft] = useState<BuilderResult | null>(null);
  const [saved, setSaved] = useState<SavePayload | null>(null);
  return (
    <>
      <header className="hero">
        <h2>Visual form builder</h2>
        <p>
          Drag inputs from the palette, set them up, watch the live preview and
          take the schema out. This is what a CRM or admin panel embeds, so
          people who do not write JSON can build forms.
        </p>
        <p className="tags">
          {[
            'artisanform/builder',
            'drag and drop',
            'live preview',
            'schema v1',
          ].map((f) => (
            <code key={f} className="tag">
              {f}
            </code>
          ))}
        </p>
        <p>
          Start from a catalog form:{' '}
          {examples.map((e) => (
            <a
              key={e.id}
              className="tag"
              href={`?ex=builder&from=${e.id}&kit=${params.get('kit') ?? 'default'}`}
            >
              {e.title}
            </a>
          ))}
        </p>
      </header>
      <FormBuilder
        key={params.get('from') ?? 'blank'}
        defaultValue={start}
        mode={params.get('mode') === 'advanced' ? 'advanced' : 'simple'}
        onChange={setDraft}
        onSave={setSaved}
        previewProps={{
          kit,
          plugins: { payments: [mockPayment()] },
        }}
      />
      <section aria-label="Output">
        <h3 className="group-title">What you get</h3>
        <p>
          {draft
            ? draft.ok
              ? 'A valid schema. '
              : `${draft.issues.filter((i) => i.severity === 'error').length} error(s) to fix before saving. `
            : 'Edit the form to see its schema. '}
          {saved ? `Saved (hash ${saved.hash.slice(0, 12)}…).` : null}
        </p>
        {draft && (
          <pre className="result">{JSON.stringify(draft.schema, null, 2)}</pre>
        )}
        <h3 className="group-title">How to use it</h3>
        <pre className="result">{snippet}</pre>
      </section>
    </>
  );
};

export default BuilderPage;
