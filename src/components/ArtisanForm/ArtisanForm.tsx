import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Formik, useFormikContext, type FormikValues } from 'formik';
import Controls from '../ArtisanControls/Controls';
import Check from '../ArtisanInputs/Check/Check';
import DateInput from '../ArtisanInputs/Date/Date';
import Password from '../ArtisanInputs/Password/Password';
import Radio from '../ArtisanInputs/Radio/Radio';
import Select from '../ArtisanInputs/Select/Select';
import { defaultLabels, type ArtisanLabels } from '../../commons/labels';
import Stepper from './Stepper';
import Text from '../ArtisanInputs/Text/Text';
import Textarea from '../ArtisanInputs/Textarea/Textarea';
import {
  ArtisanStoreProvider,
  useArtisanStore,
} from '../../stores/useArtisanStore';
import DynamicSelect from '../ArtisanInputs/DynamicSelect/DynamicSelect';
import {
  buildInitialValues,
  buildValidationSchema,
  fieldNames,
} from './buildSchema';
import { visibleFields, visibleSteps } from './conditions';
import type { FieldSchema, FormSchema } from './types';

interface ArtisanFormProps {
  scheme: FormSchema;
  /** Return a promise to keep "Finalizar" disabled until it settles. */
  onSubmit: (values: FormikValues) => void | Promise<unknown>;
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

const isChoice = (f: FieldSchema) =>
  ['select', 'dynamicSelect', 'check', 'radio'].includes(f.type);

const renderField = (f: FieldSchema, labels: ArtisanLabels) => {
  const text = {
    id: f.name,
    name: f.name,
    label: f.label,
    placeholder: f.placeholder,
    disabled: f.disabled,
    helperText: f.helperText,
  };
  const choice = {
    name: f.name,
    options: f.options ?? [],
    disabled: f.disabled,
  };
  switch (f.type) {
    case 'text':
    case 'email':
    case 'number':
      return <Text {...text} type={f.type} />;
    case 'textarea':
      return <Textarea {...text} />;
    case 'password':
      return <Password {...text} />;
    case 'date':
      return <DateInput {...text} />;
    case 'select':
      return <Select {...choice} />;
    case 'dynamicSelect':
      return (
        <DynamicSelect
          {...choice}
          dependentName={f.dependentName ?? `${f.name}Dependent`}
          dependentOptions={f.dependentOptions}
          loadDependentOptions={f.loadDependentOptions}
          loadingText={labels.loadingOptions}
          errorText={labels.loadOptionsError}
        />
      );
    case 'check':
      return <Check {...choice} label={f.label} />;
    case 'radio':
      return <Radio {...choice} label={f.label} />;
  }
};

interface WizardProps {
  scheme: FormSchema;
  labels: ArtisanLabels;
  className?: string;
  onChange?: (values: FormikValues) => void;
  onStepChange?: (step: number) => void;
  step?: number;
}

/** Renders the current step; lives inside <Formik> to read live values. */
const Wizard = ({
  scheme,
  labels,
  className,
  onChange,
  onStepChange,
  step: stepProp,
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
    const names = fields.flatMap(fieldNames);
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
          {isChoice(f) && (
            <span className="block text-sm font-medium text-gray-700">
              {f.label}
            </span>
          )}
          {renderField(f, labels)}
          {isChoice(f) && f.helperText && (
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
  ...wizard
}: ArtisanFormProps) => {
  const initialValues = useMemo(
    () => ({ ...buildInitialValues(scheme), ...initialOverrides }),
    [scheme],
  );
  const labels = useMemo(
    () => ({ ...defaultLabels, ...labelOverrides }),
    [labelOverrides],
  );
  const validationSchema = useMemo(
    () => buildValidationSchema(scheme, labels),
    [scheme, labels],
  );

  // Hidden steps/fields are not part of the submitted values.
  const handleSubmit = (values: FormikValues) => {
    const shown = new Set(
      visibleSteps(scheme, values).flatMap((step) =>
        visibleFields(step, values).flatMap(fieldNames),
      ),
    );
    return onSubmit(
      Object.fromEntries(Object.entries(values).filter(([k]) => shown.has(k))),
    );
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <Wizard scheme={scheme} labels={labels} {...wizard} />
    </Formik>
  );
};

const ArtisanForm = (props: ArtisanFormProps) => (
  <ArtisanStoreProvider>
    <ArtisanFormInner {...props} />
  </ArtisanStoreProvider>
);

export default ArtisanForm;
