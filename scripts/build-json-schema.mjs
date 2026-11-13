// Builds the JSON Schema (draft 2020-12) of the v1 contract and writes it to
// dist/schema.json, shipped as `artisanform/schema.json`. It describes the
// STRUCTURE only: types, known keys, enums and required properties, so any
// language or database validator can check a schema. What needs the whole
// document (unique names and ids, references between fields and steps, flow,
// policy, limits, capabilities) is `parseArtisanSchema` / `checkSchema`.
// The key lists come from the library's own specs so they cannot drift.
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const str = { type: 'string', minLength: 1 };
const text = { type: 'string' };
const int = { type: 'integer' };
const num = { type: 'number' };
const bool = { type: 'boolean' };
const ref = (name) => ({ $ref: `#/$defs/${name}` });
const obj = (properties, required = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: false,
});

const OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'filled',
  'empty',
];
const TEXT_TYPES = ['text', 'email', 'tel', 'url', 'password', 'textarea'];
const NUMERIC_TYPES = ['number', 'range'];
const DATE_TYPES = ['date', 'time', 'datetime', 'month', 'daterange'];
const CONTENT_TYPES = ['heading', 'paragraph', 'callout', 'divider'];

const validationFor = (type) => {
  if (TEXT_TYPES.includes(type))
    return obj({
      minLength: { type: 'integer', minimum: 0 },
      maxLength: { type: 'integer', minimum: 0 },
      pattern: { type: 'string', maxLength: 500 },
      sameAs: str,
    });
  if (NUMERIC_TYPES.includes(type)) return obj({ min: num, max: num });
  if (DATE_TYPES.includes(type)) return obj({ min: text, max: text });
  if (type === 'array')
    return obj({
      minItems: { type: 'integer', minimum: 0 },
      maxItems: { type: 'integer', minimum: 0 },
    });
  if (type === 'file' || type === 'image')
    return obj({
      maxSize: num,
      minFiles: { type: 'integer', minimum: 0 },
      maxFiles: { type: 'integer', minimum: 0 },
    });
  return obj({});
};

const option = obj({ value: text, label: text }, ['value', 'label']);
const options = { type: 'array', items: option };

/** Value schema of every field key; `validation` and `variant` depend on the type. */
const fieldKey = (key, type) => {
  switch (key) {
    case 'type':
      return { const: type };
    case 'id':
    case 'name':
    case 'mask':
    case 'autoComplete':
    case 'endName':
    case 'optionsSource':
    case 'dependentName':
    case 'dependentOptionsSource':
    case 'accept':
    case 'storage':
      return str;
    case 'label':
    case 'description':
    case 'placeholder':
    case 'prefix':
    case 'suffix':
    case 'endLabel':
    case 'addLabel':
    case 'text':
      return text;
    case 'required':
    case 'disabled':
    case 'sensitive':
    case 'readOnly':
      return bool;
    case 'defaultValue':
      return {};
    case 'visibleWhen':
      return ref('condition');
    case 'ui':
      return obj({ span: { enum: [1, 2] }, variant: str });
    case 'inputMode':
      return {
        enum: [
          'none',
          'text',
          'tel',
          'url',
          'email',
          'numeric',
          'decimal',
          'search',
        ],
      };
    case 'maxLength':
    case 'length':
      return int;
    case 'step':
      return num;
    case 'charset':
      return { enum: ['numeric', 'alphanumeric'] };
    case 'capture':
      return { enum: ['user', 'environment'] };
    case 'validation':
      return validationFor(type);
    case 'options':
      return options;
    case 'dependentOptions':
      return { type: 'object', additionalProperties: options };
    case 'itemFields':
      return { type: 'array', items: ref('arrayItemField') };
    case 'variant':
      return type === 'callout'
        ? { enum: ['info', 'success', 'warning', 'error'] }
        : str;
    default:
      return {};
  }
};

const fieldRequired = (type) => {
  const required = ['type', 'name'];
  if (type === 'check' || type === 'dynamicSelect') required.push('options');
  if (type === 'array') required.push('itemFields');
  return required;
};

const fieldDef = (type, keys, { inArray = false } = {}) => {
  const props = Object.fromEntries(
    keys
      .filter((k) => !(inArray && k === 'visibleWhen'))
      .map((k) => [k, fieldKey(k, type)]),
  );
  const def = obj(props, fieldRequired(type));
  if (type === 'select' || type === 'radio')
    def.oneOf = [{ required: ['options'] }, { required: ['optionsSource'] }];
  return def;
};

const stepKey = (key) => {
  switch (key) {
    case 'id':
    case 'resultName':
    case 'strategy':
    case 'failTo':
    case 'renderer':
      return str;
    case 'href':
      return text;
    case 'title':
      return text;
    case 'message':
    case 'errorMessage':
    case 'summary':
    case 'content':
      return text;
    case 'accept':
      return obj({ name: str, label: text });
    case 'visibleWhen':
      return ref('condition');
    case 'ui':
      return obj({ columns: { enum: [1, 2] } });
    case 'controls':
      return obj({
        hidden: bool,
        hidePrevious: bool,
        hideNext: bool,
        nextDisabled: bool,
        nextLabel: text,
        previousLabel: text,
      });
    case 'hooks':
      return obj({ beforeNext: str, onEnter: str });
    case 'next':
      return {
        type: 'array',
        items: obj({ when: ref('condition'), to: str }, ['to']),
      };
    case 'loop':
      return obj({ max: { type: 'integer', minimum: 1, maximum: 1000 } }, [
        'max',
      ]);
    case 'revisit':
      return { enum: ['allow', 'deny'] };
    case 'fields':
      return { type: 'array', items: ref('field') };
    case 'providers':
      return { type: 'array', items: str, minItems: 1 };
    case 'timeoutMs':
      return { type: 'integer', minimum: 1, maximum: 3600000 };
    case 'retry':
      return obj({
        max: { type: 'integer', minimum: 1, maximum: 10 },
        backoffMs: { type: 'integer', minimum: 0, maximum: 60000 },
      });
    case 'cancellable':
      return bool;
    case 'actions':
      return {
        type: 'array',
        items: obj({ label: text, href: str, action: str }),
      };
    case 'config':
      return { type: 'object' };
    default:
      return {};
  }
};

const STEP_REQUIRED = {
  form: ['fields'],
  payment: ['providers'],
  wait: ['strategy'],
  custom: ['renderer'],
};

/**
 * @param {{ FIELD_KEYS: Record<string, readonly string[]>, STEP_KEYS: Record<string, readonly string[]> }} specs
 */
export const buildJsonSchema = ({ FIELD_KEYS, STEP_KEYS }) => {
  const fieldTypes = Object.keys(FIELD_KEYS);
  const itemTypes = fieldTypes.filter(
    (t) => t !== 'array' && !CONTENT_TYPES.includes(t),
  );
  const baseKeys = FIELD_KEYS.text.filter(
    (k) => !['validation', 'maxLength'].includes(k),
  );
  const customField = obj(
    {
      ...Object.fromEntries(
        FIELD_KEYS.text
          .filter((k) =>
            [
              'id',
              'name',
              'label',
              'description',
              'required',
              'disabled',
              'defaultValue',
              'sensitive',
              'visibleWhen',
              'ui',
            ].includes(k),
          )
          .map((k) => [k, fieldKey(k, 'x-custom')]),
      ),
      type: { type: 'string', pattern: '^x-.+' },
      config: { type: 'object' },
    },
    ['type', 'name'],
  );
  void baseKeys;
  const step = (type) =>
    obj(
      Object.fromEntries(
        STEP_KEYS[type].map((k) => [
          k,
          k === 'type' ? { const: type } : stepKey(k),
        ]),
      ),
      ['type', 'id', 'title', ...(STEP_REQUIRED[type] ?? [])],
    );
  const customStep = obj(
    {
      type: { type: 'string', pattern: '^x-.+' },
      id: str,
      title: text,
      visibleWhen: ref('condition'),
      ui: stepKey('ui'),
      controls: stepKey('controls'),
      hooks: stepKey('hooks'),
      next: stepKey('next'),
      loop: stepKey('loop'),
      revisit: stepKey('revisit'),
      config: { type: 'object' },
    },
    ['type', 'id', 'title'],
  );

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://unpkg.com/artisanform/schema.json',
    title: 'ArtisanForm schema v1',
    description:
      'Structure of an ArtisanForm v1 schema. Rules that need the whole document (unique names and ids, references, flow, policy, limits, capabilities) are checked by parseArtisanSchema / checkSchema.',
    type: 'object',
    properties: {
      $schema: { type: 'string' },
      schemaVersion: { const: 1 },
      id: str,
      revision: { type: 'integer', minimum: 0 },
      title: text,
      description: text,
      ui: obj({
        layout: { enum: ['vertical', 'horizontal'] },
        density: { enum: ['compact', 'comfortable'] },
        labelPosition: { enum: ['top', 'left'] },
      }),
      i18n: {
        type: 'object',
        properties: {
          sourceLocale: str,
          messages: { type: 'object' },
        },
        additionalProperties: false,
      },
      steps: { type: 'array', minItems: 1, items: ref('step') },
    },
    required: ['schemaVersion', 'id', 'steps'],
    additionalProperties: false,
    $defs: {
      condition: {
        oneOf: [
          {
            ...obj(
              {
                field: str,
                operator: { enum: OPERATORS },
                value: {},
                coerce: { enum: ['string'] },
              },
              ['field', 'operator'],
            ),
            allOf: [
              {
                if: { properties: { operator: { enum: ['filled', 'empty'] } } },
                // biome-ignore lint/suspicious/noThenProperty: `then` is a JSON Schema keyword
                then: { not: { required: ['value'] } },
                else: { required: ['value'] },
              },
              {
                if: { properties: { operator: { enum: ['in', 'notIn'] } } },
                // biome-ignore lint/suspicious/noThenProperty: `then` is a JSON Schema keyword
                then: { properties: { value: { type: 'array' } } },
              },
            ],
          },
          obj(
            { all: { type: 'array', minItems: 1, items: ref('condition') } },
            ['all'],
          ),
          obj(
            { any: { type: 'array', minItems: 1, items: ref('condition') } },
            ['any'],
          ),
          obj({ not: ref('condition') }, ['not']),
        ],
      },
      field: {
        oneOf: [
          ...fieldTypes.map((t) => fieldDef(t, FIELD_KEYS[t])),
          customField,
        ],
      },
      arrayItemField: {
        oneOf: itemTypes.map((t) =>
          fieldDef(t, FIELD_KEYS[t], { inArray: true }),
        ),
      },
      step: {
        oneOf: [...Object.keys(STEP_KEYS).map(step), customStep],
      },
    },
  };
};

// `node scripts/build-json-schema.mjs`: writes dist/schema.json from the built library.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { FIELD_KEYS, STEP_KEYS } = await import('../dist/schema.js');
  mkdirSync('dist', { recursive: true });
  writeFileSync(
    'dist/schema.json',
    `${JSON.stringify(buildJsonSchema({ FIELD_KEYS, STEP_KEYS }), null, 2)}\n`,
  );
  console.log('wrote dist/schema.json');
}
