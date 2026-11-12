import { describe, expect, test } from 'bun:test';
import type { ArtisanExtensions } from '../../engine/extensions';
import {
  type ArtisanSchemaV1,
  CAPABILITIES_CONTRACT,
  type CapabilitiesManifest,
  checkCapabilities,
  collectReferences,
  describeCapabilities,
  FEATURES,
  listReferences,
  normalizeArtisanSchema,
} from '..';

// A schema that names one of everything a front end must provide.
const schema = {
  schemaVersion: 1,
  id: 'caps',
  steps: [
    {
      id: 'a',
      type: 'form',
      title: 'A',
      hooks: { beforeNext: 'check', onEnter: 'track' },
      next: [{ to: 'wait' }],
      fields: [
        { type: 'text', name: 'n' },
        { type: 'select', name: 'plan', optionsSource: 'plans' },
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          options: [{ value: 'a', label: 'A' }],
          dependentOptionsSource: 'cities',
        },
        { type: 'file', name: 'cv', storage: 'docs' },
        { type: 'x-stars', name: 'stars' },
        {
          type: 'array',
          name: 'rows',
          itemFields: [
            { type: 'combobox', name: 'lang', optionsSource: 'langs' },
          ],
        },
      ],
    },
    { id: 'pay', type: 'payment', title: 'Pay', providers: ['stripe', 'mp'] },
    {
      id: 'wait',
      type: 'wait',
      title: 'Wait',
      strategy: 'order',
      timeoutMs: 5000,
    },
    { id: 'sum', type: 'custom', title: 'Sum', renderer: 'summary' },
    {
      id: 'end',
      type: 'result',
      title: 'End',
      actions: [{ label: 'Home', action: 'home' }],
    },
  ],
} as unknown as ArtisanSchemaV1;

// A front end that has all of it.
const extensions: ArtisanExtensions = {
  hooks: { check: () => undefined, track: () => undefined },
  waits: { order: { subscribe: () => () => {} } },
  renderers: { summary: () => null },
  actions: { home: () => {} },
  options: { plans: async () => [], langs: async () => [] },
  dependentOptions: { cities: async () => [] },
};
const front = () =>
  describeCapabilities({
    extensions,
    paymentProviders: ['stripe', 'mp'],
    storage: ['docs'],
    fieldTypes: ['x-stars'],
  });

describe('collectReferences', () => {
  test('lists every kind of reference, sorted and unique', () => {
    expect(collectReferences(schema)).toEqual({
      hooks: ['check', 'track'],
      waits: ['order'],
      renderers: ['summary'],
      actions: ['home'],
      options: ['langs', 'plans'],
      dependentOptions: ['cities'],
      paymentProviders: ['mp', 'stripe'],
      storage: ['docs'],
      fieldTypes: [
        'array',
        'combobox',
        'dynamicSelect',
        'file',
        'select',
        'text',
        'x-stars',
      ],
      stepKinds: ['custom', 'form', 'payment', 'result', 'wait'],
      features: ['transitions', 'wait-options', 'options-source-choice'],
    });
  });

  test('finds references inside array rows, with their paths', () => {
    const refs = listReferences(schema);
    expect(refs).toContainEqual({
      kind: 'options',
      id: 'langs',
      path: 'steps[0].fields[5].itemFields[0].optionsSource',
    });
    expect(refs).toContainEqual({
      kind: 'hooks',
      id: 'check',
      path: 'steps[0].hooks.beforeNext',
    });
    expect(refs).toContainEqual({
      kind: 'actions',
      id: 'home',
      path: 'steps[4].actions[0].action',
    });
    expect(refs).toContainEqual({
      kind: 'paymentProviders',
      id: 'mp',
      path: 'steps[1].providers[1]',
    });
  });

  test('a schema that names nothing requires nothing', () => {
    const plain = {
      schemaVersion: 1,
      id: 'p',
      steps: [
        {
          id: 'a',
          type: 'form',
          title: 'A',
          fields: [{ type: 'text', name: 'n' }],
        },
      ],
    } as ArtisanSchemaV1;
    const r = collectReferences(plain);
    expect([
      r.hooks,
      r.waits,
      r.renderers,
      r.actions,
      r.options,
      r.paymentProviders,
      r.storage,
      r.features,
    ]).toEqual([[], [], [], [], [], [], [], []]);
  });

  test('accepts a normalized schema', () => {
    expect(collectReferences(normalizeArtisanSchema(schema)).waits).toEqual([
      'order',
    ]);
  });
});

describe('describeCapabilities', () => {
  test('is JSON-serializable and reports what the front registered', () => {
    const m = JSON.parse(JSON.stringify(front())) as CapabilitiesManifest;
    expect(m.contract).toBe(CAPABILITIES_CONTRACT);
    expect(m.refs.hooks).toEqual(['check', 'track']);
    expect(m.refs.paymentProviders).toEqual(['mp', 'stripe']);
    expect(m.fieldTypes).toContain('x-stars');
    expect(m.fieldTypes).toContain('text');
    expect(m.features).toEqual([...FEATURES]);
  });

  test('with nothing registered it still lists the native types', () => {
    const m = describeCapabilities();
    expect(m.refs.hooks).toEqual([]);
    expect(m.fieldTypes).toContain('select');
    expect(m.stepKinds).toContain('wait');
  });
});

describe('checkCapabilities', () => {
  test('a front that has everything can run the schema', () => {
    expect(checkCapabilities(schema, front())).toEqual([]);
  });

  test('reports each missing reference with its kind, id and path', () => {
    const m = front();
    m.refs.hooks = ['track'];
    m.refs.waits = [];
    m.refs.options = ['langs'];
    m.refs.paymentProviders = ['stripe'];
    expect(checkCapabilities(schema, m)).toEqual([
      {
        code: 'missing-reference',
        kind: 'hooks',
        id: 'check',
        path: 'steps[0].hooks.beforeNext',
      },
      {
        code: 'missing-reference',
        kind: 'options',
        id: 'plans',
        path: 'steps[0].fields[1].optionsSource',
      },
      {
        code: 'missing-reference',
        kind: 'paymentProviders',
        id: 'mp',
        path: 'steps[1].providers[1]',
      },
      {
        code: 'missing-reference',
        kind: 'waits',
        id: 'order',
        path: 'steps[2].strategy',
      },
    ]);
  });

  test('a custom field type the front did not register is reported', () => {
    const m = describeCapabilities({
      extensions,
      paymentProviders: ['stripe', 'mp'],
      storage: ['docs'],
    });
    expect(checkCapabilities(schema, m)).toContainEqual({
      code: 'unsupported-field-type',
      id: 'x-stars',
      path: 'steps[0].fields[4].type',
    });
  });

  test('an unknown step kind is reported', () => {
    const s = {
      schemaVersion: 1,
      id: 'k',
      steps: [{ id: 'a', type: 'x-fancy', title: 'A' }],
    } as unknown as ArtisanSchemaV1;
    expect(checkCapabilities(s, describeCapabilities())).toEqual([
      { code: 'unsupported-step-kind', id: 'x-fancy', path: 'steps[0].type' },
    ]);
    expect(
      checkCapabilities(s, describeCapabilities({ stepKinds: ['x-fancy'] })),
    ).toEqual([]);
  });

  test('a feature an older front lacks is reported, so a newer schema is refused', () => {
    const m = front();
    m.features = ['transitions'];
    expect(
      checkCapabilities(schema, m)
        .filter((i) => i.code === 'missing-feature')
        .map((i) => i.id),
    ).toEqual(['wait-options', 'options-source-choice']);
  });

  test('a manifest from another contract version is not trusted', () => {
    const m = {
      ...front(),
      contract: 'artisanform.capabilities/2',
    } as unknown as CapabilitiesManifest;
    expect(checkCapabilities(schema, m)).toEqual([
      {
        code: 'unsupported-contract',
        id: 'artisanform.capabilities/2',
        path: '',
      },
    ]);
  });

  test('a manifest that was stored and read back as JSON still works', () => {
    const stored = JSON.parse(JSON.stringify(front())) as CapabilitiesManifest;
    expect(checkCapabilities(schema, stored)).toEqual([]);
  });
});
