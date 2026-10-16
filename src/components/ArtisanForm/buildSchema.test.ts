import { expect, test } from 'bun:test';
import { buildInitialValues, buildValidationSchema } from './buildSchema';
import type { FormSchema } from './types';

const scheme: FormSchema = {
  steps: [
    {
      title: 'A',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true, min: 3 },
        { type: 'check', name: 'tags', label: 'Tags', required: true },
      ],
    },
    {
      title: 'B',
      fields: [
        {
          type: 'select',
          name: 'color',
          label: 'Color',
          options: [{ value: 'r', label: 'Red' }],
        },
      ],
    },
  ],
};

const dyn: FormSchema = {
  steps: [
    {
      title: 'C',
      fields: [
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          label: 'Place',
          required: true,
          options: [{ value: 'ar', label: 'AR' }],
          dependentOptions: { ar: [{ value: 'bsas', label: 'BA' }] },
        },
      ],
    },
  ],
};

test('dynamicSelect owns parent and child values', async () => {
  expect(buildInitialValues(dyn)).toEqual({ country: 'ar', city: 'bsas' });
  const schema = buildValidationSchema(dyn);
  expect(await schema.isValid({ country: 'ar', city: '' })).toBe(false);
});

test('initial values per field type', () => {
  expect(buildInitialValues(scheme)).toEqual({
    name: '',
    tags: [],
    color: 'r',
  });
});

test('validation: required, min and array min', async () => {
  const schema = buildValidationSchema(scheme);
  const bad = await schema
    .validate({ name: 'ab', tags: [], color: 'r' }, { abortEarly: false })
    .catch((e) => e.errors);
  expect(bad).toEqual(['Mínimo 3 caracteres', 'Campo requerido']);
  expect(await schema.isValid({ name: 'abc', tags: ['x'], color: 'r' })).toBe(
    true,
  );
});
