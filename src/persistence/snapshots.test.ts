import { describe, expect, test } from 'bun:test';
import {
  backupKey,
  backupStored,
  checkSnapshot,
  clearSnapshot,
  createSnapshot,
  isSnapshotV1,
  parseStored,
  readRaw,
  storageKey,
  toJSONValues,
  upgradeLegacyDraft,
  writeSnapshot,
} from './snapshots';

const memory = (): Storage => {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
};

const snap = {
  snapshotVersion: 1 as const,
  formId: 'reg',
  formRevision: 2,
  currentStepId: 'b',
  values: {
    name: 'Ana',
    tags: ['x'],
    file: [{ id: '1', name: 'a.pdf', size: 3 }],
  },
};

describe('shape', () => {
  test('isSnapshotV1 accepts valid snapshots and rejects the rest', () => {
    expect(isSnapshotV1(snap)).toBe(true);
    expect(isSnapshotV1({ ...snap, formRevision: undefined })).toBe(true);
    for (const bad of [
      null,
      [],
      { ...snap, snapshotVersion: 2 },
      { ...snap, formId: '' },
      { ...snap, formRevision: 1.5 },
      { ...snap, currentStepId: 5 },
      { ...snap, values: [] },
      { ...snap, values: { f: () => {} } },
      { ...snap, values: { n: Number.NaN } },
    ])
      expect(isSnapshotV1(bad)).toBe(false);
  });

  test('parseStored tells snapshots, 0.2.0 drafts, future versions and junk apart', () => {
    expect(parseStored(JSON.stringify(snap))).toEqual({
      kind: 'snapshot',
      snapshot: snap,
    });
    expect(parseStored(JSON.stringify({ values: { a: 1 }, step: 2 }))).toEqual({
      kind: 'legacy',
      draft: { values: { a: 1 }, step: 2 },
    });
    expect(
      parseStored(JSON.stringify({ ...snap, snapshotVersion: 9 })).kind,
    ).toBe('unsupported');
    expect(
      parseStored(JSON.stringify({ ...snap, snapshotVersion: 1, formId: 7 }))
        .kind,
    ).toBe('corrupt');
    expect(parseStored('{not json').kind).toBe('corrupt');
    expect(parseStored('"text"').kind).toBe('corrupt');
    expect(parseStored(JSON.stringify({ values: {} })).kind).toBe('corrupt');
  });
});

describe('creating snapshots', () => {
  test('keeps JSON data and file descriptors; drops File objects, functions and undefined', () => {
    const file = new File(['x'], 'a.txt');
    const values = toJSONValues({
      ok: 'x',
      n: 0,
      nothing: null,
      uploaded: [{ id: '1', name: 'a.pdf', size: 3, url: 'https://cdn/x' }],
      raw: file,
      list: [file],
      fn: () => {},
      missing: undefined,
      date: new Date(),
      // adapters write `url: undefined` for "no url": that is still a valid descriptor
      noUrl: [{ id: '2', name: 'b.pdf', size: 1, url: undefined }],
    });
    expect(Object.keys(values).sort()).toEqual([
      'n',
      'noUrl',
      'nothing',
      'ok',
      'uploaded',
    ]);
    expect(values.noUrl).toEqual([{ id: '2', name: 'b.pdf', size: 1 }]);
  });

  test('omits formRevision when there is none and survives a JSON round trip', () => {
    const s = createSnapshot({
      formId: 'f',
      currentStepId: 'a',
      values: { x: 1 },
    });
    expect('formRevision' in s).toBe(false);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(isSnapshotV1(s)).toBe(true);
  });
});

describe('0.2.0 drafts', () => {
  const visible = (ids: string[]) => () => ids;

  test('the step index is mapped through the visible steps', () => {
    const s = upgradeLegacyDraft(
      { values: { a: 1 }, step: 1 },
      { formId: 'f', visibleStepIds: visible(['x', 'y', 'z']) },
    );
    expect(s).toMatchObject({
      formId: 'f',
      currentStepId: 'y',
      values: { a: 1 },
    });
  });

  test('out-of-range and negative indexes are clamped; no steps means no snapshot', () => {
    const ctx = { formId: 'f', visibleStepIds: visible(['x', 'y']) };
    expect(
      upgradeLegacyDraft({ values: {}, step: 99 }, ctx)?.currentStepId,
    ).toBe('y');
    expect(
      upgradeLegacyDraft({ values: {}, step: -3 }, ctx)?.currentStepId,
    ).toBe('x');
    expect(
      upgradeLegacyDraft(
        { values: {}, step: 0 },
        { formId: 'f', visibleStepIds: visible([]) },
      ),
    ).toBeNull();
  });

  test('visibility is computed from the draft values', () => {
    const ctx = {
      formId: 'f',
      visibleStepIds: (v: Record<string, unknown>) =>
        v.company ? ['a', 'tax', 'done'] : ['a', 'done'],
    };
    expect(
      upgradeLegacyDraft({ values: { company: true }, step: 1 }, ctx)
        ?.currentStepId,
    ).toBe('tax');
    expect(
      upgradeLegacyDraft({ values: {}, step: 1 }, ctx)?.currentStepId,
    ).toBe('done');
  });
});

describe('compatibility', () => {
  const current = { formId: 'reg', revision: 2, stepIds: ['a', 'b', 'c'] };

  test('compatible when form, revision and step all match', () => {
    expect(checkSnapshot(snap, current)).toBeNull();
  });

  test('says why it does not fit', () => {
    expect(checkSnapshot({ ...snap, formId: 'other' }, current)).toBe(
      'form-id',
    );
    expect(checkSnapshot({ ...snap, formRevision: 1 }, current)).toBe(
      'revision',
    );
    expect(checkSnapshot({ ...snap, currentStepId: 'gone' }, current)).toBe(
      'step-missing',
    );
  });

  test('a missing revision on either side cannot mismatch', () => {
    expect(
      checkSnapshot({ ...snap, formRevision: undefined }, current),
    ).toBeNull();
    expect(checkSnapshot(snap, { ...current, revision: undefined })).toBeNull();
  });
});

describe('storage', () => {
  test('write, read, back up (one slot, original removed) and clear', () => {
    const s = memory();
    writeSnapshot('k', snap, s);
    expect(readRaw('k', s)).toBe(JSON.stringify(snap));
    backupStored('k', readRaw('k', s) as string, s);
    expect(s.getItem(storageKey('k'))).toBeNull();
    expect(s.getItem(backupKey('k'))).toBe(JSON.stringify(snap));
    writeSnapshot('k', snap, s);
    clearSnapshot('k', s);
    expect(readRaw('k', s)).toBeNull();
    expect(s.getItem(backupKey('k'))).not.toBeNull(); // clearing never touches the backup
  });

  test('a storage that throws never breaks the caller', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(readRaw('k', broken)).toBeNull();
    expect(() => writeSnapshot('k', snap, broken)).not.toThrow();
    expect(() => clearSnapshot('k', broken)).not.toThrow();
    expect(() => backupStored('k', '{}', broken)).not.toThrow();
  });
});
