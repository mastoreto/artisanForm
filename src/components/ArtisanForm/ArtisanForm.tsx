import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
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
import { useArtisanForm } from '../../engine/form/useArtisanForm';
import { FormUiContext } from '../../engine/form/validators';
import { projectToRuntime } from '../../engine/project';
import {
  ArtisanStoreProvider,
  useArtisanStore,
} from '../../engine/store/useArtisanStore';
import type { PluginsConfig } from '../../integrations/payments/types';
import {
  normalizeStorage,
  type StorageAdapter,
  type StorageMap,
} from '../../integrations/storage/types';
import type { ConflictDecision, SnapshotConflict } from '../../persistence';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { FormSchema } from '../../schema/legacy/types';
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
import type { ArtisanComponents } from '../ui/types';
import { type ArtisanClassNames, UiContext } from '../ui/UiContext';
import { Wizard } from './Wizard';

interface ArtisanFormProps {
  /**
   * The form definition: an `ArtisanSchemaV1` (JSON-serializable, see
   * `defineForm`) or a 0.2.0 `FormSchema` (adapted internally).
   */
  scheme: FormSchema | ArtisanSchemaV1;
  /** Local functions and components a v1 schema refers to by id. */
  extensions?: ArtisanExtensions;
  /** Return a promise to keep "Finish" disabled until it settles. */
  onSubmit: (values: FormValues) => unknown;
  /** What to do with a saved draft that does not fit this form (default: `backup`). */
  onSnapshotConflict?: (conflict: SnapshotConflict) => ConflictDecision;
  /** Overrides the scheme defaults for the given field names. */
  initialValues?: FormValues;
  /** Called with the new step index whenever the wizard moves. */
  onStepChange?: (step: number) => void;
  /** Called with all values on every change. */
  onChange?: (values: FormValues) => void;
  /** Drives the wizard to this step when it changes (pair with onStepChange). */
  step?: number;
  /** Overrides any UI text or validation message (default: English). */
  labels?: Partial<ArtisanLabels>;
  /** Extra classes for the <form> element. */
  className?: string;
  /** Saves values and step to localStorage under this key and restores them on mount. Passwords are never saved; the draft is cleared on submit. */
  persistKey?: string;
  /** Custom field types, merged over the built-in ones (see `defaultFieldRegistry`). */
  fields?: FieldRegistry;
  /** Custom step kinds, merged over the built-in ones (see `defaultStepRegistry`). */
  stepTypes?: StepRegistry;
  /** Where file fields upload: one adapter, or a map keyed by the field's `storage`. */
  storage?: StorageAdapter | StorageMap;
  /** Payment plugins (Stripe, Mercado Pago…, or your own) and the redirect function. */
  plugins?: PluginsConfig;
  /** Replace parts of the default UI (inputs by type, Stepper, Controls…). See `ArtisanComponents`. */
  components?: ArtisanComponents;
  /** Extra classes per part of the default UI, added to the `af-*` ones. */
  classNames?: ArtisanClassNames;
  /** Do not emit the `af-*` classes: bring your own styles. */
  unstyled?: boolean;
}

const ArtisanFormInner = ({
  scheme: input,
  extensions,
  onSubmit,
  initialValues: initialOverrides,
  labels: labelOverrides,
  fields,
  stepTypes,
  storage,
  plugins,
  onSnapshotConflict,
  components,
  classNames,
  unstyled,
  ...wizard
}: ArtisanFormProps) => {
  const uiConfig = useMemo(
    () => ({ components, classNames, unstyled }),
    [components, classNames, unstyled],
  );
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
  const { persistKey } = wizard;
  const setSubmitState = useArtisanStore((s) => s.setSubmitState);
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
  const draft = useMemo(
    () =>
      persistKey
        ? restoreDraft({
            persistKey,
            formId: projection.formId,
            revision: projection.revision,
            scheme,
            onConflict: onSnapshotConflict,
          })
        : null,
    [persistKey],
  );
  const initialValues = useMemo(
    () => ({
      ...buildInitialValues(scheme, registry),
      ...initialOverrides,
      ...draft?.values,
    }),
    [scheme, draft, registry],
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

  const { methods, validators } = useArtisanForm(
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

  return (
    <FormProvider {...methods}>
      <UiContext.Provider value={uiConfig}>
        <FormUiContext.Provider value={ui}>
          <Wizard
            onSubmitValues={submitValues}
            scheme={scheme}
            schemeKey={projection.key}
            ui={projection.ui}
            snapshotMeta={{
              formId: projection.formId,
              revision: projection.revision,
            }}
            pluginsMap={pluginsMap}
            storageMap={storageMap}
            registry={registry}
            stepRegistry={stepRegistry}
            labels={labels}
            {...wizard}
            step={
              wizard.step ??
              (draft
                ? Math.min(draft.stepIndex, scheme.steps.length - 1)
                : undefined)
            }
          />
        </FormUiContext.Provider>
      </UiContext.Provider>
    </FormProvider>
  );
};

const ArtisanForm = (props: ArtisanFormProps) => (
  <ArtisanStoreProvider>
    <ArtisanFormInner {...props} />
  </ArtisanStoreProvider>
);

export default ArtisanForm;
