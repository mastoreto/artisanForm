import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, type UseFormReturn } from 'react-hook-form';
import { type ArtisanLabels, defaultLabels } from '../../commons/labels';
import {
  buildInitialValues,
  buildValidationSchema,
  fieldNames,
} from '../../engine/buildSchema';
import {
  storedName,
  visibleFields,
  visibleSteps,
} from '../../engine/conditions';
import { clearDraft, restoreDraft } from '../../engine/draft';
import type { ArtisanExtensions } from '../../engine/extensions';
import type { FormValues } from '../../engine/form/types';
import { useFormBinding } from '../../engine/form/useFormBinding';
import { type FormUi, FormUiContext } from '../../engine/form/validators';
import { projectToRuntime } from '../../engine/project';
import {
  type ArtisanStore,
  ArtisanStoreContext,
  createArtisanStore,
  type SubmitState,
} from '../../engine/store/useArtisanStore';
import type { PluginsConfig } from '../../integrations/payments/types';
import {
  normalizeStorage,
  type StorageAdapter,
  type StorageMap,
} from '../../integrations/storage/types';
import type { ConflictDecision, SnapshotConflict } from '../../persistence';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { FormUIConfig } from '../../schema/contract/types';
import type {
  FieldSchema,
  FormSchema,
  StepControls,
} from '../../schema/legacy/types';
import { normalizeArtisanSchema } from '../../schema/normalize';
import {
  assertFieldRegistry,
  defaultFieldRegistry,
  type FieldRegistry,
} from '../fields/registry';
import {
  assertStepRegistry,
  defaultStepRegistry,
  type StepRegistry,
} from '../steps/registry';
import { useWizard } from './useWizard';

export interface ArtisanWizardOptions {
  /**
   * The form definition: an `ArtisanSchemaV1` (JSON-serializable, see
   * `defineForm`) or a 0.2.0 `FormSchema` (adapted internally).
   */
  schema: FormSchema | ArtisanSchemaV1;
  /** Local functions and components a v1 schema refers to by id. */
  extensions?: ArtisanExtensions;
  /** Return a promise to keep the last step's action disabled until it settles. */
  onSubmit: (values: FormValues) => unknown;
  /** What to do with a saved draft that does not fit this form (default: `backup`). */
  onSnapshotConflict?: (conflict: SnapshotConflict) => ConflictDecision;
  /** Overrides the schema defaults for the given field names. */
  initialValues?: FormValues;
  /** Called with the new step index whenever the wizard moves. */
  onStepChange?: (step: number) => void;
  /** Called with all values on every change. */
  onChange?: (values: FormValues) => void;
  /** Drives the wizard to this step index when it changes (pair with onStepChange). */
  step?: number;
  /** Overrides any text or validation message (default: English). */
  labels?: Partial<ArtisanLabels>;
  /** Saves values and step to localStorage under this key and restores them on mount. */
  persistKey?: string;
  /** Custom field types, merged over the built-in ones. */
  fields?: FieldRegistry;
  /** Custom step kinds, merged over the built-in ones. */
  stepTypes?: StepRegistry;
  /** Where file fields upload. */
  storage?: StorageAdapter | StorageMap;
  /** Payment plugins and the redirect function. */
  plugins?: PluginsConfig;
}

export interface ArtisanWizardStep {
  id: string;
  title: string;
  kind: string;
  state: 'done' | 'current' | 'upcoming';
}

export interface ArtisanWizardCurrent {
  id: string;
  index: number;
  kind: string;
  title: string;
  /** The fields the user currently sees (conditions applied). */
  fields: FieldSchema[];
}

/**
 * The wizard without any markup: what `ArtisanForm` renders from. Returned by
 * `useArtisanWizard`. Render your own UI from it; wrap whatever contains
 * inputs in `<ArtisanWizardProvider wizard={wizard}>` so `useArtisanField`
 * and the step renderers can find the form.
 */
export interface ArtisanWizard {
  /** The React Hook Form instance (stable, documented escape hatch). */
  form: UseFormReturn<FormValues>;
  /** The steps the user can currently reach (conditions applied). */
  steps: ArtisanWizardStep[];
  /** Index of the current step among `steps`. */
  step: number;
  /** `null` while the schema has no visible step. */
  current: ArtisanWizardCurrent | null;
  /** Validates the step, runs `beforeNext`, then moves on (or submits on the last step). */
  next: () => Promise<void>;
  back: () => void;
  /** Index among `steps`. */
  goTo: (index: number) => void;
  submit: () => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
  submitState: SubmitState;
  submitError: string | null;
  /** Error from the step's `beforeNext`, if any. */
  stepError: string | null;
  labels: ArtisanLabels;
  ui: FormUIConfig;
  /** Renders the current step with the registered step type (used by `ArtisanForm`). */
  renderStep: () => ReactNode;
  /** The step type's default controls merged with the step's own. */
  controls: StepControls;
  /** Attach to your `<form>` (`ref={wizard.bindForm}`) so focus can move to the first invalid field. */
  bindForm: (element: HTMLFormElement | null) => void;
  /** @internal contexts for `ArtisanWizardProvider`. */
  _provider: {
    form: UseFormReturn<FormValues>;
    store: ArtisanStore;
    ui: FormUi;
  };
}

/** Gives the inputs and step renderers below it access to the wizard's form and step state. */
export const ArtisanWizardProvider = ({
  wizard,
  children,
}: {
  wizard: Pick<ArtisanWizard, '_provider'>;
  children?: ReactNode;
}) => {
  const { form, store, ui } = wizard._provider;
  return (
    <ArtisanStoreContext.Provider value={store}>
      <FormProvider {...form}>
        <FormUiContext.Provider value={ui}>{children}</FormUiContext.Provider>
      </FormProvider>
    </ArtisanStoreContext.Provider>
  );
};

/**
 * Headless wizard: values, validation, conditions, navigation, drafts, payments
 * and waiting, with no markup. React Hook Form holds the values (`wizard.form`),
 * a Zustand store the step state, Yup the rules. Call it once per form.
 */
export const useArtisanWizard = ({
  schema: input,
  extensions,
  onSubmit,
  initialValues: initialOverrides,
  labels: labelOverrides,
  fields,
  stepTypes,
  storage,
  plugins,
  onSnapshotConflict,
  persistKey,
  step: stepProp,
  onStepChange,
  onChange,
}: ArtisanWizardOptions): ArtisanWizard => {
  const [store] = useState(createArtisanStore);
  const { setSubmitState } = store.getState();
  const pluginsMap = useMemo(
    () => ({
      payments: Object.fromEntries(
        (plugins?.payments ?? []).map((p) => [p.id, p]),
      ),
      navigate:
        plugins?.navigate ?? ((url: string) => window.location.assign(url)),
    }),
    [plugins],
  );
  const storageMap = useMemo(() => normalizeStorage(storage), [storage]);
  const registry = useMemo(
    () => assertFieldRegistry({ ...defaultFieldRegistry, ...fields }),
    [fields],
  );
  const stepRegistry = useMemo(
    () => assertStepRegistry({ ...defaultStepRegistry, ...stepTypes }),
    [stepTypes],
  );
  // One internal representation: normalize (v1 or 0.2.0) → project to the
  // shape the engine runs. Memoized; `key` only changes with the content.
  const projection = useMemo(
    () =>
      projectToRuntime(
        normalizeArtisanSchema(input, {
          id: persistKey ? `legacy:${persistKey}` : undefined,
        }),
        extensions,
        {
          fieldTypes: Object.keys(registry),
          stepKinds: Object.keys(stepRegistry),
        },
      ),
    [input, extensions, registry, stepRegistry, persistKey],
  );
  const scheme = projection.scheme;
  // Read once on mount; the draft wins over defaults and `initialValues`.
  const [draft] = useState(() =>
    persistKey
      ? restoreDraft({
          persistKey,
          formId: projection.formId,
          revision: projection.revision,
          scheme,
          onConflict: onSnapshotConflict,
        })
      : null,
  );
  const initialValues = useMemo(
    () => ({
      ...buildInitialValues(scheme, registry),
      ...initialOverrides,
      ...draft?.values,
    }),
    [scheme, draft, registry, initialOverrides],
  );
  const labels = useMemo(
    () => ({ ...defaultLabels, ...labelOverrides }),
    [labelOverrides],
  );
  const validationSchema = useMemo(
    () => buildValidationSchema(scheme, labels, registry),
    [scheme, labels, registry],
  );

  // Hidden steps/fields are not part of the submitted values.
  const submitValues = async (values: FormValues) => {
    const shown = new Set(
      visibleSteps(scheme, values).flatMap((step) => [
        ...visibleFields(step, values).flatMap((f) => fieldNames(f, registry)),
        // Values a step stores for itself (e.g. a pending step's `resultName`).
        ...(storedName(step) ? [storedName(step) as string] : []),
      ]),
    );
    setSubmitState('submitting');
    try {
      await onSubmit(
        Object.fromEntries(
          Object.entries(values).filter(([k]) => shown.has(k)),
        ),
      );
    } catch (e) {
      setSubmitState(
        'error',
        e instanceof Error ? e.message : labels.submitError,
      );
      return;
    }
    if (persistKey) clearDraft(persistKey);
    setSubmitState('success');
  };

  const { methods, validators } = useFormBinding(
    initialValues,
    validationSchema,
  );
  // A different schema content (or revision) starts from its own defaults;
  // an ordinary rerender never resets what the user typed.
  const [attempted, setAttempted] = useState(false);
  const ui = useMemo(
    () => ({ validators, attempted, setAttempted }),
    [validators, attempted],
  );
  const lastKey = useRef(projection.key);
  useEffect(() => {
    if (lastKey.current === projection.key) return;
    lastKey.current = projection.key;
    methods.reset(initialValues);
  }, [projection.key]);

  const inner = useWizard({
    methods,
    store,
    uiState: ui,
    scheme,
    schemeKey: projection.key,
    ui: projection.ui,
    snapshotMeta: { formId: projection.formId, revision: projection.revision },
    pluginsMap,
    storageMap,
    registry,
    stepRegistry,
    labels,
    onChange,
    onStepChange,
    persistKey,
    onSubmitValues: submitValues,
    step:
      stepProp ??
      (draft ? Math.min(draft.stepIndex, scheme.steps.length - 1) : undefined),
  });

  const common = {
    form: methods,
    labels,
    ui: projection.ui,
    _provider: { form: methods, store, ui },
  };
  if (!inner)
    return {
      ...common,
      steps: [],
      step: 0,
      current: null,
      next: async () => {},
      back: () => {},
      goTo: () => {},
      submit: async () => {},
      isFirst: true,
      isLast: true,
      submitState: 'idle',
      submitError: null,
      stepError: null,
      renderStep: () => null,
      controls: {},
      bindForm: () => {},
    };

  const { steps, step, current, definition, context } = inner;
  return {
    ...common,
    steps: steps.map((s, i) => ({
      id: s.id ?? String(i),
      title: s.title,
      kind: s.kind ?? 'form',
      state: i < step ? 'done' : i === step ? 'current' : 'upcoming',
    })),
    step,
    current: {
      id: current.id ?? String(step),
      index: step,
      kind: current.kind ?? 'form',
      title: current.title,
      fields: context.fields,
    },
    next: inner.next,
    back: context.back,
    goTo: inner.goTo,
    submit: context.submit,
    isFirst: step <= 0,
    isLast: step >= inner.finalIndex,
    submitState: inner.submitState,
    submitError: inner.submitError,
    stepError: inner.stepError,
    renderStep: () => definition.render(context),
    controls: { ...definition.controls, ...current.controls },
    bindForm: inner.bindForm,
  };
};
