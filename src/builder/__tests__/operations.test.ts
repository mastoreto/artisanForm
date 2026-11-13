import { describe, expect, test } from 'bun:test';
import { checkSchema } from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import { claimedNames, toName, uniqueName } from '../model/names';
import {
  addField,
  addStep,
  duplicateField,
  duplicateStep,
  getField,
  getProperty,
  moveField,
  moveStep,
  referencesTo,
  removeField,
  removeStep,
  renameField,
  renameStep,
  setProperty,
} from '../model/operations';
import { pathToSelection, selectionExists } from '../model/selection';

const base = (): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'f',
  steps: [
    {
      id: 'a',
      type: 'form',
      title: 'A',
      fields: [
        { type: 'text', name: 'email', label: 'Email' },
        { type: 'daterange', name: 'stay', label: 'Stay' },
        {
          type: 'text',
          name: 'company',
          visibleWhen: { field: 'email', operator: 'filled' },
        },
        {
          type: 'array',
          name: 'team',
          itemFields: [{ type: 'text', name: 'who' }],
        },
      ],
      next: [{ when: { field: 'email', operator: 'filled' }, to: 'b' }],
    },
    {
      id: 'b',
      type: 'form',
      title: 'B',
      fields: [{ type: 'text', name: 'note' }],
    },
    { id: 'done', type: 'result', title: 'Done' },
  ],
});

const valid = (s: ArtisanSchemaV1) =>
  checkSchema(s, { lint: false }).issues.filter((i) => i.severity === 'error');

test('operations never mutate their input', () => {
  const s = base();
  const frozen = JSON.stringify(s);
  addField(s, 'a', 'select');
  removeField(s, 'a', [0]);
  moveField(s, { stepId: 'a', path: [0] }, { stepId: 'b', index: 0 });
  renameField(s, 'a', [0], 'mail');
  duplicateStep(s, 'a');
  setProperty(s, { kind: 'form' }, 'title', 'X');
  expect(JSON.stringify(s)).toBe(frozen);
});

describe('names', () => {
  test('toName makes a safe identifier', () => {
    expect(toName('Full name!')).toBe('fullName');
    expect(toName('2nd choice')).toBe('field2ndChoice');
    expect(toName('  ')).toBe('');
  });

  test('claimedNames includes the implicit ones', () => {
    const s = addStep(addStep(base(), 'payment').schema, 'terms').schema;
    const claimed = claimedNames(s);
    for (const name of [
      'email',
      'stay',
      'stayEnd',
      'team',
      'who',
      'payment',
      'termsAccepted',
    ])
      expect(claimed.has(name)).toBe(true);
  });

  test('a date range cannot take a name whose second key is claimed', () => {
    const s = base(); // claims `stay` and `stayEnd`
    expect(uniqueName(s, 'stay', 'daterange')).toBe('stay2');
    // a plain field called `stayEnd` blocks a range named `stay`
    const t = addField(base(), 'a', 'text').schema;
    (getField(t, 'a', [4]) as unknown as { name: string }).name = 'trip';
    (
      t.steps[0] as unknown as { fields: { name: string; type: string }[] }
    ).fields.push({ type: 'text', name: 'tripEnd' });
    expect(uniqueName(t, 'trip', 'daterange')).toBe('trip2');
  });

  test('adding the same type many times never repeats a name', () => {
    let s = base();
    for (let i = 0; i < 12; i++) s = addField(s, 'b', 'daterange').schema;
    expect(valid(s)).toEqual([]);
  });
});

describe('fields', () => {
  test('addField inserts where asked and selects the new field', () => {
    const r = addField(base(), 'a', 'email', { index: 1 });
    expect(r.selection).toEqual({ kind: 'field', stepId: 'a', path: [1] });
    expect(getField(r.schema, 'a', [1])?.type).toBe('email');
    expect(valid(r.schema)).toEqual([]);
  });

  test('rows of an array are flat: no arrays and no content inside', () => {
    expect(addField(base(), 'a', 'array', { parent: [3] }).error).toBe(
      'not-allowed',
    );
    expect(addField(base(), 'a', 'heading', { parent: [3] }).error).toBe(
      'not-allowed',
    );
    const ok = addField(base(), 'a', 'email', { parent: [3] });
    expect(ok.selection).toEqual({ kind: 'field', stepId: 'a', path: [3, 1] });
    expect(valid(ok.schema)).toEqual([]);
  });

  test('a new array gets row names that do not clash', () => {
    const r = addField(addField(base(), 'a', 'array').schema, 'a', 'array');
    expect(valid(r.schema)).toEqual([]);
  });

  test('removeField prunes what read it and reports it', () => {
    const r = removeField(base(), 'a', [0]); // `email`
    expect(valid(r.schema)).toEqual([]);
    expect(r.prunedReferences?.sort()).toEqual(
      [
        'steps[0].fields[1].visibleWhen'.replace('[1]', '[1]'),
        'steps[0].next[0].when',
      ].sort(),
    );
    // the transition that depended on it is gone, not made unconditional
    expect((r.schema.steps[0] as { next?: unknown }).next).toBeUndefined();
  });

  test('the last field of a repeating group cannot be taken out', () => {
    expect(removeField(base(), 'a', [3, 0]).error).toBe('not-allowed');
    expect(
      moveField(
        base(),
        { stepId: 'a', path: [3, 0] },
        { stepId: 'b', index: 0 },
      ).error,
    ).toBe('not-allowed');
    // reordering inside the same group is fine
    const two = addField(base(), 'a', 'email', { parent: [3] }).schema;
    expect(
      moveField(
        two,
        { stepId: 'a', path: [3, 0] },
        { stepId: 'a', index: 1, parent: [3] },
      ).error,
    ).toBeUndefined();
  });

  test('removeField of a nested field and selection fallback', () => {
    const two = addField(base(), 'a', 'email', { parent: [3] }).schema;
    const r = removeField(two, 'a', [3, 1]);
    expect(r.selection).toEqual({ kind: 'field', stepId: 'a', path: [3, 0] });
  });

  test('moveField reorders, crosses steps and enters or leaves rows', () => {
    const within = moveField(
      base(),
      { stepId: 'a', path: [0] },
      { stepId: 'a', index: 2 },
    );
    expect(within.selection).toEqual({ kind: 'field', stepId: 'a', path: [2] });
    expect(getField(within.schema, 'a', [2])?.name).toBe('email');
    const across = moveField(
      base(),
      { stepId: 'a', path: [2] },
      { stepId: 'b', index: 0 },
    );
    expect(getField(across.schema, 'b', [0])?.name).toBe('company');
    const into = moveField(
      base(),
      { stepId: 'a', path: [0] },
      { stepId: 'a', index: 0, parent: [3] },
    );
    expect(getField(into.schema, 'a', [2, 0])?.name).toBe('email');
    for (const r of [within, across, into]) expect(r.error).toBeUndefined();
    expect(
      moveField(
        base(),
        { stepId: 'a', path: [3] },
        { stepId: 'a', index: 0, parent: [3] },
      ).error,
    ).toBe('not-allowed');
  });

  test('duplicateField gives the copy fresh names, rows and implicit keys included', () => {
    const range = duplicateField(base(), 'a', [1]);
    expect(valid(range.schema)).toEqual([]);
    const arr = duplicateField(base(), 'a', [3]);
    expect(valid(arr.schema)).toEqual([]);
    expect(getField(arr.schema, 'a', [4])?.name).toBe('team2');
  });

  test('renameField moves conditions, sameAs and translations with it', () => {
    const s = base();
    (s.steps[0] as unknown as { fields: unknown[] }).fields.push({
      type: 'password',
      name: 'pw',
      validation: { sameAs: 'email' },
    });
    s.i18n = { messages: { es: { 'steps.a.fields.email.label': 'Correo' } } };
    const r = renameField(s, 'a', [0], 'mail');
    expect(r.error).toBeUndefined();
    expect(valid(r.schema)).toEqual([]);
    expect(referencesTo(r.schema, new Set(['email']))).toEqual([]);
    expect(referencesTo(r.schema, new Set(['mail'])).length).toBe(3);
    expect(r.schema.i18n?.messages?.es).toEqual({
      'steps.a.fields.mail.label': 'Correo',
    });
  });

  test('renaming a date range moves its implicit end key too', () => {
    const s = base();
    (s.steps[0] as unknown as { fields: unknown[] }).fields.push({
      type: 'text',
      name: 'x',
      visibleWhen: { field: 'stayEnd', operator: 'filled' },
    });
    const r = renameField(s, 'a', [1], 'trip');
    expect(valid(r.schema)).toEqual([]);
    expect(referencesTo(r.schema, new Set(['tripEnd'])).length).toBe(1);
  });

  test('renameField refuses unsafe and taken names', () => {
    expect(renameField(base(), 'a', [0], 'a.b').error).toBe('invalid-name');
    expect(renameField(base(), 'a', [0], '__proto__').error).toBe(
      'invalid-name',
    );
    expect(renameField(base(), 'a', [0], 'company').error).toBe(
      'duplicate-name',
    );
    expect(renameField(base(), 'a', [0], 'stayEnd').error).toBe(
      'duplicate-name',
    );
    expect(renameField(base(), 'a', [0], 'email').error).toBeUndefined();
  });
});

describe('steps', () => {
  test('addStep, moveStep and a unique id', () => {
    const r = addStep(addStep(base(), 'form').schema, 'form');
    expect(r.schema.steps.map((s) => s.id)).toEqual([
      'a',
      'b',
      'done',
      'form',
      'form2',
    ]);
    const moved = moveStep(r.schema, 'form2', 0);
    expect(moved.schema.steps[0]?.id).toBe('form2');
    expect(valid(moved.schema)).toEqual([]);
  });

  test('removeStep cleans transitions and failTo, and keeps at least one step', () => {
    const r = removeStep(base(), 'b');
    expect(valid(r.schema)).toEqual([]);
    expect((r.schema.steps[0] as { next?: unknown }).next).toBeUndefined();
    let one = base();
    one = removeStep(removeStep(one, 'b').schema, 'done').schema;
    expect(removeStep(one, 'a').error).toBe('not-allowed');
    expect(removeStep(base(), 'zzz').error).toBe('not-found');
  });

  test('removing a step prunes conditions that read its fields', () => {
    const s = base();
    (s.steps[2] as unknown as Record<string, unknown>).visibleWhen = {
      field: 'note',
      operator: 'filled',
    };
    const r = removeStep(s, 'b');
    expect(valid(r.schema)).toEqual([]);
    expect(r.prunedReferences).toContain('steps[1].visibleWhen');
  });

  test("duplicateStep renames fields and keeps the copy's own conditions pointing at it", () => {
    const r = duplicateStep(base(), 'a');
    expect(valid(r.schema)).toEqual([]);
    const copy = r.schema.steps[1] as unknown as {
      fields: { name: string; visibleWhen?: { field: string } }[];
    };
    expect(copy.fields.map((f) => f.name)).toEqual([
      'email2',
      'stay2',
      'company2',
      'team2',
    ]);
    expect(copy.fields[2]?.visibleWhen?.field).toBe('email2');
  });

  test('renameStep updates transitions, failTo and translations', () => {
    const s = base();
    s.i18n = { messages: { es: { 'steps.b.title': 'Paso B' } } };
    const r = renameStep(s, 'b', 'details');
    expect(valid(r.schema)).toEqual([]);
    expect((r.schema.steps[0] as { next: { to: string }[] }).next[0]?.to).toBe(
      'details',
    );
    expect(r.schema.i18n?.messages?.es).toEqual({
      'steps.details.title': 'Paso B',
    });
    expect(renameStep(s, 'b', 'a').error).toBe('duplicate-name');
    expect(renameStep(s, 'b', 'x.y').error).toBe('invalid-name');
  });
});

describe('properties', () => {
  test('setProperty sets a nested path and prunes what it empties', () => {
    const sel = { kind: 'field', stepId: 'a', path: [0] } as const;
    const set = setProperty(base(), sel, 'validation.maxLength', 40);
    expect(getProperty(set.schema, sel, 'validation.maxLength')).toBe(40);
    const cleared = setProperty(
      set.schema,
      sel,
      'validation.maxLength',
      undefined,
    );
    expect(getField(cleared.schema, 'a', [0])).not.toHaveProperty('validation');
    expect(valid(cleared.schema)).toEqual([]);
  });

  test('name and a step id go through rename so references follow', () => {
    const r = setProperty(
      base(),
      { kind: 'field', stepId: 'a', path: [0] },
      'name',
      'mail',
    );
    expect(referencesTo(r.schema, new Set(['mail'])).length).toBeGreaterThan(0);
    const s = setProperty(
      base(),
      { kind: 'step', stepId: 'b' },
      'id',
      'details',
    );
    expect(s.schema.steps[1]?.id).toBe('details');
  });

  test('form-level properties', () => {
    const r = setProperty(base(), { kind: 'form' }, 'ui.density', 'compact');
    expect(valid(r.schema)).toEqual([]);
    expect(getProperty(r.schema, { kind: 'form' }, 'ui.density')).toBe(
      'compact',
    );
  });

  test('a missing target is reported, not thrown', () => {
    expect(
      setProperty(base(), { kind: 'step', stepId: 'zzz' }, 'title', 'x').error,
    ).toBe('not-found');
  });
});

describe('selection from an issue path', () => {
  test('maps a path to the element it names', () => {
    const s = base();
    expect(pathToSelection(s, '$')).toEqual({ kind: 'form' });
    expect(pathToSelection(s, 'steps[1].title')).toEqual({
      kind: 'step',
      stepId: 'b',
    });
    expect(pathToSelection(s, 'steps[0].fields[2].visibleWhen.field')).toEqual({
      kind: 'field',
      stepId: 'a',
      path: [2],
    });
    expect(pathToSelection(s, 'steps[0].fields[3].itemFields[0].name')).toEqual(
      { kind: 'field', stepId: 'a', path: [3, 0] },
    );
    expect(pathToSelection(s, 'steps[9].title')).toEqual({ kind: 'form' });
  });

  test('selectionExists', () => {
    const s = base();
    expect(
      selectionExists(s, { kind: 'field', stepId: 'a', path: [3, 0] }),
    ).toBe(true);
    expect(
      selectionExists(s, { kind: 'field', stepId: 'a', path: [3, 5] }),
    ).toBe(false);
    expect(selectionExists(s, { kind: 'step', stepId: 'nope' })).toBe(false);
  });
});
