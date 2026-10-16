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

const rich: FormSchema = {
  steps: [
    {
      title: 'R',
      fields: [
        { type: 'email', name: 'mail', label: 'Mail', required: true },
        { type: 'number', name: 'age', label: 'Age', min: 18, max: 99 },
        { type: 'text', name: 'code', label: 'Code', pattern: '^[A-Z]{3}$' },
        { type: 'text', name: 'bio', label: 'Bio', min: 3, max: 5 },
        { type: 'textarea', name: 'note', label: 'Note', defaultValue: 'hi' },
        { type: 'check', name: 'tags', label: 'T', defaultValue: ['a'] },
      ],
    },
  ],
};

const errorsOf = (values: object) =>
  buildValidationSchema(rich)
    .validate(values, { abortEarly: false })
    .then(() => [] as string[])
    .catch((e) => e.errors as string[]);

const ok = { mail: 'a@b.co', age: '', code: '', bio: '', note: '', tags: [] };

test('defaultValue feeds initial values', () => {
  const v = buildInitialValues(rich);
  expect(v.note).toBe('hi');
  expect(v.tags).toEqual(['a']);
  expect(v.age).toBe('');
});

test('optional empty fields pass; email, number, pattern and length rules fail', async () => {
  expect(await errorsOf(ok)).toEqual([]);
  expect(await errorsOf({ ...ok, mail: 'nope' })).toEqual(['Email inválido']);
  expect(await errorsOf({ ...ok, age: 17 })).toEqual(['Mínimo 18']);
  expect(await errorsOf({ ...ok, age: 100 })).toEqual(['Máximo 99']);
  expect(await errorsOf({ ...ok, age: 'x' })).toEqual(['Número inválido']);
  expect(await errorsOf({ ...ok, code: 'ab' })).toEqual(['Formato inválido']);
  expect(await errorsOf({ ...ok, code: 'ABC', age: 30 })).toEqual([]);
  expect(await errorsOf({ ...ok, bio: 'ab' })).toEqual(['Mínimo 3 caracteres']);
  expect(await errorsOf({ ...ok, bio: 'abcdef' })).toEqual([
    'Máximo 5 caracteres',
  ]);
});
