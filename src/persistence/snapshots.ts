import { isJSONValue } from '../schema/contract/json';
import type { JSONValue } from '../schema/contract/types';
import type {
  ArtisanSnapshotV1,
  ConflictReason,
  SnapshotConflict,
  SnapshotMigrations,
} from './types';

export const SNAPSHOT_VERSION = 1;
export const storageKey = (key: string) => `artisanform:${key}`;
export const backupKey = (key: string) => `artisanform:${key}:incompatible`;

/** A 0.2.0 draft: values plus the index of the step among the *visible* ones. */
export interface LegacyDraft {
  values: Record<string, unknown>;
  step: number;
}

export type StoredRecord =
  | { kind: 'snapshot'; snapshot: ArtisanSnapshotV1 }
  | { kind: 'legacy'; draft: LegacyDraft }
  | { kind: 'unsupported'; raw: string }
  | { kind: 'corrupt'; raw: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const isSnapshotV1 = (v: unknown): v is ArtisanSnapshotV1 =>
  isObj(v) &&
  v.snapshotVersion === SNAPSHOT_VERSION &&
  typeof v.formId === 'string' &&
  v.formId !== '' &&
  (v.formRevision === undefined || Number.isInteger(v.formRevision)) &&
  typeof v.currentStepId === 'string' &&
  (v.history === undefined ||
    (Array.isArray(v.history) &&
      v.history.every((id) => typeof id === 'string'))) &&
  isObj(v.values) &&
  isJSONValue(v.values);

/** Parses what is stored; never throws. */
export const parseStored = (raw: string): StoredRecord => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt', raw };
  }
  if (isObj(data) && 'snapshotVersion' in data) {
    if (isSnapshotV1(data)) return { kind: 'snapshot', snapshot: data };
    if (
      typeof data.snapshotVersion === 'number' &&
      data.snapshotVersion > SNAPSHOT_VERSION
    )
      return { kind: 'unsupported', raw };
    return { kind: 'corrupt', raw };
  }
  if (isObj(data) && isObj(data.values) && typeof data.step === 'number')
    return { kind: 'legacy', draft: { values: data.values, step: data.step } };
  return { kind: 'corrupt', raw };
};

/**
 * Keeps only JSON data. Anything else (a `File`, a function, a class
 * instance…) is dropped: files must be persisted as the descriptors the
 * storage adapter returned.
 */
export const toJSONValues = (
  values: Record<string, unknown>,
): Record<string, JSONValue> =>
  Object.fromEntries(
    Object.entries(values)
      .map(([k, v]) => [k, withoutUndefinedProps(v)] as const)
      .filter(([, v]) => v !== undefined && isJSONValue(v)),
  ) as Record<string, JSONValue>;

/**
 * `{ url: undefined }` is "no url" in JSON (JSON.stringify drops it), and
 * storage adapters write exactly that: strip those keys before judging a value.
 */
const withoutUndefinedProps = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(withoutUndefinedProps);
  if (typeof v === 'object' && v !== null) {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return v; // not plain data: left to isJSONValue
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== undefined)
        .map(([k, x]) => [k, withoutUndefinedProps(x)]),
    );
  }
  return v;
};

export const createSnapshot = (args: {
  formId: string;
  formRevision?: number;
  currentStepId: string;
  history?: string[];
  /** Secrets must already be removed by the caller (it knows the field types). */
  values: Record<string, unknown>;
}): ArtisanSnapshotV1 => ({
  snapshotVersion: SNAPSHOT_VERSION,
  formId: args.formId,
  ...(args.formRevision !== undefined
    ? { formRevision: args.formRevision }
    : {}),
  currentStepId: args.currentStepId,
  ...(args.history && args.history.length > 0 ? { history: args.history } : {}),
  values: toJSONValues(args.values),
});

/**
 * A 0.2.0 draft only knew an index among the visible steps. The caller
 * supplies which steps were visible for those values.
 */
export const upgradeLegacyDraft = (
  draft: LegacyDraft,
  ctx: {
    formId: string;
    formRevision?: number;
    visibleStepIds: (values: Record<string, unknown>) => string[];
  },
): ArtisanSnapshotV1 | null => {
  const ids = ctx.visibleStepIds(draft.values);
  if (ids.length === 0) return null;
  const index = Math.min(Math.max(0, Math.trunc(draft.step)), ids.length - 1);
  return createSnapshot({
    formId: ctx.formId,
    formRevision: ctx.formRevision,
    currentStepId: ids[index],
    values: draft.values,
  });
};

/** `null` when the snapshot fits the running form, otherwise why it does not. */
export const checkSnapshot = (
  snapshot: ArtisanSnapshotV1,
  current: SnapshotConflict['current'],
): ConflictReason | null => {
  if (snapshot.formId !== current.formId) return 'form-id';
  if (
    snapshot.formRevision !== undefined &&
    current.revision !== undefined &&
    snapshot.formRevision !== current.revision
  )
    return 'revision';
  if (!current.stepIds.includes(snapshot.currentStepId)) return 'step-missing';
  return null;
};

// ---- storage (best effort: storage can be missing, full or blocked) ----

/** What the draft needs from a storage: `localStorage`, `sessionStorage` or your own (synchronous). */
export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const store = (s?: DraftStorage): DraftStorage | null => {
  try {
    return s ?? globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const readRaw = (key: string, s?: DraftStorage): string | null => {
  try {
    return store(s)?.getItem(storageKey(key)) ?? null;
  } catch {
    return null;
  }
};

export const writeSnapshot = (
  key: string,
  snapshot: ArtisanSnapshotV1,
  s?: DraftStorage,
) => {
  try {
    store(s)?.setItem(storageKey(key), JSON.stringify(snapshot));
  } catch {
    // best effort: a full or blocked storage must never break the form
  }
};

export const clearSnapshot = (key: string, s?: DraftStorage) => {
  try {
    store(s)?.removeItem(storageKey(key));
  } catch {
    // best effort
  }
};

/** Moves the stored draft aside (one slot) so the form can start clean without destroying it. */
export const backupStored = (key: string, raw: string, s?: DraftStorage) => {
  try {
    const st = store(s);
    st?.setItem(backupKey(key), raw);
    st?.removeItem(storageKey(key));
  } catch {
    // best effort
  }
};

/** The stored record for `key`, parsed (never throws); `null` when nothing is stored. */
export const readSnapshot = (
  key: string,
  s?: DraftStorage,
): StoredRecord | null => {
  const raw = readRaw(key, s);
  return raw === null ? null : parseStored(raw);
};

export type MigrationResult =
  | { ok: true; snapshot: ArtisanSnapshotV1 }
  | {
      ok: false;
      reason: 'no-migration' | 'threw' | 'invalid' | 'not-forward' | 'newer';
    };

/**
 * Brings a snapshot saved against an older `formRevision` up to `target` by
 * chaining your migrations: `migrations[n]` receives a copy of a snapshot at
 * revision `n` and returns it at a higher revision (set `formRevision`). Never
 * mutates its input; any failure is reported, not thrown, so the caller can
 * keep the old draft.
 */
export const migrateSnapshot = (
  snapshot: ArtisanSnapshotV1,
  target: number,
  migrations: SnapshotMigrations,
): MigrationResult => {
  let current = snapshot;
  // The loop is bounded: every accepted step raises the revision.
  for (let i = 0; i < 1000; i++) {
    const at = current.formRevision;
    if (at === target) return { ok: true, snapshot: current };
    if (at === undefined || at > target) return { ok: false, reason: 'newer' };
    const migrate = migrations[at];
    if (!migrate) return { ok: false, reason: 'no-migration' };
    let next: unknown;
    try {
      next = migrate(JSON.parse(JSON.stringify(current)));
    } catch {
      return { ok: false, reason: 'threw' };
    }
    if (!isSnapshotV1(next)) return { ok: false, reason: 'invalid' };
    if (next.formRevision === undefined || next.formRevision <= at)
      return { ok: false, reason: 'not-forward' };
    current = next;
  }
  return { ok: false, reason: 'not-forward' };
};
