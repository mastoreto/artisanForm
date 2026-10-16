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

const renderField = (f: FieldSchema) => {
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
          dependentOptions={f.dependentOptions ?? {}}
        />
      );
    case 'check':
      return <Check {...choice} label={f.label} />;
    case 'radio':
      return <Radio {...choice} label={f.label} />;
  }
};

const ArtisanFormInner = ({
  scheme,
  onSubmit,
  initialValues: initialOverrides,
  onStepChange,
  onChange,
  step: stepProp,
  labels: labelOverrides,
  className,
}: ArtisanFormProps) => {
  const step = useArtisanStore((s) => s.step);
  const setStep = useArtisanStore((s) => s.setStep);
  const setProcessStep = useArtisanStore((s) => s.setProcessStep);
  const setIsFinalStep = useArtisanStore((s) => s.setIsFinalStep);

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
  const current = scheme.steps[step];
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
    setIsFinalStep(step === scheme.steps.length - 1);
  }, [step, scheme]);

  // After a blocked "Siguiente", move focus to the first invalid field.
  useEffect(() => {
    if (focusTick === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [focusTick]);

  if (!current) return null;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ validateForm, setTouched, touched, isSubmitting }) => {
        // Validate only the current step's fields before moving forward.
        const handleNext = async () => {
          const names = current.fields.flatMap(fieldNames);
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
            <Stepper steps={scheme.steps} current={step} labels={labels} />
            <h2 className="mb-4 text-lg font-semibold">{current.title}</h2>
            {current.fields.map((f) => (
              <div key={f.name} className="mb-4">
                {isChoice(f) && (
                  <span className="block text-sm font-medium text-gray-700">
                    {f.label}
                  </span>
                )}
                {renderField(f)}
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
      }}
    </Formik>
  );
};

const ArtisanForm = (props: ArtisanFormProps) => (
  <ArtisanStoreProvider>
    <ArtisanFormInner {...props} />
  </ArtisanStoreProvider>
);

export default ArtisanForm;
