import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
  describeRegistrations,
  type Registrations,
} from '../engine/registrations';
import {
  type CapabilitiesManifest,
  type CustomTypeSpec,
  checkSchema,
  compareSchemas,
  type SchemaIssue,
  type SchemaLimits,
  type SchemaPolicy,
} from '../schema';
import type { ArtisanSchemaV1 } from '../schema/contract/define';
import type { NativeFieldType } from '../schema/contract/fields';
import type { NativeStepType } from '../schema/contract/steps';
import { addCustomField } from './model/custom';
import {
  type BuilderState,
  canRedo,
  canUndo,
  commit,
  createBuilderState,
  redo,
  select,
  undo,
} from './model/history';
import * as ops from './model/operations';
import type { Change, DefaultsContext, Selection } from './model/types';

/** What the builder reports on every change: always a schema, and whether it is sound. */
export interface BuilderResult {
  schema: ArtisanSchemaV1;
  /** No error-level issue (warnings do not count). */
  ok: boolean;
  issues: SchemaIssue[];
}

export interface UseFormBuilderOptions {
  /** Controlled: the schema being edited. */
  value?: ArtisanSchemaV1;
  /** Uncontrolled: the schema to start from. */
  defaultValue?: ArtisanSchemaV1;
  onChange?: (result: BuilderResult) => void;
  /** What the front end can run; or `registrations` to derive it. */
  manifest?: CapabilitiesManifest;
  registrations?: Registrations;
  policy?: 'trusted' | SchemaPolicy;
  limits?: SchemaLimits;
  /** The published schema: edits are compared with it to warn about changes that break earlier answers. */
  baseline?: ArtisanSchemaV1;
}

type Run = (schema: ArtisanSchemaV1, selection: Selection) => Change;

type Action =
  | { type: 'op'; run: Run; key?: string; at: number }
  | { type: 'select'; selection: Selection }
  | { type: 'replace'; schema: ArtisanSchemaV1; selection?: Selection }
  | { type: 'undo' }
  | { type: 'redo' };

interface Store {
  builder: BuilderState;
  /** Why the last operation was refused, or what it removed. */
  error?: Change['error'];
  pruned: string[];
}

export const emptySchema = (): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'new-form',
  title: 'New form',
  steps: [{ id: 'form', type: 'form', title: 'Step 1', fields: [] }],
});

const reduce = (store: Store, action: Action): Store => {
  switch (action.type) {
    case 'op': {
      const change = action.run(store.builder.schema, store.builder.selection);
      const builder = commit(store.builder, change, {
        key: action.key,
        at: action.at,
      });
      return {
        builder,
        error: change.error,
        pruned: change.prunedReferences ?? [],
      };
    }
    case 'select':
      return { builder: select(store.builder, action.selection), pruned: [] };
    case 'replace':
      return {
        builder: commit(store.builder, {
          schema: action.schema,
          selection: action.selection ?? { kind: 'form' },
        }),
        pruned: [],
      };
    case 'undo':
      return { builder: undo(store.builder), pruned: [] };
    case 'redo':
      return { builder: redo(store.builder), pruned: [] };
  }
};

/** The first form step, or the first step: where a new input goes by default. */
const defaultStepId = (schema: ArtisanSchemaV1, selection: Selection) => {
  if (selection.kind !== 'form') return selection.stepId;
  return (schema.steps.find((s) => s.type === 'form') ?? schema.steps[0])?.id;
};

/**
 * The state and actions of a form builder, with no markup: the schema being
 * edited, what is selected, undo and redo, and the live result of `checkSchema`.
 * Controlled (`value` + `onChange`) or not (`defaultValue`).
 */
export const useFormBuilder = ({
  value,
  defaultValue,
  onChange,
  manifest: manifestProp,
  registrations,
  policy,
  limits,
  baseline,
}: UseFormBuilderOptions = {}) => {
  const [store, dispatch] = useReducer(reduce, undefined, () => ({
    builder: createBuilderState(value ?? defaultValue ?? emptySchema()),
    pruned: [],
  }));
  const schema = store.builder.schema;

  const manifest = useMemo(
    () =>
      manifestProp ??
      (registrations ? describeRegistrations(registrations) : undefined),
    [manifestProp, registrations],
  );
  const result = useMemo<BuilderResult>(() => {
    const checked = checkSchema(schema, { manifest, policy, limits });
    return { schema, ok: checked.ok, issues: checked.issues };
  }, [schema, manifest, policy, limits]);

  const comparison = useMemo(
    () => (baseline ? compareSchemas(baseline, schema) : undefined),
    [baseline, schema],
  );

  // Controlled: follow a new `value` that did not come from this builder.
  const emitted = useRef<ArtisanSchemaV1>(schema);
  useEffect(() => {
    if (value && value !== emitted.current && value !== schema)
      dispatch({ type: 'replace', schema: value });
  }, [value, schema]);

  // Report each change once (not the initial schema).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (schema === emitted.current) return;
    emitted.current = schema;
    onChangeRef.current?.(result);
  }, [schema, result]);

  const ctx = useMemo<DefaultsContext>(
    () => ({ refs: manifest?.refs }),
    [manifest],
  );
  const run = (fn: Run, key?: string) =>
    dispatch({ type: 'op', run: fn, key, at: Date.now() });

  const actions = {
    select: (selection: Selection) => dispatch({ type: 'select', selection }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    /** Replaces the whole schema (import, template); one undo step. */
    replaceSchema: (next: ArtisanSchemaV1) =>
      dispatch({ type: 'replace', schema: next }),
    addField: (
      type: NativeFieldType,
      at: { stepId?: string; index?: number; parent?: number[] } = {},
    ) =>
      run((s, sel) => {
        const stepId = at.stepId ?? defaultStepId(s, sel);
        return stepId
          ? ops.addField(s, stepId, type, {
              index: at.index,
              parent: at.parent,
              ctx,
            })
          : { schema: s, error: 'not-found' };
      }),
    addCustomField: (
      spec: Pick<CustomTypeSpec, 'type' | 'config' | 'description'>,
      at: { stepId?: string; index?: number } = {},
    ) =>
      run((s, sel) => {
        const stepId = at.stepId ?? defaultStepId(s, sel);
        return stepId
          ? addCustomField(s, stepId, spec, { index: at.index })
          : { schema: s, error: 'not-found' };
      }),
    addStep: (type: NativeStepType, index?: number) =>
      run((s) => ops.addStep(s, type, { index, ctx })),
    moveField: (
      from: { stepId: string; path: readonly number[] },
      to: { stepId: string; index: number; parent?: number[] },
    ) => run((s) => ops.moveField(s, from, to)),
    moveStep: (stepId: string, index: number) =>
      run((s) => ops.moveStep(s, stepId, index)),
    removeSelected: () =>
      run((s, sel) =>
        sel.kind === 'field'
          ? ops.removeField(s, sel.stepId, sel.path)
          : sel.kind === 'step'
            ? ops.removeStep(s, sel.stepId)
            : { schema: s, error: 'not-allowed' },
      ),
    duplicateSelected: () =>
      run((s, sel) =>
        sel.kind === 'field'
          ? ops.duplicateField(s, sel.stepId, sel.path)
          : sel.kind === 'step'
            ? ops.duplicateStep(s, sel.stepId)
            : { schema: s, error: 'not-allowed' },
      ),
    /** Edits a property of the selection; typing in one property merges into one undo step. */
    setProperty: (path: string, val: unknown, sel?: Selection) =>
      run(
        (s, current) => ops.setProperty(s, sel ?? current, path, val),
        `${JSON.stringify(sel ?? 'sel')}:${path}`,
      ),
    removeAt: (stepId: string, path: readonly number[]) =>
      run((s) => ops.removeField(s, stepId, path)),
    duplicateAt: (stepId: string, path: readonly number[]) =>
      run((s) => ops.duplicateField(s, stepId, path)),
    removeStepById: (stepId: string) => run((s) => ops.removeStep(s, stepId)),
    duplicateStepById: (stepId: string) =>
      run((s) => ops.duplicateStep(s, stepId)),
  };

  return {
    schema,
    selection: store.builder.selection,
    result,
    comparison,
    manifest,
    ctx,
    canUndo: canUndo(store.builder),
    canRedo: canRedo(store.builder),
    /** Why the last operation was refused. */
    error: store.error,
    /** Conditions the last removal dropped. */
    pruned: store.pruned,
    actions,
  };
};

export type FormBuilder = ReturnType<typeof useFormBuilder>;
