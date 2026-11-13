import { expect, test } from 'bun:test';
import { compareSchemas } from '../compare';
import type { ArtisanSchemaV1 } from '../contract/define';

const form = (...fields: unknown[]) =>
  ({
    schemaVersion: 1,
    id: 'f',
    steps: [{ id: 's', type: 'form', title: 'S', fields }],
  }) as unknown as ArtisanSchemaV1;

const v1 = form(
  { name: 'name', type: 'text' },
  {
    name: 'diet',
    type: 'select',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
  },
  { name: 'team', type: 'array', itemFields: [{ name: 'who', type: 'text' }] },
);

test('identical schemas have no changes and are compatible', () => {
  expect(compareSchemas(v1, v1)).toEqual({
    added: [],
    removed: [],
    typeChanged: [],
    requiredChanged: [],
    optionsRemoved: [],
    compatible: true,
  });
});

test('adding, removing, requiring and dropping options are compatible', () => {
  const v2 = form(
    { name: 'name', type: 'text', required: true },
    { name: 'diet', type: 'select', options: [{ value: 'a', label: 'A' }] },
    { name: 'phone', type: 'tel' },
  );
  const r = compareSchemas(v1, v2);
  expect(r.added).toEqual(['phone']);
  expect(r.removed).toEqual(['team', 'team[].who']);
  expect(r.requiredChanged).toEqual([{ name: 'name', from: false, to: true }]);
  expect(r.optionsRemoved).toEqual([{ name: 'diet', values: ['b'] }]);
  expect(r.compatible).toBe(true);
});

test('a question that changes type is incompatible, rows included', () => {
  const v2 = form(
    { name: 'name', type: 'textarea' },
    {
      name: 'diet',
      type: 'select',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    },
    {
      name: 'team',
      type: 'array',
      itemFields: [{ name: 'who', type: 'email' }],
    },
  );
  const r = compareSchemas(v1, v2);
  expect(r.typeChanged).toEqual([
    { name: 'name', from: 'text', to: 'textarea' },
    { name: 'team[].who', from: 'text', to: 'email' },
  ]);
  expect(r.compatible).toBe(false);
});

test('content fields are not questions', () => {
  const a = form({ name: 'h', type: 'heading', text: 'A' });
  const b = form({ name: 'h', type: 'paragraph', text: 'B' });
  expect(compareSchemas(a, b).typeChanged).toEqual([]);
});
