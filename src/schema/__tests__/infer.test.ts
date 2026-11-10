import { expect, test } from 'bun:test';
import { type ArtisanSchemaV1, defineForm } from '../contract/define';
import type { InferValues } from '../contract/infer';

// Compile-time equality: `tsc` fails the build if the two types differ.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const assertType = <_T extends true>() => {};

const schema = defineForm({
  schemaVersion: 1,
  id: 'typed',
  steps: [
    {
      id: 'who',
      type: 'form',
      title: 'Who',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'number', name: 'age', label: 'Age' },
        { type: 'switch', name: 'news', label: 'News' },
        { type: 'multiselect', name: 'tags', label: 'Tags' },
        { type: 'heading', name: 'h', text: 'Hi' },
        { type: 'daterange', name: 'from', endName: 'to', label: 'Dates' },
        {
          type: 'array',
          name: 'people',
          label: 'People',
          itemFields: [
            { type: 'text', name: 'first', label: 'First', required: true },
          ],
        },
        { type: 'x-stars', name: 'score', label: 'Score' },
      ],
    },
    { id: 'pay', type: 'payment', title: 'Pay', providers: ['stripe'] },
    {
      id: 'w',
      type: 'wait',
      title: 'W',
      strategy: 'order',
      resultName: 'orderId',
    },
    { id: 't', type: 'terms', title: 'T' },
  ],
});

type Values = InferValues<typeof schema>;

test('values are inferred from a literal schema', () => {
  assertType<Equals<Values['name'], string>>();
  assertType<Equals<Values['age'], number | undefined>>();
  assertType<Equals<Values['news'], boolean | undefined>>();
  assertType<Equals<Values['tags'], string[] | undefined>>();
  assertType<Equals<Values['from'], string | undefined>>();
  assertType<Equals<Values['to'], string | undefined>>();
  assertType<Equals<Values['people'], { first: string }[] | undefined>>();
  assertType<Equals<Values['score'], unknown>>();
  assertType<Equals<Values['termsAccepted'], boolean | undefined>>();
  assertType<Equals<Values['orderId'], unknown>>();
  // a required field is a required key; content fields add nothing
  const ok: Values = { name: 'Ana' };
  // @ts-expect-error `name` is required
  const missing: Values = { age: 3 };
  // @ts-expect-error the heading owns no value
  const heading: Values = { name: 'a', h: 'x' };
  expect([ok, missing, heading].length).toBe(3);
});

test('a schema that is not a literal falls back to a plain record', () => {
  assertType<Equals<InferValues<ArtisanSchemaV1>, Record<string, unknown>>>();
  expect(defineForm(schema)).toBe(schema);
});
