import { useEffect, useMemo } from 'react';
import { Form, Formik, type FormikValues } from 'formik';
import Controls from '../ArtisanControls/Controls';
import Check from '../ArtisanInputs/Check/Check';
import DateInput from '../ArtisanInputs/Date/Date';
import Password from '../ArtisanInputs/Password/Password';
import Radio from '../ArtisanInputs/Radio/Radio';
import Select from '../ArtisanInputs/Select/Select';
import Text from '../ArtisanInputs/Text/Text';
import { useArtisanStore } from '../../stores/useArtisanStore';
import DynamicSelect from '../ArtisanInputs/DynamicSelect/DynamicSelect';
import {
  buildInitialValues,
  buildValidationSchema,
  fieldNames,
} from './buildSchema';
import type { FieldSchema, FormSchema } from './types';

interface ArtisanFormProps {
  scheme: FormSchema;
  onSubmit: (values: FormikValues) => void;
}

const renderField = (f: FieldSchema) => {
  switch (f.type) {
    case 'text':
      return (
        <Text
          id={f.name}
          name={f.name}
          label={f.label}
          placeholder={f.placeholder}
        />
      );
    case 'password':
      return (
        <Password
          id={f.name}
          name={f.name}
          label={f.label}
          placeholder={f.placeholder}
        />
      );
    case 'date':
      return <DateInput id={f.name} name={f.name} label={f.label} />;
    case 'select':
      return <Select name={f.name} options={f.options ?? []} />;
    case 'dynamicSelect':
      return (
        <DynamicSelect
          name={f.name}
          dependentName={f.dependentName ?? `${f.name}Dependent`}
          options={f.options ?? []}
          dependentOptions={f.dependentOptions ?? {}}
        />
      );
    case 'check':
      return <Check name={f.name} options={f.options ?? []} />;
    case 'radio':
      return <Radio name={f.name} options={f.options ?? []} />;
  }
};

const ArtisanForm = ({ scheme, onSubmit }: ArtisanFormProps) => {
  const step = useArtisanStore((s) => s.step);
  const setStep = useArtisanStore((s) => s.setStep);
  const setProcessStep = useArtisanStore((s) => s.setProcessStep);
  const setIsFinalStep = useArtisanStore((s) => s.setIsFinalStep);

  const initialValues = useMemo(() => buildInitialValues(scheme), [scheme]);
  const validationSchema = useMemo(
    () => buildValidationSchema(scheme),
    [scheme],
  );
  const current = scheme.steps[step];

  useEffect(() => {
    setStep(0);
    setProcessStep(0);
  }, [scheme]);

  useEffect(() => {
    setIsFinalStep(step === scheme.steps.length - 1);
  }, [step, scheme]);

  if (!current) return null;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ validateForm, setTouched, touched }) => {
        // Validate only the current step's fields before moving forward.
        const handleNext = async () => {
          const names = current.fields.flatMap(fieldNames);
          const errors = await validateForm();
          await setTouched({
            ...touched,
            ...Object.fromEntries(names.map((n) => [n, true])),
          });
          if (names.some((n) => errors[n])) return;
          setStep(step + 1);
          setProcessStep(step + 1);
        };

        return (
          <Form noValidate>
            <h2 className="mb-4 text-lg font-semibold">{current.title}</h2>
            {current.fields.map((f) => (
              <div key={f.name} className="mb-4">
                {(f.type === 'select' ||
                  f.type === 'dynamicSelect' ||
                  f.type === 'check' ||
                  f.type === 'radio') && (
                  <span className="block text-sm font-medium text-gray-700">
                    {f.label}
                  </span>
                )}
                {renderField(f)}
              </div>
            ))}
            <Controls onNext={handleNext} />
          </Form>
        );
      }}
    </Formik>
  );
};

export default ArtisanForm;
