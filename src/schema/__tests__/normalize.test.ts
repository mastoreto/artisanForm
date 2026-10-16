import { describe, expect, test } from 'bun:test';
import type { ArtisanSchemaV1 } from '../contract/define';
import { ArtisanSchemaError } from '../contract/errors';
import { deriveStepIds } from '../legacy/adapter';
import { normalizeArtisanSchema } from '../normalize';
import { parseArtisanSchema } from '../parser';
import { legacyFixtures } from './fixtures/legacy';

const deepFreeze = <T>(v: T): T => {
  if (typeof v === 'object' && v !== null && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const x of Object.values(v)) deepFreeze(x);
  }
  return v;
};

const field = (
  n: ReturnType<typeof normalizeArtisanSchema>,
  step: number,
  name: string,
) => {
  const s = n.schema.steps[step];
  if (s.type !== 'form') throw new Error('not a form step');
  const f = s.fields.find((x) => x.name === name);
  if (!f) throw new Error(`no field ${name}`);
  return f as unknown as Record<string, unknown>;
};

describe('every 0.2.0 playground fixture', () => {
  for (const [name, scheme] of Object.entries(legacyFixtures)) {
    test(`${name}: normalizes to a valid v1 schema, deterministically and idempotently`, () => {
      const a = normalizeArtisanSchema(scheme);
      expect(a.source).toBe('legacy');
      // the result is itself valid v1 (warnings are fine, errors are not)
      const parsed = parseArtisanSchema(a.schema);
      expect(parsed.success).toBe(true);
      // deterministic
      const b = normalizeArtisanSchema(scheme);
      expect(b.schema).toEqual(a.schema);
      expect(Object.keys(b.bindings)).toEqual(Object.keys(a.bindings));
      // idempotent
      const again = normalizeArtisanSchema(a.schema);
      expect(again.source).toBe('v1');
      expect(again.schema).toEqual(a.schema);
      // pure JSON
      expect(JSON.parse(JSON.stringify(a.schema))).toEqual(a.schema);
    });
  }

  test('portable only when nothing needed a binding or was dropped', () => {
    const portable = Object.entries(legacyFixtures)
      .filter(([, s]) => normalizeArtisanSchema(s).portable)
      .map(([n]) => n);
    expect(portable.sort()).toEqual([
      'fields',
      'files',
      'payments',
      'repeatables',
      'wizard',
    ]);
  });
});

test('the input is never mutated (frozen fixtures normalize fine)', () => {
  const frozen = deepFreeze(
    structuredClone({ steps: legacyFixtures.wizard.steps }),
  );
  expect(() => normalizeArtisanSchema(frozen)).not.toThrow();
  const v1 = deepFreeze(
    structuredClone(normalizeArtisanSchema(legacyFixtures.wizard).schema),
  );
  expect(() => normalizeArtisanSchema(v1)).not.toThrow();
});

describe('0.2.0 → v1 translation', () => {
  const fields = normalizeArtisanSchema(legacyFixtures.fields);
  const adv = normalizeArtisanSchema(legacyFixtures.advanced);

  test('envelope, defaults and ids', () => {
    expect(fields.schema.schemaVersion).toBe(1);
    expect(fields.schema.id).toBe('legacy-form');
    expect(fields.schema.ui).toEqual({
      layout: 'vertical',
      density: 'comfortable',
      labelPosition: 'top',
    });
    const step = fields.schema.steps[0];
    expect(step.id).toBe('todos-los-campos');
    expect(step.ui).toEqual({ columns: 2 });
    expect(
      normalizeArtisanSchema(legacyFixtures.wizard, {
        id: 'legacy:draft',
        revision: 4,
      }).schema,
    ).toMatchObject({ id: 'legacy:draft', revision: 4 });
  });

  test('kind → type (pending → wait, custom kinds → x-)', () => {
    expect(adv.schema.steps.map((s) => s.type)).toEqual([
      'form',
      'form',
      'terms',
      'custom',
      'result',
    ]);
    expect(
      normalizeArtisanSchema(legacyFixtures.pending).schema.steps.map(
        (s) => s.type,
      ),
    ).toEqual(['form', 'wait', 'result']);
    const custom = normalizeArtisanSchema({
      steps: [{ title: 'X', kind: 'fancy', extra: 1 }],
    });
    expect(custom.schema.steps[0]).toMatchObject({
      type: 'x-fancy',
      config: { extra: 1 },
    });
  });

  test('showIf → visibleWhen, width → ui.span, helperText → description', () => {
    expect(field(adv, 0, 'company').visibleWhen).toEqual({
      field: 'kind',
      operator: 'in',
      value: ['company'],
      coerce: 'string',
    });
    expect(field(adv, 0, 'nick').visibleWhen).toEqual({
      not: {
        field: 'kind',
        operator: 'in',
        value: ['person', 'company'],
        coerce: 'string',
      },
    });
    expect(field(adv, 0, 'any').visibleWhen).toEqual({
      field: 'kind',
      operator: 'filled',
    });
    expect(adv.schema.steps[1].visibleWhen).toEqual({
      field: 'kind',
      operator: 'in',
      value: ['company'],
      coerce: 'string',
    });
    expect(field(fields, 0, 'name').ui).toEqual({ span: 1 });
    expect(field(fields, 0, 'cuit').ui).toEqual({ span: 2 }); // default keeps today's full width
    expect(field(fields, 0, 'news').description).toBe('Una vez por mes');
    expect(field(fields, 0, 'news').helperText).toBeUndefined();
  });

  test('content fields use `text`; validation moves under `validation` by family', () => {
    expect(field(fields, 0, 'h1').text).toBe('Datos básicos');
    expect(field(fields, 0, 'h1').label).toBeUndefined();
    expect(field(fields, 0, 'c1')).toMatchObject({
      text: 'Los campos con * son obligatorios',
      variant: 'info',
    });
    expect(field(fields, 0, 'd1').text).toBeUndefined();
    expect(field(fields, 0, 'pw').validation).toEqual({
      minLength: 8,
      pattern: '^\\S+$',
    });
    expect(field(fields, 0, 'pw2').validation).toEqual({ sameAs: 'pw' });
    expect(field(fields, 0, 'price')).toMatchObject({
      validation: { min: 0, max: 1000 },
      step: 0.5,
      prefix: '$',
    });
    expect(field(fields, 0, 'from')).toMatchObject({
      endName: 'to',
      validation: { min: '2030-01-01' },
    });
    expect(field(fields, 0, 'level').validation).toEqual({ min: 0, max: 10 });
    const rep = normalizeArtisanSchema(legacyFixtures.repeatables);
    expect(field(rep, 0, 'members')).toMatchObject({
      validation: { minItems: 1, maxItems: 3 },
      description: 'Entre 1 y 3 personas',
    });
    const files = normalizeArtisanSchema(legacyFixtures.files);
    expect(field(files, 0, 'dni')).toMatchObject({
      accept: 'application/pdf',
      validation: { maxSize: 2097152 },
    });
    expect(field(files, 0, 'photos').validation).toEqual({ maxFiles: 3 });
  });

  test('array rows are mapped (and their showIf dropped with a warning)', () => {
    const rep = normalizeArtisanSchema(legacyFixtures.repeatables);
    const members = field(rep, 0, 'members') as {
      itemFields: { name: string; type: string }[];
    };
    expect(members.itemFields.map((f) => `${f.name}:${f.type}`)).toEqual([
      'name:text',
      'email:email',
      'role:select',
    ]);
    const dropped = normalizeArtisanSchema({
      steps: [
        {
          title: 'S',
          fields: [
            {
              type: 'array',
              name: 'a',
              label: 'A',
              itemFields: [
                {
                  type: 'text',
                  name: 'b',
                  label: 'B',
                  showIf: { field: 'x', equals: '1' },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(dropped.issues.map((i) => i.code)).toContain(
      'ignored-legacy-property',
    );
    expect(dropped.portable).toBe(false);
  });

  test('functions and non-JSON content become bindings referenced by id', () => {
    const pend = normalizeArtisanSchema(legacyFixtures.pending);
    const wait = pend.schema.steps[1];
    expect(wait).toMatchObject({
      type: 'wait',
      strategy: 'legacy:confirmando:wait',
      resultName: 'orderId',
      failTo: 'solicitud',
    });
    expect(
      typeof (
        pend.bindings['legacy:confirmando:wait'] as { subscribe: unknown }
      ).subscribe,
    ).toBe('function');
    expect(pend.schema.steps[0].hooks).toEqual({
      onEnter: 'legacy:solicitud:onEnter',
    });
    expect(typeof pend.bindings['legacy:solicitud:onEnter']).toBe('function');

    expect(field(adv, 0, 'lang').optionsSource).toBe(
      'legacy:cuenta:lang:loadOptions',
    );
    expect(typeof adv.bindings['legacy:cuenta:lang:loadOptions']).toBe(
      'function',
    );
    expect(adv.schema.steps[3]).toMatchObject({
      type: 'custom',
      renderer: 'legacy:custom:render',
      config: { note: 'hola' },
    });
    expect(adv.schema.steps[4]).toMatchObject({
      actions: [
        { label: 'Ir', href: '/' },
        { label: 'Otra', action: 'legacy:fin:action:1' },
      ],
    });
    expect(adv.portable).toBe(false);
  });

  test('custom field types become x-<type> with their extras under config', () => {
    expect(field(adv, 0, 'score')).toMatchObject({
      type: 'x-stars',
      config: { extra: 5, nested: { a: [1, 2] } },
    });
  });

  test('payment and terms steps keep their data', () => {
    const pay = normalizeArtisanSchema(legacyFixtures.payments);
    expect(pay.schema.steps[1]).toMatchObject({
      type: 'payment',
      providers: ['card', 'hosted', 'declined'],
      summary: 'Total a pagar lo calcula tu servidor.',
    });
    const single = normalizeArtisanSchema({
      steps: [
        { title: 'P', kind: 'payment', provider: 'stripe', resultName: 'pay' },
      ],
    });
    expect(single.schema.steps[0]).toMatchObject({
      providers: ['stripe'],
      resultName: 'pay',
    });
    expect(adv.schema.steps[2]).toMatchObject({
      type: 'terms',
      content: 'Texto de los términos',
      href: 'https://example.com/terms',
      accept: { name: 'ok', label: 'Acepto' },
    });
  });

  test('legacy never throws: oddities become warnings', () => {
    const odd = normalizeArtisanSchema({
      steps: [
        {
          title: 'A',
          fields: [
            { type: 'text', name: 'a', label: 'A' },
            { type: 'text', name: 'a', label: 'A2', bogus: 1 } as never,
          ],
        },
        { title: 'B', showIf: { field: 'ghost', equals: 'x' }, fields: [] },
      ],
    });
    const codes = odd.issues.map((i) => i.code);
    expect(codes).toContain('duplicate-name');
    expect(codes).toContain('unknown-field-reference');
    expect(odd.issues.every((i) => i.severity === 'warning')).toBe(true);
  });
});

describe('step ids', () => {
  test('derived from titles, with accents folded and collisions suffixed', () => {
    expect(
      deriveStepIds([
        { title: 'Datos personales', type: 'form' },
        { title: 'Ubicación', type: 'form' },
        { title: 'Ubicacion', type: 'form' },
        { title: 'Ubicación!', type: 'form' },
      ]),
    ).toEqual(['datos-personales', 'ubicacion', 'ubicacion-2', 'ubicacion-3']);
  });
  test('untitled steps fall back to <type>-<position>; same input, same ids', () => {
    const steps = [
      { title: '', type: 'form' },
      { title: '???', type: 'result' },
    ];
    expect(deriveStepIds(steps)).toEqual(['form-1', 'result-2']);
    expect(deriveStepIds(steps)).toEqual(deriveStepIds(steps));
  });
  test('reordering changes derived ids (the documented limitation)', () => {
    const a = deriveStepIds([
      { title: 'A', type: 'form' },
      { title: 'A', type: 'form' },
    ]);
    const b = deriveStepIds([{ title: 'A', type: 'form' }]);
    expect(a[1]).toBe('a-2');
    expect(b[0]).toBe('a');
  });
});

describe('v1 input', () => {
  const v1 = (): ArtisanSchemaV1 => ({
    schemaVersion: 1,
    id: 'f',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [
          { name: 'a', type: 'text' },
          { name: 'b', type: 'text', ui: { span: 1 } },
        ],
      },
    ],
  });

  test('is validated, given defaults, copied and left alone', () => {
    const input = v1();
    const before = JSON.stringify(input);
    const n = normalizeArtisanSchema(input);
    expect(n.source).toBe('v1');
    expect(n.portable).toBe(true);
    expect(n.bindings).toEqual({});
    expect(n.schema).not.toBe(input);
    expect(JSON.stringify(input)).toBe(before);
    const step = n.schema.steps[0];
    expect(step.type === 'form' && step.ui).toEqual({ columns: 2 });
    expect(step.type === 'form' && step.fields.map((f) => f.ui)).toEqual([
      { span: 2 },
      { span: 1 },
    ]);
    expect(n.schema.ui).toEqual({
      layout: 'vertical',
      density: 'comfortable',
      labelPosition: 'top',
    });
  });

  test('an invalid schema throws ArtisanSchemaError with the issues', () => {
    const bad = { ...v1(), steps: [] };
    try {
      normalizeArtisanSchema(bad);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ArtisanSchemaError);
      expect((e as ArtisanSchemaError).issues[0].code).toBe('empty-steps');
      expect((e as Error).message).toContain('steps');
    }
  });

  test('anything else is rejected', () => {
    expect(() => normalizeArtisanSchema(null as never)).toThrow(
      ArtisanSchemaError,
    );
    expect(() => normalizeArtisanSchema({} as never)).toThrow(
      ArtisanSchemaError,
    );
    expect(() => normalizeArtisanSchema({ steps: 'x' } as never)).toThrow(
      ArtisanSchemaError,
    );
  });
});
