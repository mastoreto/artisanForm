import { expect, test } from 'bun:test';
import type { ArtisanSchemaV1 } from '../contract/define';
import { lintSchema } from '../lint';

const base = (steps: unknown[]) =>
  ({ schemaVersion: 1, id: 'f', steps }) as unknown as ArtisanSchemaV1;

const codes = (s: ArtisanSchemaV1) =>
  lintSchema(s).map((i) => `${i.code} @ ${i.path}`);

test('a clean schema has no warnings', () => {
  expect(
    codes(
      base([
        {
          id: 'a',
          type: 'form',
          title: 'A',
          fields: [
            {
              name: 'kind',
              type: 'radio',
              options: [{ value: 'p', label: 'P' }],
              defaultValue: 'p',
            },
            {
              name: 'co',
              type: 'text',
              visibleWhen: { field: 'kind', operator: 'eq', value: 'p' },
            },
          ],
        },
      ]),
    ),
  ).toEqual([]);
});

test('a condition that reads a later step is flagged (field, step and edge)', () => {
  const s = base([
    {
      id: 'a',
      type: 'form',
      title: 'A',
      fields: [
        {
          name: 'x',
          type: 'text',
          visibleWhen: { field: 'late', operator: 'eq', value: '1' },
        },
      ],
      next: [{ when: { field: 'late', operator: 'eq', value: '1' }, to: 'b' }],
    },
    {
      id: 'b',
      type: 'form',
      title: 'B',
      visibleWhen: { field: 'late', operator: 'eq', value: '1' },
      fields: [{ name: 'late', type: 'text' }],
    },
  ]);
  expect(codes(s)).toEqual([
    'forward-field-reference @ steps[0].next[0].when',
    'forward-field-reference @ steps[0].fields[0].visibleWhen',
  ]);
});

test('the range end and the dynamic select child count as asked keys', () => {
  const s = base([
    {
      id: 'a',
      type: 'form',
      title: 'A',
      fields: [
        {
          name: 'x',
          type: 'text',
          visibleWhen: { field: 'tripEnd', operator: 'eq', value: '1' },
        },
      ],
    },
    {
      id: 'b',
      type: 'form',
      title: 'B',
      fields: [{ name: 'trip', type: 'daterange' }],
    },
  ]);
  expect(codes(s)).toEqual([
    'forward-field-reference @ steps[0].fields[0].visibleWhen',
  ]);
});

test('duplicate options and a default that is not an option', () => {
  const s = base([
    {
      id: 'a',
      type: 'form',
      title: 'A',
      fields: [
        {
          name: 'c',
          type: 'select',
          options: [
            { value: 'a', label: 'A' },
            { value: 'a', label: 'A again' },
          ],
          defaultValue: 'z',
        },
        {
          name: 'm',
          type: 'multiselect',
          options: [{ value: 'a', label: 'A' }],
          defaultValue: ['a', 'q'],
        },
      ],
    },
  ]);
  expect(codes(s)).toEqual([
    'duplicate-option @ steps[0].fields[0].options[1]',
    'default-not-an-option @ steps[0].fields[0].defaultValue',
    'default-not-an-option @ steps[0].fields[1].defaultValue',
  ]);
});

test('lint only ever warns', () => {
  const s = base([
    {
      id: 'a',
      type: 'form',
      title: 'A',
      fields: [
        {
          name: 'c',
          type: 'select',
          options: [{ value: 'a', label: 'A' }],
          defaultValue: 'z',
        },
      ],
    },
  ]);
  expect(lintSchema(s).every((i) => i.severity === 'warning')).toBe(true);
});
