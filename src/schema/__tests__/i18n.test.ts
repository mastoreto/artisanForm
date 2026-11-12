import { describe, expect, test } from 'bun:test';
import {
  type ArtisanSchemaV1,
  applyCatalog,
  extractMessages,
  format,
  normalizeArtisanSchema,
  placeholdersOf,
  resolveLocaleChain,
  validateCatalog,
} from '..';

// biome-ignore lint/suspicious/noExplicitAny: the tests read deep paths of translated JSON
type Json = any;

// One of every kind of translatable text.
const schema = {
  schemaVersion: 1,
  id: 'i18n',
  title: 'Registration',
  description: 'Join us',
  steps: [
    {
      id: 'account',
      type: 'form',
      title: 'Account',
      controls: { nextLabel: 'Continue', previousLabel: 'Back' },
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Full name',
          description: 'As on your ID',
          placeholder: 'Jane Doe',
        },
        {
          type: 'number',
          name: 'age',
          label: 'Age',
          prefix: '#',
          suffix: 'years',
        },
        {
          type: 'select',
          name: 'plan',
          label: 'Plan',
          options: [
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
          ],
        },
        {
          type: 'dynamicSelect',
          name: 'country',
          label: 'Country',
          dependentName: 'city',
          options: [{ value: 'ar', label: 'Argentina' }],
          dependentOptions: { ar: [{ value: 'ba', label: 'Buenos Aires' }] },
        },
        { type: 'daterange', name: 'stay', label: 'From', endLabel: 'To' },
        {
          type: 'array',
          name: 'jobs',
          label: 'Jobs',
          addLabel: 'Add a job',
          itemFields: [{ type: 'text', name: 'role', label: 'Role' }],
        },
        { type: 'heading', name: 'h', text: 'Almost there' },
      ],
    },
    {
      id: 'terms',
      type: 'terms',
      title: 'Terms',
      content: 'Read this',
      accept: { label: 'I accept' },
    },
    {
      id: 'pay',
      type: 'payment',
      title: 'Payment',
      providers: ['x'],
      summary: 'Pro plan',
    },
    {
      id: 'wait',
      type: 'wait',
      title: 'Waiting',
      strategy: 's',
      message: 'Please wait',
    },
    {
      id: 'end',
      type: 'result',
      title: 'Done',
      message: 'Thank you {name}',
      errorMessage: 'Something failed',
      actions: [
        { label: 'Home', action: 'home' },
        { label: 'Docs', href: '/docs' },
      ],
    },
  ],
} as unknown as ArtisanSchemaV1;

describe('resolveLocaleChain', () => {
  test('goes from the most specific tag to the language', () => {
    expect(resolveLocaleChain('es-AR')).toEqual(['es-AR', 'es']);
    expect(resolveLocaleChain('zh-Hant-TW')).toEqual([
      'zh-Hant-TW',
      'zh-Hant',
      'zh',
    ]);
    expect(resolveLocaleChain('en')).toEqual(['en']);
  });
  test('normalizes case and accepts underscores', () => {
    expect(resolveLocaleChain('ES-ar')).toEqual(['es-AR', 'es']);
    expect(resolveLocaleChain('pt_BR')).toEqual(['pt-BR', 'pt']);
  });
  test('anything that is not a language tag gives no chain', () => {
    for (const bad of [
      '',
      '  ',
      '123',
      'e',
      '../etc',
      'es-',
      'es--AR',
      '__proto__',
      'es-<script>',
    ])
      expect(resolveLocaleChain(bad)).toEqual([]);
  });
});

describe('extractMessages', () => {
  const m = extractMessages(schema);
  test('lists every text of the schema by its path', () => {
    expect(m).toMatchObject({
      title: 'Registration',
      description: 'Join us',
      'steps.account.title': 'Account',
      'steps.account.controls.nextLabel': 'Continue',
      'steps.account.controls.previousLabel': 'Back',
      'steps.account.fields.name.label': 'Full name',
      'steps.account.fields.name.description': 'As on your ID',
      'steps.account.fields.name.placeholder': 'Jane Doe',
      'steps.account.fields.age.prefix': '#',
      'steps.account.fields.age.suffix': 'years',
      'steps.account.fields.plan.options.free': 'Free',
      'steps.account.fields.plan.options.pro': 'Pro',
      'steps.account.fields.country.options.ar': 'Argentina',
      'steps.account.fields.country.dependentOptions.ar.ba': 'Buenos Aires',
      'steps.account.fields.stay.endLabel': 'To',
      'steps.account.fields.jobs.addLabel': 'Add a job',
      'steps.account.fields.jobs.fields.role.label': 'Role',
      'steps.account.fields.h.text': 'Almost there',
      'steps.terms.content': 'Read this',
      'steps.terms.accept.label': 'I accept',
      'steps.pay.summary': 'Pro plan',
      'steps.wait.message': 'Please wait',
      'steps.end.message': 'Thank you {name}',
      'steps.end.errorMessage': 'Something failed',
      'steps.end.actions.0.label': 'Home',
      'steps.end.actions.1.label': 'Docs',
    });
  });
  test('does not list ids, names, hrefs or option values', () => {
    const all = JSON.stringify(Object.values(m));
    for (const hidden of ['account', '/docs', 'home', 'free"'])
      expect(all).not.toContain(hidden);
  });
  test('does not modify the schema', () => {
    const before = JSON.stringify(schema);
    extractMessages(schema);
    expect(JSON.stringify(schema)).toBe(before);
  });
});

describe('applyCatalog', () => {
  const es = {
    title: 'Registro',
    'steps.account.title': 'Cuenta',
    'steps.account.fields.name.label': 'Nombre completo',
    'steps.account.fields.plan.options.pro': 'Profesional',
    'steps.account.fields.country.dependentOptions.ar.ba': 'Capital Federal',
    'steps.account.fields.jobs.fields.role.label': 'Puesto',
    'steps.end.actions.0.label': 'Inicio',
    'steps.end.message': 'Gracias {name}',
  };
  const out = applyCatalog(schema, [es]) as unknown as {
    title: string;
    steps: Json[];
  };

  test('replaces the texts the catalog has and keeps the rest', () => {
    expect(out.title).toBe('Registro');
    expect(out.steps[0].title).toBe('Cuenta');
    expect(out.steps[0].fields[0].label).toBe('Nombre completo');
    expect(out.steps[0].fields[0].description).toBe('As on your ID'); // not translated: kept
    expect(out.steps[0].fields[2].options[1].label).toBe('Profesional');
    expect(out.steps[0].fields[3].dependentOptions.ar[0].label).toBe(
      'Capital Federal',
    );
    expect(out.steps[0].fields[5].itemFields[0].label).toBe('Puesto');
    expect(out.steps[4].actions[0].label).toBe('Inicio');
    expect(out.steps[4].message).toBe('Gracias {name}');
  });
  test('never touches ids, names, values, hrefs or action ids', () => {
    expect(out.steps.map((s) => s.id)).toEqual([
      'account',
      'terms',
      'pay',
      'wait',
      'end',
    ]);
    expect(out.steps[0].fields[0].name).toBe('name');
    expect(out.steps[0].fields[2].options[1].value).toBe('pro');
    expect(out.steps[4].actions[1].href).toBe('/docs');
    expect(out.steps[4].actions[0].action).toBe('home');
  });
  test('does not modify the input and the result is still a valid schema', () => {
    const before = JSON.stringify(schema);
    applyCatalog(schema, [es]);
    expect(JSON.stringify(schema)).toBe(before);
    expect(() =>
      normalizeArtisanSchema(out as unknown as ArtisanSchemaV1),
    ).not.toThrow();
  });
  test('the first catalog of the chain wins, the next ones fill the gaps', () => {
    const r = applyCatalog(schema, [
      { title: 'Registro (AR)' },
      { title: 'Registro', 'steps.account.title': 'Cuenta' },
    ]) as Json;
    expect(r.title).toBe('Registro (AR)');
    expect(r.steps[0].title).toBe('Cuenta');
  });
  test('plural forms use `other`, and empty or non-string entries are ignored', () => {
    const r = applyCatalog(schema, [
      { title: { other: 'Registro', one: 'x' }, description: '' },
    ]) as Json;
    expect(r.title).toBe('Registro');
    expect(r.description).toBe('Join us');
  });
  test('no catalogs gives an equal copy', () => {
    const r = applyCatalog(schema, []);
    expect(r).toEqual(schema);
    expect(r).not.toBe(schema);
  });
  test('a catalog cannot inject through a hostile key', () => {
    const r = applyCatalog(schema, [
      JSON.parse(
        '{"__proto__": {"polluted": "x"}, "constructor.prototype.x": "y"}',
      ),
    ]);
    expect(({} as Json).polluted).toBeUndefined();
    expect(r).toEqual(schema);
  });
});

describe('validateCatalog', () => {
  test('a complete, correct catalog reports nothing', () => {
    const full = Object.fromEntries(
      Object.entries(extractMessages(schema)).map(([k, v]) => [k, `${v}!`]),
    );
    expect(validateCatalog(schema, full)).toEqual({
      missing: [],
      orphan: [],
      badPlaceholders: [],
    });
  });
  test('reports what is missing', () => {
    const r = validateCatalog(schema, { title: 'Registro' });
    expect(r.missing).toContain('steps.account.title');
    expect(r.missing).not.toContain('title');
  });
  test('reports entries whose id was renamed or removed', () => {
    const r = validateCatalog(schema, {
      'steps.gone.title': 'x',
      'steps.account.fields.nope.label': 'y',
    });
    expect(r.orphan).toEqual([
      'steps.account.fields.nope.label',
      'steps.gone.title',
    ]);
  });
  test('reports a placeholder that was lost, added or renamed', () => {
    const r = validateCatalog(schema, {
      'steps.end.message': 'Gracias',
      'steps.account.title': 'Cuenta {extra}',
    });
    expect(r.badPlaceholders).toEqual([
      'steps.account.title',
      'steps.end.message',
    ]);
    expect(
      validateCatalog(schema, { 'steps.end.message': 'Gracias {name}' })
        .badPlaceholders,
    ).toEqual([]);
  });
  test('labels.* entries are the library’s: never orphans, checked only against known keys', () => {
    expect(
      validateCatalog(schema, { 'labels.next': 'Siguiente' }).orphan,
    ).toEqual([]);
    expect(
      validateCatalog(
        schema,
        { 'labels.next': 'x', 'labels.bogus': 'y' },
        { labelKeys: ['next'] },
      ).orphan,
    ).toEqual(['labels.bogus']);
  });
});

describe('placeholders', () => {
  test('placeholdersOf lists unique names, sorted', () => {
    expect(placeholdersOf('{b} and {a} and {b}')).toEqual(['a', 'b']);
    expect(placeholdersOf('no placeholders { } {1x}')).toEqual([]);
  });
  test('format fills the known names and leaves the others as written', () => {
    expect(format('Hi {name}, {n} left, {x}', { name: 'Ana', n: 3 })).toBe(
      'Hi Ana, 3 left, {x}',
    );
    expect(format('plain')).toBe('plain');
  });
});
