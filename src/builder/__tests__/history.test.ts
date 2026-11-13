import { expect, test } from 'bun:test';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import {
  canRedo,
  canUndo,
  commit,
  createBuilderState,
  HISTORY_LIMIT,
  redo,
  select,
  undo,
} from '../model/history';
import { addField, setProperty } from '../model/operations';

const blank = (): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'f',
  steps: [{ id: 'a', type: 'form', title: 'A', fields: [] }],
});
const fields = (s: { schema: ArtisanSchemaV1 }) =>
  (s.schema.steps[0] as unknown as { fields: unknown[] }).fields.length;

test('undo and redo walk the changes, and a new change clears the redo stack', () => {
  let s = createBuilderState(blank());
  expect(canUndo(s)).toBe(false);
  s = commit(s, addField(s.schema, 'a', 'text'));
  s = commit(s, addField(s.schema, 'a', 'email'));
  expect(fields(s)).toBe(2);
  s = undo(s);
  expect(fields(s)).toBe(1);
  expect(canRedo(s)).toBe(true);
  s = redo(s);
  expect(fields(s)).toBe(2);
  s = undo(undo(s));
  expect(fields(s)).toBe(0);
  s = commit(s, addField(s.schema, 'a', 'url'));
  expect(canRedo(s)).toBe(false);
  expect(undo(undo(s))).toEqual(undo(s)); // nothing before the first change
});

test('undo restores the selection too', () => {
  let s = createBuilderState(blank());
  s = commit(s, addField(s.schema, 'a', 'text'));
  expect(s.selection).toEqual({ kind: 'field', stepId: 'a', path: [0] });
  expect(undo(s).selection).toEqual({ kind: 'form' });
});

test('edits to one field close together merge into one undo step', () => {
  let s = createBuilderState(blank());
  s = commit(s, addField(s.schema, 'a', 'text'));
  const sel = s.selection;
  for (const [i, text] of ['H', 'He', 'Hel'].entries())
    s = commit(s, setProperty(s.schema, sel, 'label', text), {
      key: 'label',
      at: 1000 + i * 100,
    });
  expect(s.past.length).toBe(2); // the add, and the three edits as one step
  s = commit(s, setProperty(s.schema, sel, 'label', 'Hello'), {
    key: 'label',
    at: 9000,
  });
  expect(s.past.length).toBe(3); // too late to merge
  const other = commit(s, setProperty(s.schema, sel, 'description', 'x'), {
    key: 'description',
    at: 9050,
  });
  expect(other.past.length).toBe(4); // another key never merges
});

test('a refused change is ignored', () => {
  const s = createBuilderState(blank());
  const refused = commit(s, { schema: s.schema, error: 'not-found' });
  expect(refused).toBe(s);
});

test('the history is capped', () => {
  let s = createBuilderState(blank());
  for (let i = 0; i < HISTORY_LIMIT + 20; i++)
    s = commit(s, addField(s.schema, 'a', 'text'));
  expect(s.past.length).toBe(HISTORY_LIMIT);
});

test('select ignores something that does not exist and is not an undo step', () => {
  let s = createBuilderState(blank());
  s = commit(s, addField(s.schema, 'a', 'text'));
  const before = s.past.length;
  s = select(s, { kind: 'step', stepId: 'a' });
  expect(s.selection).toEqual({ kind: 'step', stepId: 'a' });
  expect(select(s, { kind: 'step', stepId: 'zzz' })).toBe(s);
  expect(s.past.length).toBe(before);
});
