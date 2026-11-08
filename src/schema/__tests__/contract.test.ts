import { expect, test } from 'bun:test';
import { defaultFieldRegistry } from '../../components/fields/registry';
import { defaultStepRegistry } from '../../components/steps/registry';
import { type ArtisanSchemaV1, defineForm } from '../contract/define';
import {
  FIELD_KEYS,
  NATIVE_FIELD_TYPES,
  NATIVE_STEP_TYPES,
  STEP_KEYS,
} from '../contract/specs';

const sample = defineForm({
  schemaVersion: 1,
  id: 'registration',
  revision: 3,
  title: 'Registration',
  ui: { layout: 'vertical', density: 'comfortable' },
  steps: [
    {
      id: 'personal',
      type: 'form',
      title: 'Data',
      ui: { columns: 2 },
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'Email address',
          required: true,
          placeholder: 'name@company.com',
          validation: { maxLength: 255 },
          ui: { span: 2 },
        },
        { name: 'age', type: 'number', validation: { min: 18 } },
        {
          name: 'country',
          type: 'dynamicSelect',
          dependentName: 'city',
          options: [{ value: 'ar', label: 'Argentina' }],
          dependentOptions: { ar: [{ value: 'bsas', label: 'Buenos Aires' }] },
        },
        { name: 'score', type: 'x-stars', config: { max: 5 } },
        {
          name: 'company',
          type: 'text',
          visibleWhen: { field: 'kind', operator: 'eq', value: 'company' },
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
    { id: 'done', type: 'result', title: 'Done', message: 'Thanks' },
  ],
});

test('a v1 schema is plain JSON: it survives a round trip untouched', () => {
  expect(JSON.parse(JSON.stringify(sample))).toEqual(sample);
});

test('the types reject what the contract forbids', () => {
  const noOptionsOnText: ArtisanSchemaV1 = {
    schemaVersion: 1,
    id: 'x',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [
          {
            name: 'a',
            type: 'text',
            // @ts-expect-error `options` is not a text field property
            options: [],
          },
        ],
      },
    ],
  };
  const unknownStepType: ArtisanSchemaV1 = {
    schemaVersion: 1,
    id: 'x',
    steps: [
      {
        id: 's',
        // @ts-expect-error `pending` is `wait` in v1 (custom types start with "x-")
        type: 'pending',
        title: 'S',
      },
    ],
  };
  const noFunctions: ArtisanSchemaV1 = {
    schemaVersion: 1,
    id: 'x',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [],
        // @ts-expect-error functions are not part of the contract
        beforeNext: () => {},
      },
    ],
  };
  const onlyVersionOne: ArtisanSchemaV1 = {
    // @ts-expect-error only version 1 exists
    schemaVersion: 2,
    id: 'x',
    steps: [],
  };
  const noNestedArrays: ArtisanSchemaV1 = {
    schemaVersion: 1,
    id: 'x',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [
          {
            name: 'a',
            type: 'array',
            itemFields: [
              // @ts-expect-error nested arrays inside rows are not supported
              { name: 'b', type: 'array', itemFields: [] },
            ],
          },
        ],
      },
    ],
  };
  expect([
    noOptionsOnText,
    unknownStepType,
    noFunctions,
    onlyVersionOne,
    noNestedArrays,
  ]).toHaveLength(5);
});

test('v1 covers every field and step the 0.2.0 engine registers (no drift)', () => {
  const engineFields = Object.keys(defaultFieldRegistry).sort();
  expect([...NATIVE_FIELD_TYPES].sort() as string[]).toEqual(engineFields);
  // 0.2.0 `pending` is `wait` in v1
  const engineSteps = Object.keys(defaultStepRegistry)
    .map((k) => (k === 'pending' ? 'wait' : k))
    .sort();
  expect([...NATIVE_STEP_TYPES].sort() as string[]).toEqual(engineSteps);
});

test('every native type accepts its own discriminator and id/name base keys', () => {
  for (const type of NATIVE_FIELD_TYPES) {
    expect(FIELD_KEYS[type] as readonly string[]).toContain('type');
    expect(FIELD_KEYS[type] as readonly string[]).toContain('name');
  }
  for (const type of NATIVE_STEP_TYPES) {
    expect(STEP_KEYS[type] as readonly string[]).toContain('id');
    expect(STEP_KEYS[type] as readonly string[]).toContain('title');
  }
});
