import { expect, test } from 'bun:test';
import { checkSchema, describeCapabilities } from '..';

const schema = (extra: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id: 'f',
  steps: [
    {
      id: 'a',
      type: 'form',
      title: 'A',
      hooks: { beforeNext: 'verify' },
      fields: [
        { name: 'country', type: 'select', optionsSource: 'countries' },
        { name: 'doc', type: 'file', storage: 'cloud' },
      ],
    },
    { id: 'pay', type: 'payment', title: 'Pay', providers: ['stripe'] },
    { id: 'w', type: 'wait', title: 'Wait', strategy: 'orderStatus' },
  ],
  ...extra,
});

const summary = (r: ReturnType<typeof checkSchema>) =>
  r.issues.map((i) => `${i.severity}:${i.code}@${i.path}`);

test('a valid schema passes with no manifest and reports what it references', () => {
  const r = checkSchema(schema());
  expect(r.ok).toBe(true);
  expect(r.schema?.id).toBe('f');
  expect(r.references?.hooks).toEqual(['verify']);
  expect(r.references?.paymentProviders).toEqual(['stripe']);
});

test('it never throws, whatever it is given', () => {
  for (const input of [null, undefined, 42, 'x', [], () => 1, { a: 1n }]) {
    const r = checkSchema(input as never);
    expect(r.ok).toBe(false);
    expect(r.issues[0]?.severity).toBe('error');
  }
});

test('parse errors stop at the contract and carry no references', () => {
  const r = checkSchema({ ...schema(), steps: [] });
  expect(r.ok).toBe(false);
  expect(r.schema).toBeUndefined();
  expect(summary(r)).toEqual(['error:empty-steps@steps']);
});

test('policy and limits go through to the parser', () => {
  expect(summary(checkSchema(schema(), { limits: { maxSteps: 2 } }))).toEqual([
    'error:too-many-steps@steps',
  ]);
  const r = checkSchema(schema(), { policy: { hooks: ['verify'] } });
  expect(r.ok).toBe(false);
  expect(r.issues.every((i) => i.code === 'policy-violation')).toBe(true);
});

test('capabilities: blocking things are errors, degradable ones warnings', () => {
  const r = checkSchema(schema(), { manifest: describeCapabilities() });
  expect(r.ok).toBe(false);
  expect(summary(r).sort()).toEqual(
    [
      'error:missing-reference@steps[0].hooks.beforeNext',
      'warning:missing-reference@steps[0].fields[0].optionsSource',
      'warning:missing-reference@steps[0].fields[1].storage',
      'error:missing-reference@steps[1].providers[0]',
      'error:missing-reference@steps[2].strategy',
    ].sort(),
  );
});

test('with everything registered it is clean', () => {
  const manifest = describeCapabilities({
    extensions: {
      hooks: { verify: 1 },
      options: { countries: 1 },
      waits: { orderStatus: 1 },
    },
    paymentProviders: ['stripe'],
    storage: ['cloud'],
  });
  const r = checkSchema(schema(), { manifest });
  expect(r.ok).toBe(true);
  expect(r.issues).toEqual([]);
});

test('lint warnings come with the rest and can be turned off', () => {
  const s = schema();
  (s.steps[0] as { fields: unknown[] }).fields.push({
    name: 'c',
    type: 'select',
    options: [{ value: 'a', label: 'A' }],
    defaultValue: 'z',
  });
  expect(summary(checkSchema(s))).toEqual([
    'warning:default-not-an-option@steps[0].fields[2].defaultValue',
  ]);
  expect(checkSchema(s, { lint: false }).issues).toEqual([]);
});

test('an unregistered custom field is a warning; a bad config is an error', () => {
  const s = {
    schemaVersion: 1,
    id: 'f',
    steps: [
      {
        id: 'a',
        type: 'form',
        title: 'A',
        fields: [
          { name: 'r', type: 'x-stars', config: { max: 99 } },
          { name: 'q', type: 'x-other' },
        ],
      },
    ],
  };
  const manifest = describeCapabilities({
    customTypes: [
      {
        type: 'x-stars',
        kind: 'field',
        config: {
          type: 'object',
          properties: { max: { type: 'integer', maximum: 10 } },
        },
      },
    ],
  });
  expect(summary(checkSchema(s, { manifest }))).toEqual([
    'error:invalid-config@steps[0].fields[0].config.max',
    'warning:unsupported-field-type@steps[0].fields[1].type',
  ]);
});
