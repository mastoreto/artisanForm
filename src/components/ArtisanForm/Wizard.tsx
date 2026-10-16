import {
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ArtisanLabels } from '../../commons/labels';
import { fieldNames } from '../../engine/buildSchema';
import {
  conditionNames,
  visibleFields,
  visibleSteps,
} from '../../engine/conditions';
import { saveDraft, withoutSecrets } from '../../engine/draft';
import type { FormValues } from '../../engine/form/types';
import { FormUiContext } from '../../engine/form/validators';
import { resolveStep } from '../../engine/navigation';
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
  onChange?: (values: FormValues) => void;
  /** Runs once the last step is valid (receives every value; the caller filters). */
  onSubmitValues: (values: FormValues) => Promise<void>;
  onStepChange?: (step: number) => void;
  step?: number;
  persistKey?: string;
}

/** Renders the current step; lives inside the form provider to read live values. */
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
  onSubmitValues,
  onStepChange,
  step: stepProp,
  persistKey,
}: WizardProps) => {
  const { control, trigger, setValue, handleSubmit, watch, getValues } =
    useFormContext<FormValues>();
  // Re-render only when a value a condition reads changes; typing in any
  // other field re-renders just that field.
  const watchedNames = useMemo(() => conditionNames(scheme), [scheme]);
  const watched = useWatch({ control, name: watchedNames }) as unknown[];
  const visibility = Object.fromEntries(
    watchedNames.map((n, i) => [n, watched[i]]),
  );
  const ui = useContext(FormUiContext);
  const submitForm = () => handleSubmit(onSubmitValues)();

  useEffect(() => {
    if (!onChange) return;
    const subscription = watch((all) => onChange(all as FormValues));
    return () => subscription.unsubscribe();
  }, [watch, onChange]);
  const step = useArtisanStore((s) => s.step);
  const setStep = useArtisanStore((s) => s.setStep);
  const setProcessStep = useArtisanStore((s) => s.setProcessStep);
  const setIsFinalStep = useArtisanStore((s) => s.setIsFinalStep);
  const submitState = useArtisanStore((s) => s.submitState);
  const submitError = useArtisanStore((s) => s.submitError);

  const steps = visibleSteps(scheme, visibility);
  const current = steps[step];
  const fields = current ? visibleFields(current, visibility) : [];
  // Steps that show values (review, custom, payment…) follow every change;
  // plain form steps only need a snapshot.
  const live = !!current && (current.kind ?? 'form') !== 'form';
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!live) return;
    // Children's effects run first: catch up with anything they already set.
    refresh();
    const subscription = watch(() => refresh());
    return () => subscription.unsubscribe();
  }, [live, watch]);
  const values = getValues();
  // `result` steps come after the submit; the last other step submits.
  const finalIndex = steps.reduce(
    (last, s, i) => (s.kind === 'result' ? last : i),
    steps.length - 1,
  );
  const resultIndex = steps.findIndex((s) => s.kind === 'result');
  const formRef = useRef<HTMLFormElement>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  // Bumped on every navigation: an async `beforeNext` that resolves after
  // the user already moved must not move them again.
  const navigation = useRef(0);
  const busy = useRef(false);
  const goTo = (index: number) => {
    navigation.current += 1;
    ui?.setAttempted(false);
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

  // A step that stops being visible while active must not leave the wizard
  // pointing at nothing (or at a different step).
  const activeId = useRef(current?.id);
  useEffect(() => {
    activeId.current = steps[step]?.id;
  }, [step]);
  useEffect(() => {
    const target = resolveStep(steps, step, activeId.current);
    if (target === step) return;
    activeId.current = steps[target]?.id;
    goTo(target);
  }, [steps.map((s) => s.id).join('|')]);

  useEffect(() => {
    setIsFinalStep(step === finalIndex);
  }, [step, finalIndex]);

  useEffect(() => {
    current?.onEnter?.(getValues());
  }, [step, current?.title]);

  // After a successful submit, show the result step if there is one.
  useEffect(() => {
    if (
      (submitState === 'success' || submitState === 'error') &&
      resultIndex >= 0
    )
      goTo(resultIndex);
  }, [submitState]);

  const lastSaved = useRef('');
  useEffect(() => {
    if (!persistKey) return;
    const save = () => {
      const safe = withoutSecrets(scheme, getValues(), registry);
      const fingerprint = JSON.stringify([steps[step]?.id, safe]);
      if (fingerprint === lastSaved.current) return;
      lastSaved.current = fingerprint;
      saveDraft({ persistKey, ...snapshotMeta }, steps[step]?.id, safe);
    };
    save();
    const subscription = watch(save);
    return () => subscription.unsubscribe();
  }, [step, persistKey, steps.map((s) => s.id).join('|')]);

  // After a blocked "Next", move focus to the first invalid field.
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
    if (busy.current) return;
    busy.current = true;
    try {
      await advance();
    } finally {
      busy.current = false;
    }
  };

  const advance = async () => {
    const token = navigation.current;
    const names = fields.flatMap((f) => fieldNames(f, registry));
    if (names.length > 0 && !(await trigger(names))) {
      ui?.setAttempted(true);
      setFocusTick((t) => t + 1);
      return;
    }
    if (current.beforeNext) {
      let outcome: BeforeNextResult;
      try {
        outcome = await current.beforeNext(getValues());
      } catch (e) {
        outcome = { error: e instanceof Error ? e.message : String(e) };
      }
      if (token !== navigation.current) return;
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
      setValue(name, value, { shouldDirty: true });
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
    <form
      noValidate
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        void next();
      }}
    >
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
          isSubmitting={submitState === 'submitting'}
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
    </form>
  );
};
