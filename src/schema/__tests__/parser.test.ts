import { describe, expect, test } from 'bun:test';
import {
  parseArtisanSchema,
  type SchemaLimits,
  type SchemaPolicy,
} from '../parser';

const valid = () => ({
  schemaVersion: 1,
  id: 'registration',
  revision: 2,
  title: 'Registration',
  ui: { layout: 'vertical' },
  steps: [
    {
      id: 'personal',
      type: 'form',
      title: 'Data',
      ui: { columns: 2 },
      fields: [
        {
          name: 'kind',
          type: 'radio',
          options: [
            { value: 'person', label: 'Person' },
            { value: 'company', label: 'Company' },
          ],
        },
        {
          name: 'email',
          type: 'email',
          required: true,
          validation: { maxLength: 255 },
          ui: { span: 2 },
        },
        {
          name: 'company',
          type: 'text',
          visibleWhen: { field: 'kind', operator: 'eq', value: 'company' },
        },
        { name: 'pw', type: 'password' },
        { name: 'pw2', type: 'password', validation: { sameAs: 'pw' } },
        {
          name: 'country',
          type: 'dynamicSelect',
          dependentName: 'city',
          options: [{ value: 'ar', label: 'AR' }],
          dependentOptions: { ar: [{ value: 'b', label: 'BA' }] },
        },
        { name: 'trip', type: 'daterange', endName: 'tripEnd' },
        {
          name: 'team',
          type: 'array',
          itemFields: [{ name: 'who', type: 'text' }],
          validation: { minItems: 1 },
        },
      ],
    },
    {
      id: 'confirm',
      type: 'wait',
      title: 'Confirming',
      strategy: 'orderStatus',
      failTo: 'personal',
    },
    {
      id: 'done',
      type: 'result',
      title: 'Done',
      visibleWhen: { all: [{ field: 'email', operator: 'filled' }] },
    },
  ],
});

const errors = (input: unknown, policy?: 'trusted' | SchemaPolicy) => {
  const r = parseArtisanSchema(input, { policy });
  return r.success
    ? []
    : r.issues
        .filter((i) => i.severity === 'error')
        .map((i) => `${i.code} @ ${i.path}`);
};

test('a valid schema parses and is returned untouched (no copy, no mutation)', () => {
  const input = valid();
  const before = JSON.stringify(input);
  const r = parseArtisanSchema(input);
  expect(r.success).toBe(true);
  if (r.success) expect(r.schema).toBe(input as never);
  expect(JSON.stringify(input)).toBe(before);
  // and the same schema coming from JSON text
  expect(parseArtisanSchema(JSON.parse(before)).success).toBe(true);
});

test('rejects non-objects and bad envelopes with readable paths', () => {
  expect(errors(null)).toEqual(['invalid-type @ $']);
  expect(errors([])).toEqual(['invalid-type @ $']);
  expect(errors('x')).toEqual(['invalid-type @ $']);
  expect(errors({ ...valid(), id: '' })).toContain('invalid-type @ id');
  expect(errors({ ...valid(), steps: [] })).toEqual(['empty-steps @ steps']);
  expect(errors({ ...valid(), steps: 'x' })).toEqual(['invalid-type @ steps']);
  expect(errors({ ...valid(), revision: -1 })).toEqual([
    'invalid-type @ revision',
  ]);
  expect(errors({ ...valid(), extra: 1 })).toEqual([
    'unknown-property @ $.extra',
  ]);
});

test('versions: missing hints at the legacy adapter, future and wrong are rejected', () => {
  const { schemaVersion: _drop, ...legacyLike } = valid();
  const missing = parseArtisanSchema(legacyLike);
  expect(missing.success).toBe(false);
  if (!missing.success) {
    expect(missing.issues[0].code).toBe('missing-version');
    expect(missing.issues[0].message).toContain('normalizeArtisanSchema');
  }
  expect(errors({ ...valid(), schemaVersion: 2 })).toEqual([
    'unsupported-version @ schemaVersion',
  ]);
  expect(errors({ ...valid(), schemaVersion: '1' })).toEqual([
    'unsupported-version @ schemaVersion',
  ]);
});

test('duplicate step ids and duplicate value names (including owned child/end names)', () => {
  const dupStep = valid();
  dupStep.steps[2].id = 'personal';
  expect(errors(dupStep)).toContain('duplicate-id @ steps[2].id');

  const dupName = valid();
  dupName.steps[0].fields?.push({ name: 'email', type: 'text' } as never);
  expect(errors(dupName)).toEqual(['duplicate-name @ steps[0].fields[8].name']);

  const dupOwned = valid();
  dupOwned.steps[0].fields?.push({ name: 'city', type: 'text' } as never);
  expect(errors(dupOwned)).toEqual([
    'duplicate-name @ steps[0].fields[8].name',
  ]);

  const dupEnd = valid();
  dupEnd.steps[0].fields?.push({ name: 'tripEnd', type: 'text' } as never);
  expect(errors(dupEnd)).toEqual(['duplicate-name @ steps[0].fields[8].name']);
});

test('unknown types and properties that do not belong to the element', () => {
  const unknownField = valid();
  unknownField.steps[0].fields?.push({ name: 'z', type: 'foo' } as never);
  expect(errors(unknownField)).toEqual([
    'unknown-type @ steps[0].fields[8].type',
  ]);

  const legacyKind = valid();
  (legacyKind.steps[1] as { type: string }).type = 'pending';
  const r = parseArtisanSchema(legacyKind);
  expect(r.success).toBe(false);
  if (!r.success)
    expect(r.issues.find((i) => i.code === 'unknown-type')?.message).toContain(
      '"wait"',
    );

  const wrongProp = valid();
  (wrongProp.steps[0].fields?.[1] as Record<string, unknown>).options = [];
  expect(errors(wrongProp)).toEqual([
    'unknown-property @ steps[0].fields[1].options',
  ]);

  const stepProp = valid();
  (stepProp.steps[2] as Record<string, unknown>).fields = [];
  expect(errors(stepProp)).toEqual(['unknown-property @ steps[2].fields']);

  const legacyProps = valid();
  Object.assign(legacyProps.steps[0].fields?.[1] as object, {
    min: 3,
    showIf: { field: 'x' },
    helperText: 'x',
  });
  expect(errors(legacyProps).sort()).toEqual([
    'unknown-property @ steps[0].fields[1].helperText',
    'unknown-property @ steps[0].fields[1].min',
    'unknown-property @ steps[0].fields[1].showIf',
  ]);
});

test('functions, NaN, undefined-in-arrays and class instances are not serializable', () => {
  const fn = valid();
  (fn.steps[0] as Record<string, unknown>).beforeNext = () => {};
  expect(errors(fn)).toEqual([
    'not-serializable @ $.steps[0].beforeNext',
    'unknown-property @ steps[0].beforeNext',
  ]);

  const nan = valid();
  (nan.steps[0].fields?.[0] as Record<string, unknown>).defaultValue =
    Number.NaN;
  expect(errors(nan)).toContain(
    'not-serializable @ $.steps[0].fields[0].defaultValue',
  );

  const date = valid();
  (date.steps[0].fields?.[0] as Record<string, unknown>).defaultValue =
    new Date();
  expect(errors(date)).toContain(
    'not-serializable @ $.steps[0].fields[0].defaultValue',
  );

  const holes = valid();
  (holes.steps[0].fields?.[0] as Record<string, unknown>).defaultValue = [
    undefined,
  ];
  expect(errors(holes)).toContain(
    'not-serializable @ $.steps[0].fields[0].defaultValue[0]',
  );
});

test('prototype pollution attempts are plain unknown properties', () => {
  const evil = JSON.parse(
    '{"schemaVersion":1,"id":"x","steps":[{"id":"s","type":"review","title":"S"}],"__proto__":{"polluted":true}}',
  );
  expect(errors(evil)).toEqual(['unknown-property @ $.__proto__']);
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});

test('conditions: operators, shapes, references and depth', () => {
  const withCond = (visibleWhen: unknown) => {
    const s = valid();
    (s.steps[0].fields?.[2] as Record<string, unknown>).visibleWhen =
      visibleWhen;
    return s;
  };
  const w = 'steps[0].fields[2].visibleWhen';
  expect(
    errors(withCond({ field: 'kind', operator: 'nope', value: 1 })),
  ).toEqual([`invalid-value @ ${w}.operator`]);
  expect(
    errors(withCond({ field: 'kind', operator: 'in', value: 'x' })),
  ).toEqual([`invalid-type @ ${w}.value`]);
  expect(errors(withCond({ field: 'kind', operator: 'eq' }))).toEqual([
    `missing-property @ ${w}.value`,
  ]);
  expect(
    errors(withCond({ field: 'kind', operator: 'filled', value: 1 })),
  ).toEqual([`unexpected-value @ ${w}.value`]);
  expect(errors(withCond({ field: 'ghost', operator: 'filled' }))).toEqual([
    `unknown-field-reference @ ${w}.field`,
  ]);
  expect(errors(withCond({ all: 'x' }))).toEqual([`invalid-type @ ${w}.all`]);
  expect(errors(withCond({ any: [], extra: 1 }))).toEqual([
    `unknown-property @ ${w}.extra`,
  ]);
  expect(
    errors(
      withCond({
        not: {
          field: 'kind',
          operator: 'eq',
          value: 'person',
          coerce: 'string',
        },
      }),
    ),
  ).toEqual([]);
  // references may point to fields of later steps, to owned names and to stored values
  expect(
    errors(
      withCond({
        all: [
          { field: 'city', operator: 'filled' },
          { field: 'tripEnd', operator: 'filled' },
          { field: 'payment', operator: 'empty' },
        ],
      }),
    ),
  ).toEqual([`unknown-field-reference @ ${w}.all[2].field`]);

  let deep: unknown = { field: 'kind', operator: 'filled' };
  for (let i = 0; i < 40; i++) deep = { not: deep };
  expect(errors(withCond(deep))).toContain(
    `too-deep @ steps[0].fields[2].visibleWhen${'.not'.repeat(33)}`,
  );
});

test('validation hints are checked per field family', () => {
  const field = (extra: Record<string, unknown>) => {
    const s = valid();
    Object.assign(s.steps[0].fields?.[1] as object, extra);
    return s;
  };
  const v = 'steps[0].fields[1].validation';
  expect(errors(field({ validation: { min: 3 } }))).toEqual([
    `unknown-property @ ${v}.min`,
  ]);
  expect(errors(field({ validation: { pattern: '(' } }))).toEqual([
    `invalid-pattern @ ${v}.pattern`,
  ]);
  expect(errors(field({ validation: { pattern: 'a'.repeat(501) } }))).toEqual([
    `invalid-pattern @ ${v}.pattern`,
  ]);
  expect(errors(field({ validation: { minLength: -1 } }))).toEqual([
    `invalid-type @ ${v}.minLength`,
  ]);
  expect(errors(field({ validation: { sameAs: 'ghost' } }))).toEqual([
    `unknown-field-reference @ ${v}.sameAs`,
  ]);
  expect(errors(field({ validation: 'x' }))).toEqual([`invalid-type @ ${v}`]);
});

test('required companions and array row limits', () => {
  const noOptions = valid();
  const first = (noOptions.steps[0] as { fields: Record<string, unknown>[] })
    .fields[0];
  delete first.options;
  expect(errors(noOptions)).toEqual([
    'missing-property @ steps[0].fields[0].options',
  ]);

  const rows = (itemFields: unknown) => {
    const s = valid();
    (s.steps[0].fields?.[7] as Record<string, unknown>).itemFields = itemFields;
    return s;
  };
  const p = 'steps[0].fields[7].itemFields';
  expect(errors(rows([]))).toEqual([`invalid-type @ ${p}`]);
  expect(
    errors(
      rows([
        { name: 'a', type: 'array', itemFields: [{ name: 'b', type: 'text' }] },
      ]),
    ),
  ).toContain(`unsupported-in-array @ ${p}[0].type`);
  expect(
    errors(
      rows([
        {
          name: 'a',
          type: 'text',
          visibleWhen: { field: 'kind', operator: 'filled' },
        },
      ]),
    ),
  ).toContain(`unsupported-in-array @ ${p}[0].visibleWhen`);
  expect(errors(rows([{ name: 'a', type: 'x-stars' }]))).toContain(
    `unsupported-in-array @ ${p}[0].type`,
  );
  expect(errors(rows([{ name: 'a', type: 'heading', text: 'x' }]))).toContain(
    `unsupported-in-array @ ${p}[0].type`,
  );
});

test('step references and step-specific required properties', () => {
  const badFailTo = valid();
  (badFailTo.steps[1] as Record<string, unknown>).failTo = 'nowhere';
  expect(errors(badFailTo)).toEqual([
    'unknown-step-reference @ steps[1].failTo',
  ]);

  const noStrategy = valid();
  delete (noStrategy.steps[1] as Record<string, unknown>).strategy;
  expect(errors(noStrategy)).toEqual(['missing-property @ steps[1].strategy']);

  const noTitle = valid();
  delete (noTitle.steps[2] as Record<string, unknown>).title;
  expect(errors(noTitle)).toContain('missing-property @ steps[2].title');
});

test('remote policy: only what the host explicitly allows can be referenced', () => {
  const remote = (extra: Partial<Record<string, unknown>> = {}) => ({
    schemaVersion: 1,
    id: 'r',
    steps: [
      {
        id: 'f',
        type: 'form',
        title: 'F',
        hooks: { beforeNext: 'check' },
        fields: [
          { name: 'score', type: 'x-stars' },
          { name: 'c', type: 'combobox', optionsSource: 'countries' },
        ],
      },
      { id: 'p', type: 'payment', title: 'P', providers: ['stripe'] },
      { id: 'w', type: 'wait', title: 'W', strategy: 'orderStatus' },
      { id: 'u', type: 'custom', title: 'U', renderer: 'summary' },
      { id: 'x', type: 'x-fancy', title: 'X' },
      {
        id: 'r',
        type: 'result',
        title: 'R',
        actions: [{ label: 'Ir', action: 'goHome' }],
      },
    ],
    ...extra,
  });
  // trusted accepts it all
  expect(errors(remote())).toEqual([]);
  // remote with an empty policy rejects every reference
  const denied = errors(remote(), {});
  expect(denied.sort()).toEqual(
    [
      'policy-violation @ steps[0].hooks.beforeNext',
      'policy-violation @ steps[0].fields[0].type',
      'policy-violation @ steps[0].fields[1].optionsSource',
      'policy-violation @ steps[1].providers[0]',
      'policy-violation @ steps[2].strategy',
      'policy-violation @ steps[3].renderer',
      'policy-violation @ steps[4].type',
      'policy-violation @ steps[5].actions[0].action',
    ].sort(),
  );
  // allowing exactly those passes
  expect(
    errors(remote(), {
      hooks: ['check'],
      fieldTypes: ['x-stars'],
      optionsSources: ['countries'],
      paymentProviders: ['stripe'],
      waitStrategies: ['orderStatus'],
      renderers: ['summary'],
      stepTypes: ['x-fancy'],
      actions: ['goHome'],
    }),
  ).toEqual([]);
});

test('rejects unsafe link schemes and accepts safe ones', () => {
  const withHref = (href: string) => {
    const s = valid();
    (s.steps[2] as Record<string, unknown>).actions = [{ label: 'Go', href }];
    return s;
  };
  for (const bad of [
    'javascript:alert(1)',
    ' JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,x',
    'vbscript:x',
  ])
    expect(errors(withHref(bad))).toEqual([
      'unsafe-url @ steps[2].actions[0].href',
    ]);
  for (const ok of [
    'https://a.dev/x',
    'mailto:a@b.dev',
    '/docs',
    '#top',
    'a/b?x=1:2',
  ])
    expect(errors(withHref(ok))).toEqual([]);
});

test('rejects field names that are prototype keys or path syntax', () => {
  for (const name of ['__proto__', 'constructor', 'prototype', 'a.b', 'a[0]']) {
    const s = valid();
    (s.steps[0].fields?.[1] as Record<string, unknown>).name = name;
    expect(errors(s)).toContain('invalid-name @ steps[0].fields[1].name');
  }
});

describe('payment without confirmation', () => {
  const schema = (steps: unknown[]) => ({
    schemaVersion: 1,
    id: 'p',
    steps,
  });
  const pay = { id: 'p', type: 'payment', title: 'P', providers: ['stripe'] };
  const warns = (steps: unknown[]) =>
    parseArtisanSchema(schema(steps)).issues.filter(
      (i) => i.code === 'payment-without-confirmation',
    );

  test('a payment step not followed by a wait step is a warning, never an error', () => {
    const r = parseArtisanSchema(
      schema([pay, { id: 'r', type: 'result', title: 'R' }]),
    );
    expect(r.success).toBe(true);
    expect(warns([pay, { id: 'r', type: 'result', title: 'R' }])).toHaveLength(
      1,
    );
    expect(warns([pay])).toHaveLength(1);
  });

  test('followed by a wait step: no warning', () => {
    expect(
      warns([pay, { id: 'w', type: 'wait', title: 'W', strategy: 's' }]),
    ).toEqual([]);
  });
});

describe('transitions', () => {
  const step = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    type: 'form',
    title: id,
    fields: [],
    ...extra,
  });
  const parse = (steps: unknown[]) =>
    parseArtisanSchema({ schemaVersion: 1, id: 't', steps });
  const codes = (steps: unknown[], severity: 'error' | 'warning') =>
    parse(steps)
      .issues.filter((i) => i.severity === severity)
      .map((i) => i.code);

  test('a forward transition and a bounded way back are valid', () => {
    const r = parse([
      step('a', {
        next: [{ when: { field: 'x', operator: 'filled' }, to: 'c' }],
      }),
      step('b'),
      step('c', { next: [{ to: 'b' }] }),
      step('d'),
    ]);
    // c → b goes back, and b has no loop
    expect(r.success).toBe(false);
    expect(
      codes(
        [
          step('a'),
          step('b', { loop: { max: 2 } }),
          step('c', { next: [{ to: 'b' }] }),
        ],
        'error',
      ),
    ).toEqual([]);
  });

  test('a way back to a step without loop.max is rejected', () => {
    expect(
      codes([step('a'), step('b', { next: [{ to: 'a' }] })], 'error'),
    ).toEqual(['unbounded-loop']);
    expect(codes([step('a', { next: [{ to: 'a' }] })], 'error')).toEqual([
      'unbounded-loop',
    ]);
  });

  test('an unknown target and malformed properties are errors', () => {
    expect(codes([step('a', { next: [{ to: 'nope' }] })], 'error')).toEqual([
      'unknown-step-reference',
    ]);
    expect(codes([step('a', { loop: { max: 0 } })], 'error')).toEqual([
      'invalid-type',
    ]);
    expect(codes([step('a', { revisit: 'sometimes' })], 'error')).toHaveLength(
      1,
    );
    expect(
      codes([step('a', { next: [{ to: 'a', x: 1 }] })], 'error').length,
    ).toBeGreaterThan(0);
  });

  test('a step no path reaches is a warning', () => {
    // a always goes to c, so b is skipped
    expect(
      codes(
        [step('a', { next: [{ to: 'c' }] }), step('b'), step('c')],
        'warning',
      ),
    ).toEqual(['unreachable-step']);
    expect(
      codes(
        [
          step('a', {
            next: [{ when: { field: 'x', operator: 'filled' }, to: 'c' }],
          }),
          step('b'),
          step('c'),
        ],
        'warning',
      ),
    ).toEqual([]);
  });
});

describe('wait step options', () => {
  const wait = (extra: Record<string, unknown>) =>
    parseArtisanSchema({
      schemaVersion: 1,
      id: 'w',
      steps: [{ id: 'w', type: 'wait', title: 'W', strategy: 's', ...extra }],
    });
  const errorCodes = (extra: Record<string, unknown>) =>
    wait(extra)
      .issues.filter((i) => i.severity === 'error')
      .map((i) => i.path);

  test('valid timeoutMs, retry and cancellable are accepted', () => {
    expect(
      wait({
        timeoutMs: 5000,
        retry: { max: 3, backoffMs: 200 },
        cancellable: true,
      }).success,
    ).toBe(true);
  });

  test('out-of-range or malformed values are errors', () => {
    expect(errorCodes({ timeoutMs: 0 })).toEqual(['steps[0].timeoutMs']);
    expect(errorCodes({ retry: { max: 11 } })).toEqual(['steps[0].retry.max']);
    expect(errorCodes({ retry: { max: 1, backoffMs: -1 } })).toEqual([
      'steps[0].retry.backoffMs',
    ]);
    expect(errorCodes({ cancellable: 'yes' })).toEqual([
      'steps[0].cancellable',
    ]);
  });
});

describe('optionsSource on select and radio', () => {
  const withField = (field: Record<string, unknown>) => ({
    schemaVersion: 1,
    id: 'f',
    steps: [{ id: 's', type: 'form', title: 'S', fields: [field] }],
  });
  const codes = (field: Record<string, unknown>) => {
    const r = parseArtisanSchema(withField(field));
    return r.issues.map((i) => `${i.code} @ ${i.path}`);
  };

  for (const type of ['select', 'radio']) {
    test(`${type} accepts a source instead of options`, () => {
      expect(
        parseArtisanSchema(
          withField({ type, name: 'x', optionsSource: 'plans' }),
        ).success,
      ).toBe(true);
    });
    test(`${type} rejects options and a source together`, () => {
      expect(
        codes({
          type,
          name: 'x',
          options: [{ value: 'a', label: 'A' }],
          optionsSource: 'plans',
        }),
      ).toEqual(['conflicting-properties @ steps[0].fields[0].optionsSource']);
    });
    test(`${type} needs one of the two`, () => {
      expect(codes({ type, name: 'x' })).toEqual([
        'missing-property @ steps[0].fields[0].options',
      ]);
    });
  }

  test('check still needs inline options and does not accept a source', () => {
    expect(
      codes({ type: 'check', name: 'x', optionsSource: 'plans' }),
    ).toContain('unknown-property @ steps[0].fields[0].optionsSource');
  });

  test('the policy applies to a select source like to a combobox', () => {
    const r = parseArtisanSchema(
      withField({ type: 'select', name: 'x', optionsSource: 'secret' }),
      {
        policy: { optionsSources: ['plans'] },
      },
    );
    expect(r.issues.map((i) => i.code)).toContain('policy-violation');
  });
});

test('the optional i18n block is accepted and validated', () => {
  const ok = {
    sourceLocale: 'en',
    messages: { es: { title: 'Hola', 'a.b': { one: 'x', other: 'y' } } },
  };
  expect(errors({ ...valid(), i18n: ok })).toEqual([]);
  expect(errors({ ...valid(), i18n: 'es' })).toEqual(['invalid-type @ i18n']);
  expect(errors({ ...valid(), i18n: { x: 1 } })).toEqual([
    'unknown-property @ i18n.x',
  ]);
  expect(errors({ ...valid(), i18n: { sourceLocale: '??' } })).toEqual([
    'invalid-value @ i18n.sourceLocale',
  ]);
  expect(
    errors({ ...valid(), i18n: { messages: { 'not a tag': {} } } }),
  ).toEqual(['invalid-value @ i18n.messages.not a tag']);
  expect(errors({ ...valid(), i18n: { messages: { es: 'x' } } })).toEqual([
    'invalid-type @ i18n.messages.es',
  ]);
  expect(errors({ ...valid(), i18n: { messages: { es: { t: 5 } } } })).toEqual([
    'invalid-type @ i18n.messages.es.t',
  ]);
  expect(
    errors({ ...valid(), i18n: { messages: { es: { t: { one: 'x' } } } } }),
  ).toEqual(['invalid-type @ i18n.messages.es.t']);
  expect(
    errors({
      ...valid(),
      i18n: { messages: { es: { t: { other: 'x', one: 1 } } } },
    }),
  ).toEqual(['invalid-type @ i18n.messages.es.t']);
});

test('sensitive is a boolean flag on any value field', () => {
  const schema = (sensitive: unknown) => ({
    schemaVersion: 1,
    id: 'f',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [{ name: 'diet', type: 'text', sensitive }],
      },
    ],
  });
  expect(parseArtisanSchema(schema(true)).success).toBe(true);
  expect(parseArtisanSchema(schema('yes')).success).toBe(false);
});

test('a policy can restrict native field and step types', () => {
  const schema = {
    schemaVersion: 1,
    id: 'f',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [{ name: 'doc', type: 'file' }],
      },
      { id: 'p', type: 'payment', title: 'Pay', providers: ['stripe'] },
    ],
  };
  const policy: SchemaPolicy = {
    nativeFieldTypes: ['text'],
    nativeStepTypes: ['form', 'result'],
    paymentProviders: ['stripe'],
  };
  const result = parseArtisanSchema(schema, { policy });
  expect(result.success).toBe(false);
  expect(
    result.issues
      .filter((i) => i.code === 'policy-violation')
      .map((i) => i.path),
  ).toEqual(['steps[0].fields[0].type', 'steps[1].type']);
  // without the restriction both are fine
  expect(
    parseArtisanSchema(schema, { policy: { paymentProviders: ['stripe'] } })
      .success,
  ).toBe(true);
});

describe('storage in the policy', () => {
  const withStorage = (storage: string) => ({
    schemaVersion: 1,
    id: 'f',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [{ name: 'doc', type: 'file', storage }],
      },
    ],
  });

  test('a storage adapter the policy does not list is a policy violation', () => {
    expect(errors(withStorage('cloud'), { fieldTypes: [] })).toEqual([
      'policy-violation @ steps[0].fields[0].storage',
    ]);
    expect(errors(withStorage('cloud'), { storage: ['other'] })).toEqual([
      'policy-violation @ steps[0].fields[0].storage',
    ]);
  });

  test('listed adapters and trusted schemas pass', () => {
    expect(errors(withStorage('cloud'), { storage: ['cloud'] })).toEqual([]);
    expect(errors(withStorage('cloud'))).toEqual([]);
  });
});

describe('limits', () => {
  const big = (steps: number, fieldsPerStep: number, options = 0) => ({
    schemaVersion: 1,
    id: 'f',
    steps: Array.from({ length: steps }, (_, s) => ({
      id: `s${s}`,
      type: 'form',
      title: 'S',
      fields: Array.from({ length: fieldsPerStep }, (_, f) =>
        options
          ? {
              name: `f${s}_${f}`,
              type: 'select',
              options: Array.from({ length: options }, (_, o) => ({
                value: `v${o}`,
                label: `V${o}`,
              })),
            }
          : { name: `f${s}_${f}`, type: 'text' },
      ),
    })),
  });
  const codes = (input: unknown, limits: SchemaLimits): string[] => {
    const r = parseArtisanSchema(input, { limits });
    return r.success ? [] : r.issues.map((i) => `${i.code} @ ${i.path}`);
  };

  test('nothing is limited unless asked', () => {
    expect(parseArtisanSchema(big(30, 30)).success).toBe(true);
  });

  test('maxBytes stops before anything else is read', () => {
    expect(codes(big(2, 2), { maxBytes: 50 })).toEqual(['too-large @ $']);
    expect(codes(big(2, 2), { maxBytes: 100_000 })).toEqual([]);
  });

  test('maxBytes counts UTF-8 bytes, not characters', () => {
    const s = { ...big(1, 1), title: 'ñ'.repeat(40) };
    const chars = JSON.stringify(s).length;
    expect(codes(s, { maxBytes: chars + 10 })).toEqual(['too-large @ $']);
  });

  test('maxSteps and maxFields (array item fields and content fields count)', () => {
    expect(codes(big(5, 1), { maxSteps: 4 })).toEqual([
      'too-many-steps @ steps',
    ]);
    expect(codes(big(2, 3), { maxFields: 5 })).toEqual([
      'too-many-fields @ steps',
    ]);
    expect(codes(big(2, 3), { maxFields: 6 })).toEqual([]);
    const withArray = {
      schemaVersion: 1,
      id: 'f',
      steps: [
        {
          id: 's',
          type: 'form',
          title: 'S',
          fields: [
            {
              name: 'team',
              type: 'array',
              itemFields: [
                { name: 'a', type: 'text' },
                { name: 'b', type: 'text' },
              ],
            },
          ],
        },
      ],
    };
    expect(codes(withArray, { maxFields: 2 })).toEqual([
      'too-many-fields @ steps',
    ]);
    expect(codes(withArray, { maxFields: 3 })).toEqual([]);
  });

  test('maxOptions limits one list', () => {
    expect(codes(big(1, 1, 5), { maxOptions: 4 })).toEqual([
      'too-many-options @ steps[0].fields[0].options',
    ]);
    expect(codes(big(1, 1, 5), { maxOptions: 5 })).toEqual([]);
  });
});

test('$schema is an optional string at the root', () => {
  const s = {
    ...valid(),
    $schema: 'https://unpkg.com/artisanform/dist/schema.json',
  };
  expect(errors(s)).toEqual([]);
  expect(errors({ ...valid(), $schema: 3 })).toEqual([
    'invalid-type @ $schema',
  ]);
});
