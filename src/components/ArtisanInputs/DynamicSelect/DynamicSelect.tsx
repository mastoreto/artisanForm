import { useEffect } from 'react';
import { useField } from 'formik';
import Select from '../Select/Select';

interface Option {
  value: string;
  label: string;
}

interface DynamicSelectProps {
  name: string;
  dependentName: string;
  options: Option[];
  /** Options of the second select, keyed by the value of the first one. */
  dependentOptions: Record<string, Option[]>;
}

const DynamicSelect = ({
  name,
  dependentName,
  options,
  dependentOptions,
}: DynamicSelectProps) => {
  const [parent] = useField<string>(name);
  const [child, , childHelpers] = useField<string>(dependentName);
  const childOptions = dependentOptions[parent.value] ?? [];

  // Keep the child value valid for the selected parent.
  useEffect(() => {
    if (!childOptions.some((o) => o.value === child.value)) {
      childHelpers.setValue(childOptions[0]?.value ?? '');
    }
  }, [parent.value]);

  return (
    <div>
      <Select name={name} options={options} />
      {childOptions.length > 0 && (
        <div className="mt-4">
          <Select name={dependentName} options={childOptions} />
        </div>
      )}
    </div>
  );
};

export default DynamicSelect;
