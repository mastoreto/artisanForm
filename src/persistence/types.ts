import type { JSONValue } from '../schema/contract/types';

/**
 * What a draft stores. Plain JSON; never secrets (passwords, tokens, anything
 * a payment provider returned beyond a reference); files appear only as the
 * serializable descriptors the storage adapter returned, never as `File`.
 */
export interface ArtisanSnapshotV1 {
  snapshotVersion: 1;
  /** Which form this belongs to (`ArtisanSchemaV1.id`). */
  formId: string;
  /** The schema revision it was saved against, when the schema has one. */
  formRevision?: number;
  /** Where the user was, by stable step id (not by index). */
  currentStepId: string;
  /** Ids of the steps already left, in order (only forms with transitions write it). */
  history?: string[];
  values: Record<string, JSONValue>;
}

/**
 * Migrates a snapshot from one `formRevision` to a higher one. It receives a
 * copy, returns the new snapshot (with the higher `formRevision`) and may throw
 * to give up; the old draft is then kept aside, not lost.
 */
export type SnapshotMigration = (
  snapshot: ArtisanSnapshotV1,
) => ArtisanSnapshotV1;

/** Keyed by the revision each one migrates **from**. */
export type SnapshotMigrations = Record<number, SnapshotMigration>;

export type ConflictReason =
  /** Saved for another form. */
  | 'form-id'
  /** Saved against a different revision of the same form. */
  | 'revision'
  /** The saved step no longer exists (removed or renamed). */
  | 'step-missing'
  /** Written by a newer version of the library. */
  | 'unsupported-version'
  /** Not readable at all. */
  | 'corrupt';

export interface SnapshotConflict {
  reason: ConflictReason;
  /** The stored snapshot, when it could be read. */
  snapshot?: ArtisanSnapshotV1;
  /** What the running form looks like. */
  current: { formId: string; revision?: number; stepIds: string[] };
}

/**
 * What to do with a draft that does not fit the running form:
 * - `backup` (default): keep it under `artisanform:<key>:incompatible` and start clean.
 * - `restore`: apply its values anyway (starting at the first step if the step is gone).
 * - `discard`: delete it and start clean.
 */
export type ConflictDecision = 'backup' | 'restore' | 'discard';
