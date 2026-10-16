import { Form, Formik, type FormikValues, useFormikContext } from 'formik';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type ArtisanLabels, defaultLabels } from '../../commons/labels';
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
import { visibleFields, visibleSteps } from './conditions';
import { clearDraft, loadDraft, saveDraft, withoutSecrets } from './draft';
import {
  defaultFieldRegistry,
  definitionOf,
  type FieldRegistry,
} from './fields';
import Stepper from './Stepper';
import type { FormSchema } from './types';

interface ArtisanFormProps {
  scheme: FormSchema;
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
  registry: FieldRegistry;
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
  registry,
  labels,
  className,
  onChange,
  onStepChange,
  step: stepProp,
  persistKey,
}: WizardProps) => {
  const { values, validateForm, setTouched, touched, isSubmitting } =
    useFormikContext<FormikValues>();
  const step = useArtisanStore((s) => s.step);
  const setStep = useArtisanStore((s) => s.setStep);
  const setProcessStep = useArtisanStore((s) => s.setProcessStep);
  const setIsFinalStep = useArtisanStore((s) => s.setIsFinalStep);

  const steps = visibleSteps(scheme, values);
  const current = steps[step];
  const fields = current ? visibleFields(current, values) : [];
  const formRef = useRef<HTMLFormElement>(null);
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    setStep(stepProp ?? 0);
    setProcessStep(stepProp ?? 0);
  }, [scheme, stepProp]);

  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    onStepChange?.(step);
  }, [step]);

  useEffect(() => {
    setIsFinalStep(step === steps.length - 1);
  }, [step, steps.length]);

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

  // Validate only the current step's visible fields before moving forward.
  const handleNext = async () => {
    const names = fields.flatMap((f) => fieldNames(f, registry));
    const errors = await validateForm();
    await setTouched({
      ...touched,
      ...Object.fromEntries(names.map((n) => [n, true])),
    });
    if (names.some((n) => errors[n])) {
      setFocusTick((t) => t + 1);
      return;
    }
    setStep(step + 1);
    setProcessStep(step + 1);
  };

  return (
    <Form noValidate ref={formRef} className={className}>
      {onChange && <ValuesWatcher onChange={onChange} />}
      <Stepper steps={steps} current={step} labels={labels} />
      <h2 className="mb-4 text-lg font-semibold">{current.title}</h2>
      {fields.map((f) => (
        <div key={f.name} className="mb-4">
          {definitionOf(registry, f).groupLabel && (
            <span className="block text-sm font-medium text-gray-700">
              {f.label}
            </span>
          )}
          {definitionOf(registry, f).render(f, { labels })}
          {definitionOf(registry, f).groupLabel && f.helperText && (
            <p className="mt-1 text-sm text-gray-500">{f.helperText}</p>
          )}
        </div>
      ))}
      <Controls
        onNext={handleNext}
        isSubmitting={isSubmitting}
        labels={labels}
      />
    </Form>
  );
};

const ArtisanFormInner = ({
  scheme,
  onSubmit,
  initialValues: initialOverrides,
  labels: labelOverrides,
  fields,
  ...wizard
}: ArtisanFormProps) => {
  const { persistKey } = wizard;
  const registry = useMemo(
    () => ({ ...defaultFieldRegistry, ...fields }),
    [fields],
  );
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
      visibleSteps(scheme, values).flatMap((step) =>
        visibleFields(step, values).flatMap((f) => fieldNames(f, registry)),
      ),
    );
    await onSubmit(
      Object.fromEntries(Object.entries(values).filter(([k]) => shown.has(k))),
    );
    if (persistKey) clearDraft(persistKey);
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <Wizard
        scheme={scheme}
        registry={registry}
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
