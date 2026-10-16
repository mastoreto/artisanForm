import {
  Form,
  Formik,
  type FormikValues,
  setNestedObjectValues,
  useFormikContext,
} from 'formik';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type ArtisanLabels, defaultLabels } from '../../commons/labels';
import type { PluginsConfig } from '../../payments/types';
import type { ArtisanSchemaV1 } from '../../schema/define';
import { normalizeArtisanSchema } from '../../schema/normalize';
import {
  normalizeStorage,
  type StorageAdapter,
  type StorageMap,
} from '../../storage/types';
import {
  ArtisanStoreProvider,
  useArtisanStore,
} from '../../stores/useArtisanStore';
import Controls from '../ArtisanControls/Controls';
import {
  buildInitialValues,
  buildValidationSchema,
  fieldNames,
} from './buildSchema';
import { storedName, visibleFields, visibleSteps } from './conditions';
import { clearDraft, loadDraft, saveDraft, withoutSecrets } from './draft';
import type { ArtisanExtensions } from './extensions';
import { defaultFieldRegistry, type FieldRegistry } from './fields';
import { projectToRuntime } from './project';
import Stepper from './Stepper';
import {
  defaultStepRegistry,
  type StepContext,
  type StepRegistry,
  stepDefinitionOf,
} from './steps';
import type { BeforeNextResult, FormSchema } from './types';

interface ArtisanFormProps {
  /**
   * The form definition: an `ArtisanSchemaV1` (JSON-serializable, see
   * `defineForm`) or a 0.2.0 `FormSchema` (adapted internally).
   */
  scheme: FormSchema | ArtisanSchemaV1;
  /** Local functions and components a v1 schema refers to by id. */
  extensions?: ArtisanExtensions;
  /** Return a promise to keep "Finalizar" disabled until it settles. */
  onSubmit: (values: FormikValues) => unknown;
  /** Overrides the scheme defaults for the given field names. */
  initialValues?: FormikValues;
  /** Called with the new step index whenever the wizard moves. */
  onStepChange?: (step: number) => void;
  /** Called with all values on every change. */
  onChange?: (values: FormikValues) => void;
  /** Drives the wizard to this step when it changes (pair with onStepChange). */
  step?: number;
  /** Overrides any UI text or validation message (default: Spanish). */
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
}

const ValuesWatcher = ({
  onChange,
}: {
  onChange: (values: FormikValues) => void;
}) => {
  const { values } = useFormikContext<FormikValues>();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChange(values);
  }, [values]);
  return null;
};

interface WizardProps {
  scheme: FormSchema;
  /** Changes only when the schema's content changes. */
  schemeKey: string;
  pluginsMap: StepContext['plugins'];
  storageMap: StorageMap;
  registry: FieldRegistry;
  stepRegistry: StepRegistry;
  labels: ArtisanLabels;
  className?: string;
  onChange?: (values: FormikValues) => void;
  onStepChange?: (step: number) => void;
  step?: number;
  persistKey?: string;
}

/** Renders the current step; lives inside <Formik> to read live values. */
const Wizard = ({
  scheme,
  schemeKey,
  pluginsMap,
  storageMap,
  registry,
  stepRegistry,
  labels,
  className,
  onChange,
  onStepChange,
  step: stepProp,
  persistKey,
}: WizardProps) => {
  const {
    values,
    validateForm,
    setTouched,
    touched,
    isSubmitting,
    submitForm,
    setFieldValue,
  } = useFormikContext<FormikValues>();
  const step = useArtisanStore((s) => s.step);
  const setStep = useArtisanStore((s) => s.setStep);
  const setProcessStep = useArtisanStore((s) => s.setProcessStep);
  const setIsFinalStep = useArtisanStore((s) => s.setIsFinalStep);
  const submitState = useArtisanStore((s) => s.submitState);
  const submitError = useArtisanStore((s) => s.submitError);

  const steps = visibleSteps(scheme, values);
  const current = steps[step];
  const fields = current ? visibleFields(current, values) : [];
  // `result` steps come after the submit; the last other step submits.
  const finalIndex = steps.reduce(
    (last, s, i) => (s.kind === 'result' ? last : i),
    steps.length - 1,
  );
  const resultIndex = steps.findIndex((s) => s.kind === 'result');
  const formRef = useRef<HTMLFormElement>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  const goTo = (index: number) => {
    setStepError(null);
    setStep(index);
    setProcessStep(index);
  };

  useEffect(() => {
    setStep(stepProp ?? 0);
    setProcessStep(stepProp ?? 0);
  }, [schemeKey, stepProp]);

  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    onStepChange?.(step);
  }, [step]);

  useEffect(() => {
    setIsFinalStep(step === finalIndex);
  }, [step, finalIndex]);

  useEffect(() => {
    current?.onEnter?.(values);
  }, [step, current?.title]);

  // After a successful submit, show the result step if there is one.
  useEffect(() => {
    if (
      (submitState === 'success' || submitState === 'error') &&
      resultIndex >= 0
    )
      goTo(resultIndex);
  }, [submitState]);

  useEffect(() => {
    if (persistKey)
      saveDraft(persistKey, {
        values: withoutSecrets(scheme, values, registry),
        step,
      });
  }, [values, step]);

  // After a blocked "Siguiente", move focus to the first invalid field.
  useEffect(() => {
    if (focusTick === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [focusTick]);

  if (!current) return null;

  const definition = stepDefinitionOf(stepRegistry, current);

  // Validate the step's visible fields, run `beforeNext`, then advance (or
  // submit when this is the last step).
  const next = async () => {
    const names = fields.flatMap((f) => fieldNames(f, registry));
    if (names.length > 0) {
      const errors = await validateForm();
      await setTouched({
        ...touched,
        // Nested values (array rows) need a nested `touched` to show their errors.
        ...Object.fromEntries(
          names.map((n) => [
            n,
            typeof values[n] === 'object' && values[n] !== null
              ? setNestedObjectValues(values[n], true)
              : true,
          ]),
        ),
      });
      if (names.some((n) => errors[n])) {
        setFocusTick((t) => t + 1);
        return;
      }
    }
    if (current.beforeNext) {
      let outcome: BeforeNextResult;
      try {
        outcome = await current.beforeNext(values);
      } catch (e) {
        outcome = { error: e instanceof Error ? e.message : String(e) };
      }
      if (outcome?.error) {
        setStepError(outcome.error);
        return;
      }
    }
    setStepError(null);
    if (step >= finalIndex) {
      await submitForm();
      return;
    }
    goTo(step + 1);
  };

  const controls = { ...definition.controls, ...current.controls };
  const context: StepContext = {
    step: current,
    index: step,
    total: steps.length,
    steps,
    values,
    setFieldValue: (name, value) => {
      setFieldValue(name, value);
    },
    labels,
    fieldRegistry: registry,
    storage: storageMap,
    plugins: pluginsMap,
    fields,
    next,
    back: () => goTo(Math.max(0, step - 1)),
    goTo,
    submit: submitForm,
    submitState,
    submitError,
    error: stepError,
  };

  return (
    <Form
      noValidate
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        void next();
      }}
    >
      {onChange && <ValuesWatcher onChange={onChange} />}
      <Stepper steps={steps} current={step} labels={labels} />
      <h2 className="mb-4 text-lg font-semibold">{current.title}</h2>
      {definition.render(context)}
      {(stepError || (submitError && current.kind !== 'result')) && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {stepError ?? submitError}
        </p>
      )}
      {!controls.hidden && (
        <Controls
          onNext={next}
          onPrevious={() => goTo(Math.max(0, step - 1))}
          hidePrevious={controls.hidePrevious}
          hideNext={controls.hideNext}
          nextDisabled={controls.nextDisabled}
          isSubmitting={isSubmitting}
          labels={{
            ...labels,
            ...(controls.nextLabel && {
              next: controls.nextLabel,
              submit: controls.nextLabel,
            }),
            ...(controls.previousLabel && { previous: controls.previousLabel }),
          }}
        />
      )}
    </Form>
  );
};

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
  ...wizard
}: ArtisanFormProps) => {
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
    () => ({ ...defaultFieldRegistry, ...fields }),
    [fields],
  );
  const stepRegistry = useMemo(
    () => ({ ...defaultStepRegistry, ...stepTypes }),
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
    () => (persistKey ? loadDraft(persistKey) : null),
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
  const handleSubmit = async (values: FormikValues) => {
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

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <Wizard
        scheme={scheme}
        schemeKey={projection.key}
        pluginsMap={pluginsMap}
        storageMap={storageMap}
        registry={registry}
        stepRegistry={stepRegistry}
        labels={labels}
        {...wizard}
        step={
          wizard.step ??
          (draft ? Math.min(draft.step, scheme.steps.length - 1) : undefined)
        }
      />
    </Formik>
  );
};

const ArtisanForm = (props: ArtisanFormProps) => (
  <ArtisanStoreProvider>
    <ArtisanFormInner {...props} />
  </ArtisanStoreProvider>
);

export default ArtisanForm;
