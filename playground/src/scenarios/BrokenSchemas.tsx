import { ArtisanForm } from 'artisanform';
import { useState } from 'react';

/**
 * Schemas that cannot run, on one page: none of them may blank the page. The
 * issues are listed by `onSchemaIssues` (see the log) and each form shows its
 * own message, while the healthy form next to them keeps working.
 */
const cases: Record<string, unknown> = {
  'No steps': { schemaVersion: 1, id: 'empty', steps: [] },
  'Unknown step type': {
    schemaVersion: 1,
    id: 'unknown-step',
    steps: [{ id: 'm', type: 'x-map', title: 'Map' }],
  },
  'Payment provider not registered': {
    schemaVersion: 1,
    id: 'no-provider',
    steps: [
      { id: 'p', type: 'payment', title: 'Pay', providers: ['acme-pay'] },
    ],
  },
  'Not even an object': 'this is not a schema',
};

const healthy = {
  schemaVersion: 1,
  id: 'healthy',
  steps: [
    {
      id: 'a',
      type: 'form',
      title: 'Healthy form',
      fields: [
        { name: 'name', type: 'text', label: 'Name' },
        { name: 'stars', type: 'x-stars', label: 'Not registered' },
      ],
    },
  ],
} as const;

const BrokenSchemas = () => {
  const [log, setLog] = useState<string[]>([]);
  const report = (name: string) => (issues: { code: string }[]) =>
    setLog((l) => [...l, `${name}: ${issues.map((i) => i.code).join(', ')}`]);
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {Object.entries(cases).map(([name, scheme]) => (
        <section key={name} data-testid={`case-${name}`}>
          <h3>{name}</h3>
          <ArtisanForm
            scheme={scheme as never}
            onSchemaIssues={report(name)}
            onSubmit={() => {}}
          />
        </section>
      ))}
      <section data-testid="case-healthy">
        <h3>A custom field that is not registered only warns</h3>
        <ArtisanForm
          scheme={healthy as never}
          onSchemaIssues={report('healthy')}
          onSubmit={() => {}}
        />
      </section>
      <pre data-testid="issue-log">{log.join('\n')}</pre>
    </div>
  );
};

export default BrokenSchemas;
