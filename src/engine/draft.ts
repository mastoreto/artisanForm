import {
  defaultFieldRegistry,
  definitionOf,
  type FieldRegistry,
  isSecretField,
} from '../components/fields/registry';
import type {
  ArtisanSnapshotV1,
  ConflictDecision,
  ConflictReason,
  SnapshotConflict,
} from '../persistence';
import {
  backupStored,
  checkSnapshot,
  clearSnapshot,
  createSnapshot,
  parseStored,
  readRaw,
  upgradeLegacyDraft,
  writeSnapshot,
} from '../persistence/snapshots';
import type { FormSchema } from '../schema/legacy/types';
import { fieldsOf, visibleSteps } from './conditions';

export interface RestoredDraft {
  values: Record<string, unknown>;
  /** Index among the currently visible steps. */
  stepIndex: number;
}

export interface DraftContext {
  persistKey: string;
  formId: string;
  revision?: number;
  /** The projected schema the engine runs (its steps carry ids). */
  scheme: FormSchema;
  onConflict?: (conflict: SnapshotConflict) => ConflictDecision;
}

const stepIdsOf = (scheme: FormSchema) =>
  scheme.steps.map((s) => s.id).filter((id): id is string => !!id);

const visibleIds = (scheme: FormSchema, values: Record<string, unknown>) =>
  visibleSteps(scheme, values)
    .map((s) => s.id)
    .filter((id): id is string => !!id);

/**
 * Reads the stored draft: a v1 snapshot, or a 0.2.0 `{ values, step }` draft
 * (upgraded on the fly; it is rewritten as a snapshot on the next save).
 * A draft that does not fit the running form is never destroyed silently: it
 * goes through `onConflict` (default: back it up and start clean).
 */
export const restoreDraft = (ctx: DraftContext): RestoredDraft | null => {
  const raw = readRaw(ctx.persistKey);
  if (raw === null) return null;
  const record = parseStored(raw);
  const current = {
    formId: ctx.formId,
    revision: ctx.revision,
    stepIds: stepIdsOf(ctx.scheme),
  };

  let snapshot: ArtisanSnapshotV1 | undefined;
  let reason: ConflictReason | null = null;
  if (record.kind === 'snapshot') {
    snapshot = record.snapshot;
    reason = checkSnapshot(snapshot, current);
  } else if (record.kind === 'legacy') {
    // A 0.2.0 draft knows no form id: it adopts the running form's.
    snapshot =
      upgradeLegacyDraft(record.draft, {
        formId: ctx.formId,
        formRevision: ctx.revision,
        visibleStepIds: (values) => visibleIds(ctx.scheme, values),
      }) ?? undefined;
    reason = snapshot ? checkSnapshot(snapshot, current) : 'corrupt';
  } else {
    reason = record.kind === 'unsupported' ? 'unsupported-version' : 'corrupt';
  }

  const indexOf = (s: ArtisanSnapshotV1) =>
    Math.max(0, visibleIds(ctx.scheme, s.values).indexOf(s.currentStepId));

  if (reason === null && snapshot) {
    return { values: snapshot.values, stepIndex: indexOf(snapshot) };
  }

  const decision =
    ctx.onConflict?.({ reason: reason ?? 'corrupt', snapshot, current }) ??
    'backup';
  if (decision === 'restore' && snapshot) {
    return { values: snapshot.values, stepIndex: indexOf(snapshot) };
  }
  if (decision === 'discard') clearSnapshot(ctx.persistKey);
  else backupStored(ctx.persistKey, raw);
  return null;
};

export const saveDraft = (
  ctx: Pick<DraftContext, 'persistKey' | 'formId' | 'revision'>,
  currentStepId: string | undefined,
  values: Record<string, unknown>,
) => {
  if (!currentStepId) return;
  writeSnapshot(
    ctx.persistKey,
    createSnapshot({
      formId: ctx.formId,
      formRevision: ctx.revision,
      currentStepId,
      values,
    }),
  );
};

export const clearDraft = (persistKey: string) => clearSnapshot(persistKey);

/** Passwords (and anything else a field marks secret) are never written to storage. */
export const withoutSecrets = (
  scheme: FormSchema,
  values: Record<string, unknown>,
  registry: FieldRegistry = defaultFieldRegistry,
) => {
  const secret = new Set(
    scheme.steps.flatMap((s) =>
      fieldsOf(s)
        .filter((f) => isSecretField(registry, f))
        .flatMap((f) =>
          Object.keys(definitionOf(registry, f).initialValues(f)),
        ),
    ),
  );
  return Object.fromEntries(
    Object.entries(values).filter(([k]) => !secret.has(k)),
  );
};
