import { beforeEach, expect, test } from 'bun:test';
import { clearDraft, restoreDraft, saveDraft, withoutSecrets } from '../draft';

const scheme = {
  steps: [
    {
      id: 'a',
      kind: 'form',
      fields: [{ type: 'text', name: 'name', label: 'N' }],
    },
    {
      id: 'b',
      kind: 'form',
      fields: [
        { type: 'password', name: 'pwd', label: 'P' },
        { type: 'text', name: 'city', label: 'C' },
      ],
    },
  ],
} as never;

const ctx = { persistKey: 'draft-test', formId: 'f', scheme };

beforeEach(() => localStorage.clear());

test('nothing stored restores nothing', () => {
  expect(restoreDraft(ctx)).toBeNull();
});

test('a saved draft restores its values and the visible step index', () => {
  saveDraft(ctx, 'b', { name: 'Ana', city: 'Cali' });
  expect(restoreDraft(ctx)).toEqual({
    values: { name: 'Ana', city: 'Cali' },
    stepIndex: 1,
    history: [],
  });
});

test('saving without a step id writes nothing', () => {
  saveDraft(ctx, undefined, { name: 'x' });
  expect(localStorage.getItem('artisanform:draft-test')).toBeNull();
});

test('a revision mismatch backs the draft up and starts clean by default', () => {
  saveDraft({ ...ctx, revision: 1 }, 'a', { name: 'Ana' });
  expect(restoreDraft({ ...ctx, revision: 2 })).toBeNull();
  expect(localStorage.getItem('artisanform:draft-test')).toBeNull();
  expect(
    localStorage.getItem('artisanform:draft-test:incompatible'),
  ).not.toBeNull();
});

test('onConflict can restore or discard', () => {
  saveDraft({ ...ctx, revision: 1 }, 'a', { name: 'Ana' });
  const restored = restoreDraft({
    ...ctx,
    revision: 2,
    onConflict: () => 'restore',
  });
  expect(restored?.values).toEqual({ name: 'Ana' });
  restoreDraft({ ...ctx, revision: 2, onConflict: () => 'discard' });
  expect(localStorage.getItem('artisanform:draft-test')).toBeNull();
});

test('a corrupt record is backed up, never thrown', () => {
  localStorage.setItem('artisanform:draft-test', '{nope');
  expect(restoreDraft(ctx)).toBeNull();
  expect(localStorage.getItem('artisanform:draft-test:incompatible')).toBe(
    '{nope',
  );
});

test('clearDraft removes the snapshot', () => {
  saveDraft(ctx, 'a', { name: 'Ana' });
  clearDraft('draft-test');
  expect(restoreDraft(ctx)).toBeNull();
});

test('secret fields are never written', () => {
  expect(
    withoutSecrets(scheme, { name: 'Ana', pwd: 'hunter2', city: 'Cali' }),
  ).toEqual({
    name: 'Ana',
    city: 'Cali',
  });
});
