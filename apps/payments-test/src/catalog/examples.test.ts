import { expect, test } from 'bun:test';
import { mockPayment, parseArtisanSchema } from 'artisanform';
import { examples } from './examples';

// The smallest check that fails when an example drifts from the v1 contract.
test.each(examples.map((e) => [e.id, e] as const))('%s parses', (_id, e) => {
  const { scheme, extensions } = e.build({
    plugins: [mockPayment()],
    real: false,
    restart: () => {},
  });
  const parsed = parseArtisanSchema(scheme);
  expect(parsed.issues.filter((i) => i.severity === 'error')).toEqual([]);
  expect(parsed.success).toBe(true);
  // Every strategy/hook/action the schema names is registered.
  const refs = JSON.stringify(scheme);
  for (const [kind, key] of [
    ['waits', 'strategy'],
    ['hooks', 'beforeNext'],
    ['actions', 'action'],
  ] as const)
    for (const [, id] of refs.matchAll(new RegExp(`"${key}":"([^"]+)"`, 'g')))
      expect(Object.keys(extensions?.[kind] ?? {})).toContain(id);
});
