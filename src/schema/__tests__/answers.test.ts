import { expect, test } from 'bun:test';
import { answerFields, answerKeys, sensitiveAnswerKeys } from '../answers';
import type { ArtisanSchemaV1 } from '../contract/define';
import type { ArtisanFieldV1 } from '../contract/fields';

const form = (...fields: ArtisanFieldV1[]): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'f',
  steps: [{ id: 's', type: 'form', title: 'S', fields }],
});

test('a range and a dynamic select write two keys; content fields none', () => {
  const [range, dynamic, heading, text] = [
    { type: 'daterange', name: 'trip', endName: 'back' },
    { type: 'dynamicSelect', name: 'country', options: [] },
    { type: 'heading', name: 'h', label: 'H' },
    { type: 'text', name: 'name' },
  ] as ArtisanFieldV1[];
  expect(answerKeys(range as ArtisanFieldV1)).toEqual(['trip', 'back']);
  expect(answerKeys(dynamic as ArtisanFieldV1)).toEqual([
    'country',
    'countryDependent',
  ]);
  expect(answerKeys(heading as ArtisanFieldV1)).toEqual([]);
  expect(answerKeys(text as ArtisanFieldV1)).toEqual(['name']);
});

test('answerFields lists the questions of the form steps, in order', () => {
  const schema: ArtisanSchemaV1 = {
    schemaVersion: 1,
    id: 'f',
    steps: [
      {
        id: 'a',
        type: 'form',
        title: 'A',
        fields: [
          { type: 'heading', name: 'h', text: 'Hi' },
          { type: 'text', name: 'name' },
        ],
      },
      { id: 'r', type: 'review', title: 'Review' },
      {
        id: 'b',
        type: 'form',
        title: 'B',
        fields: [{ type: 'email', name: 'mail' }],
      },
    ],
  };
  expect(answerFields(schema).map((f) => f.name)).toEqual(['name', 'mail']);
});

test('sensitive answer keys include both keys of a range and the whole array', () => {
  const schema = form(
    { type: 'text', name: 'name' },
    { type: 'text', name: 'diet', sensitive: true },
    { type: 'daterange', name: 'trip', endName: 'back', sensitive: true },
    {
      type: 'array',
      name: 'team',
      itemFields: [{ type: 'text', name: 'id', sensitive: true }],
    },
  );
  expect(sensitiveAnswerKeys(schema).sort()).toEqual([
    'back',
    'diet',
    'team',
    'trip',
  ]);
});

test('without flags nothing is sensitive', () => {
  expect(sensitiveAnswerKeys(form({ type: 'text', name: 'n' }))).toEqual([]);
});
