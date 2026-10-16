import {
  Form,
  type FormikValues,
  setNestedObjectValues,
  useFormikContext,
} from 'formik';
import { useEffect, useRef, useState } from 'react';
import type { ArtisanLabels } from '../../commons/labels';
import { fieldNames } from '../../engine/buildSchema';
import { visibleFields, visibleSteps } from '../../engine/conditions';
import { saveDraft, withoutSecrets } from '../../engine/draft';
import { useArtisanStore } from '../../engine/store/useArtisanStore';
import type { StorageMap } from '../../integrations/storage/types';
import type { BeforeNextResult, FormSchema } from '../../schema/legacy/types';
import Controls from '../Controls/Controls';
import type { FieldRegistry } from '../fields/registry';
import {
  type StepContext,
  type StepRegistry,
  stepDefinitionOf,
} from '../steps/registry';
import Stepper from './Stepper';

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

export interface WizardProps {
  scheme: FormSchema;
  snapshotMeta: { formId: string; revision?: number };
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
export const Wizard = ({
  scheme,
  snapshotMeta,
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
      saveDraft(
        { persistKey, ...snapshotMeta },
        steps[step]?.id,
        withoutSecrets(scheme, values, registry),
      );
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
