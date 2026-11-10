import { expect, test } from 'bun:test';
import type { ComponentProps } from 'react';
import { defineForm, type InferValues } from '../../../schema';
import type ArtisanForm from '../ArtisanForm';

// Compile-time equality: `tsc` fails if the two types differ.
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
      id: 'a',
      type: 'form',
      title: 'A',
      fields: [{ type: 'text', name: 'name', label: 'Name', required: true }],
    },
  ],
});

type Props = ComponentProps<typeof ArtisanForm<typeof schema>>;

test('ArtisanForm types onSubmit with the values inferred from the schema', () => {
  assertType<
    Equals<Parameters<Props['onSubmit']>[0], InferValues<typeof schema>>
  >();
  assertType<Equals<Parameters<Props['onSubmit']>[0]['name'], string>>();
  expect(schema.id).toBe('typed');
});
