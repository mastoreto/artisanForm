import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, type UseFormReturn } from 'react-hook-form';
import { labelsFromCatalogs } from '../../commons/i18n';
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
import type { ArtisanExtensions, OnUnresolved } from '../../engine/extensions';
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
import { type LoadMessages, useCatalogs } from '../../engine/useCatalogs';
import type { PluginsConfig } from '../../integrations/payments/types';
import {
  normalizeStorage,
  type StorageAdapter,
  type StorageMap,
} from '../../integrations/storage/types';
import type {
  ConflictDecision,
  DraftStorage,
  SnapshotConflict,
  SnapshotMigrations,
} from '../../persistence';
import { applyCatalog, type Catalog } from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { InferValues } from '../../schema/contract/infer';
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

/** The submitted values: inferred from a literal v1 schema, a plain record otherwise. */
export type ValuesOf<S> = S extends ArtisanSchemaV1
  ? InferValues<S>
  : FormValues;

export interface ArtisanWizardOptions<
  S extends FormSchema | ArtisanSchemaV1 = ArtisanSchemaV1,
> {
  /**
   * The form definition: an `ArtisanSchemaV1` (JSON-serializable, see
   * `defineForm`) or a 0.2.0 `FormSchema` (adapted internally).
   */
  schema: S;
  /** Local functions and components a v1 schema refers to by id. */
  extensions?: ArtisanExtensions;
  /** What to do with a name the schema uses that `extensions` and the plugins do not provide (default: fail). */
  onUnresolved?: OnUnresolved;
  /** Return a promise to keep the last step's action disabled until it settles. */
  onSubmit: (values: ValuesOf<S>) => unknown;
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
  /** Drives the wizard to the step with this id (index-free; pair with `onStepIdChange`). Wins over `step`. */
  stepId?: string;
  /** Called with the new step id whenever the wizard moves. */
  onStepIdChange?: (stepId: string) => void;
  /** Language of the texts (`es`, `es-AR`): the catalogs for it are applied over the schema's source texts. */
  locale?: string;
  /** Catalogs by locale, same format as the schema's `i18n.messages`. They win over `loadMessages` and the schema. */
  messages?: Record<string, Catalog>;
  /** Fetches the catalog of a locale on demand (e.g. `(l) => import(`./${l}.json`)`). The source text shows until it arrives. */
  loadMessages?: LoadMessages;
  /** Texts a UI kit supplies: above the defaults, below the catalogs' `labels.*` entries and `labels`. */
  kitLabels?: Partial<ArtisanLabels>;
  /** Overrides any text or validation message (default: English). Wins over everything else. */
  labels?: Partial<ArtisanLabels>;
  /** Saves values and step to localStorage under this key and restores them on mount. */
  persistKey?: string;
  /** Where the draft lives (default `localStorage`): `sessionStorage` or your own synchronous store. */
  draftStorage?: DraftStorage;
  /** Wait this long after the last change before writing the draft (default 0: write at once). The draft is also written when the step changes or the form unmounts. */
  draftDebounceMs?: number;
  /** Brings a draft saved against an older `revision` of the schema up to the current one (see `migrateSnapshot`). */
  snapshotMigrations?: SnapshotMigrations;
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
  /** Index among `steps`. Refused when a finished `revisit: 'deny'` step is in the way. */
  goTo: (index: number) => void;
  /** Moves to the visible step with this id, without validating. `false` if there is none (unknown or hidden). */
  goToStep: (id: string) => boolean;
  submit: () => Promise<void>;
  /** No way back from here (first step, or a finished `revisit: 'deny'` step is behind). */
  isFirst: boolean;
  canGoBack: boolean;
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
export const useArtisanWizard = <
  S extends FormSchema | ArtisanSchemaV1 = ArtisanSchemaV1,
>({
  schema: input,
  extensions,
  onUnresolved,
  onSubmit,
  initialValues: initialOverrides,
  labels: labelOverrides,
  kitLabels,
  locale,
  messages,
  loadMessages,
  fields,
  stepTypes,
  storage,
  plugins,
  onSnapshotConflict,
  persistKey,
  draftStorage,
  draftDebounceMs,
  snapshotMigrations,
  step: stepProp,
  stepId,
  onStepIdChange,
  onStepChange,
  onChange,
}: ArtisanWizardOptions<S>): ArtisanWizard => {
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
  const normalized = useMemo(
    () =>
      normalizeArtisanSchema(input, {
        id: persistKey ? `legacy:${persistKey}` : undefined,
      }),
    [input, persistKey],
  );
  const catalogs = useCatalogs(
    locale,
    messages,
    loadMessages,
    normalized.schema.i18n,
  );
  // The content key comes from the untranslated schema: changing language
  // must not look like a new form and reset what the user typed.
  const projection = useMemo(
    () =>
      projectToRuntime(
        catalogs.length
          ? { ...normalized, schema: applyCatalog(normalized.schema, catalogs) }
          : normalized,
        extensions,
        {
          fieldTypes: Object.keys(registry),
          stepKinds: Object.keys(stepRegistry),
        },
        onUnresolved,
        JSON.stringify(normalized.schema),
      ),
    [normalized, catalogs, extensions, onUnresolved, registry, stepRegistry],
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
          storage: draftStorage,
          migrations: snapshotMigrations,
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
  // defaults < kit < catalogs (`labels.*`) < the `labels` prop
  const labels = useMemo(
    () => ({
      ...defaultLabels,
      ...kitLabels,
      ...labelsFromCatalogs(catalogs, locale ?? 'en'),
      ...labelOverrides,
    }),
    [kitLabels, catalogs, locale, labelOverrides],
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
        ) as ValuesOf<S>,
      );
    } catch (e) {
      setSubmitState(
        'error',
        e instanceof Error ? e.message : labels.submitError,
      );
      return;
    }
    if (persistKey) clearDraft(persistKey, draftStorage);
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

  // An id wins over an index; resolved against what is visible with the initial values.
  const stepFromId =
    stepId === undefined
      ? undefined
      : visibleSteps(scheme, initialValues).findIndex((s) => s.id === stepId);
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
    initialHistory: draft?.history,
    draftStorage,
    draftDebounceMs,
    onSubmitValues: submitValues,
    step:
      (stepFromId !== undefined && stepFromId >= 0 ? stepFromId : undefined) ??
      stepProp ??
      (draft ? Math.min(draft.stepIndex, scheme.steps.length - 1) : undefined),
  });

  const activeId = inner?.steps[inner.step]?.id;
  const firstId = useRef(true);
  useEffect(() => {
    if (firstId.current) {
      firstId.current = false;
      return;
    }
    if (activeId !== undefined) onStepIdChange?.(activeId);
  }, [activeId]);

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
      goToStep: () => false,
      submit: async () => {},
      isFirst: true,
      canGoBack: false,
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
      // With transitions, "done" is what was actually visited, not what comes first.
      state:
        i === step
          ? 'current'
          : (inner.flow ? inner.history.includes(s.id ?? '') : i < step)
            ? 'done'
            : 'upcoming',
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
    goTo: (index) => {
      inner.jumpTo(index);
    },
    goToStep: (id) => {
      const index = inner.steps.findIndex((s) => s.id === id);
      return index < 0 ? false : inner.jumpTo(index);
    },
    submit: context.submit,
    isFirst: !inner.canGoBack,
    canGoBack: inner.canGoBack,
    isLast: step >= inner.finalIndex,
    submitState: inner.submitState,
    submitError: inner.submitError,
    stepError: inner.stepError,
    renderStep: () => definition.render(context),
    controls: { ...definition.controls, ...current.controls },
    bindForm: inner.bindForm,
  };
};
