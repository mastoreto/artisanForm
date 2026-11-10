import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { type UseFormReturn, useFormState, useWatch } from 'react-hook-form';
import { useStore } from 'zustand';
import type { ArtisanLabels } from '../../commons/labels';
import { fieldNames } from '../../engine/buildSchema';
import {
  conditionNames,
  storedName,
  visibleFields,
  visibleSteps,
} from '../../engine/conditions';
import { saveDraft, withoutSecrets } from '../../engine/draft';
import { errorAt } from '../../engine/form/errors';
import type { FormValues } from '../../engine/form/types';
import type { FormUi } from '../../engine/form/validators';
import { resolveStep } from '../../engine/navigation';
import type { ArtisanStore } from '../../engine/store/useArtisanStore';
import {
  canJumpTo,
  resolveBack,
  resolveNext,
  usesFlow,
} from '../../engine/transitions';
import type { StorageMap } from '../../integrations/storage/types';
import type { FormUIConfig } from '../../schema/contract/types';
import type { BeforeNextResult, FormSchema } from '../../schema/legacy/types';
import type { FieldRegistry } from '../fields/registry';
import {
  type ArtisanStepApi,
  type StepContext,
  type StepRegistry,
  stepDefinitionOf,
} from '../steps/registry';

export interface WizardProps {
  /** The single form instance (React Hook Form) the wizard drives. */
  methods: UseFormReturn<FormValues>;
  /** This wizard's step state. */
  store: ArtisanStore;
  /** Validators and the "attempted" flag shared with the field bindings. */
  uiState: FormUi;
  scheme: FormSchema;
  snapshotMeta: { formId: string; revision?: number };
  /** Changes only when the schema's content changes. */
  schemeKey: string;
  /** Semantic UI settings of the form (density, labelPosition, layout). */
  ui?: FormUIConfig;
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
  /** Steps already left, restored from a draft (forms with transitions). */
  initialHistory?: string[];
}

/**
 * The wizard's behavior without any markup: visible steps and fields, the
 * current step, navigation (`next` validates, runs `beforeNext`, then moves or
 * submits), drafts, focus on errors and the context handed to step renderers.
 * `Wizard` only renders what this returns; a headless API would expose this.
 */
export const useWizard = ({
  initialHistory,
  methods,
  store,
  uiState,
  scheme,
  snapshotMeta,
  schemeKey,
  pluginsMap,
  storageMap,
  registry,
  stepRegistry,
  labels,
  onChange,
  onSubmitValues,
  onStepChange,
  step: stepProp,
  persistKey,
}: WizardProps) => {
  // Opted out of React Compiler on purpose: `values = getValues()` below reads
  // mutable form state during render. The compiler assumes `getValues` is pure
  // (stable identity => same result) and would cache a stale snapshot.
  'use no memo';
  const { control, trigger, setValue, handleSubmit, watch, getValues } =
    methods;
  const { errors: formErrors } = useFormState({ control });
  // Re-render only when a value a condition reads changes; typing in any
  // other field re-renders just that field.
  const watchedNames = useMemo(() => conditionNames(scheme), [scheme]);
  const watched = useWatch({ control, name: watchedNames }) as unknown[];
  const visibility = Object.fromEntries(
    watchedNames.map((n, i) => [n, watched[i]]),
  );
  const ui = uiState;
  const submitForm = () => handleSubmit(onSubmitValues)();

  useEffect(() => {
    if (!onChange) return;
    const subscription = watch((all) => onChange(all as FormValues));
    return () => subscription.unsubscribe();
  }, [watch, onChange]);
  const step = useStore(store, (s) => s.step);
  const setStep = useStore(store, (s) => s.setStep);
  const setProcessStep = useStore(store, (s) => s.setProcessStep);
  const setIsFinalStep = useStore(store, (s) => s.setIsFinalStep);
  const submitState = useStore(store, (s) => s.submitState);
  const submitError = useStore(store, (s) => s.submitError);

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
  const moveTo = (index: number) => {
    navigation.current += 1;
    ui?.setAttempted(false);
    setStepError(null);
    setStep(index);
    setProcessStep(index);
  };

  // Transitions, loops and revisit rules only apply when the schema uses them;
  // otherwise navigation is the plain linear one it always was.
  const flow = useMemo(() => usesFlow(scheme), [scheme]);
  const [history, setHistory] = useState<string[]>(initialHistory ?? []);
  // Any jump to a step already left rewinds the history to before it.
  const goTo = (index: number) => {
    const id = steps[index]?.id;
    if (flow && id && history.includes(id))
      setHistory(history.slice(0, history.lastIndexOf(id)));
    moveTo(index);
  };
  // For the user (stepper, `goToStep`): refused when a finished `revisit: 'deny'` step is in the way.
  const jumpTo = (index: number) => {
    const id = steps[index]?.id;
    if (flow && id && !canJumpTo(steps, history, id)) return false;
    goTo(index);
    return true;
  };
  const back = () => {
    if (!flow) return goTo(Math.max(0, step - 1));
    const previous = resolveBack(steps, history);
    if (!previous) return;
    setHistory(previous.history);
    moveTo(previous.index);
  };
  const canGoBack = flow ? resolveBack(steps, history) !== null : step > 0;

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation after submit is a reaction to the store state
      goTo(resultIndex);
  }, [submitState]);

  const lastSaved = useRef('');
  useEffect(() => {
    if (!persistKey) return;
    const save = () => {
      const safe = withoutSecrets(scheme, getValues(), registry);
      const left = flow ? history : undefined;
      const fingerprint = JSON.stringify([steps[step]?.id, safe, left]);
      if (fingerprint === lastSaved.current) return;
      lastSaved.current = fingerprint;
      saveDraft({ persistKey, ...snapshotMeta }, steps[step]?.id, safe, left);
    };
    save();
    const subscription = watch(save);
    return () => subscription.unsubscribe();
  }, [step, persistKey, steps.map((s) => s.id).join('|'), history.join('|')]);

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
    await advance().finally(() => {
      busy.current = false;
    });
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
    if (flow) {
      setHistory([...history, current.id ?? String(step)]);
      moveTo(resolveNext(steps, step, getValues(), history));
      return;
    }
    moveTo(step + 1);
  };

  const ownedNames = new Set([
    ...fields.flatMap((f) => fieldNames(f, registry)),
    ...(storedName(current) ? [storedName(current) as string] : []),
  ]);
  const stepErrors = Object.fromEntries(
    [...ownedNames].flatMap((n) => {
      const message = errorAt(formErrors, n);
      return message ? [[n, message]] : [];
    }),
  );
  const api: ArtisanStepApi = {
    step: {
      id: current.id ?? String(step),
      title: current.title,
      kind: current.kind ?? 'form',
      index: step,
      total: steps.length,
    },
    values,
    setValue: (name, value) => {
      if (!ownedNames.has(name))
        throw new Error(
          `Step "${current.title}" cannot write "${name}": only its own fields and resultName`,
        );
      setValue(name, value, { shouldDirty: true });
    },
    errors: stepErrors,
    next,
    back,
    goToStep: (id) => {
      const index = steps.findIndex((s) => s.id === id);
      return index < 0 ? false : jumpTo(index);
    },
    submitState,
    submitError,
    error: stepError,
    labels,
  };
  const context: StepContext = {
    api,
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
    back,
    goTo,
    submit: submitForm,
    submitState,
    submitError,
    error: stepError,
  };

  return {
    steps,
    step,
    current,
    definition,
    context,
    bindForm: (element: HTMLFormElement | null) => {
      formRef.current = element;
    },
    next,
    goTo,
    jumpTo,
    back,
    canGoBack,
    history,
    flow,
    finalIndex,
    stepError,
    submitError,
    submitState,
  };
};
