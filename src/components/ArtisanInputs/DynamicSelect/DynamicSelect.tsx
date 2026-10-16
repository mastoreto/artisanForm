import { useEffect, useState } from 'react';
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
  dependentOptions?: Record<string, Option[]>;
  /** Async alternative to `dependentOptions`: called with the first select's value. */
  loadDependentOptions?: (parentValue: string) => Promise<Option[]>;
  disabled?: boolean;
  className?: string;
  loadingText?: string;
  errorText?: string;
}

const DynamicSelect = ({
  name,
  dependentName,
  options,
  dependentOptions = {},
  loadDependentOptions,
  disabled,
  className,
  loadingText = 'Cargando…',
  errorText = 'No se pudieron cargar las opciones',
}: DynamicSelectProps) => {
  const [parent] = useField<string>(name);
  const [child, , childHelpers] = useField<string>(dependentName);
  const [loaded, setLoaded] = useState<Option[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const childOptions = loadDependentOptions
    ? loaded
    : (dependentOptions[parent.value] ?? []);

  useEffect(() => {
    if (!loadDependentOptions) return;
    let stale = false;
    setStatus('loading');
    setLoaded([]);
    loadDependentOptions(parent.value)
      .then((result) => {
        if (stale) return;
        setLoaded(result);
        setStatus('idle');
      })
      .catch(() => {
        if (!stale) setStatus('error');
      });
    return () => {
      stale = true;
    };
  }, [parent.value]);

  // Keep the child value valid for the selected parent.
  useEffect(() => {
    if (childOptions.some((o) => o.value === child.value)) return;
    const next = childOptions[0]?.value ?? '';
    if (next !== child.value) childHelpers.setValue(next);
  }, [parent.value, loaded]);

  return (
    <div className={className}>
      <Select name={name} options={options} disabled={disabled} />
      {status === 'loading' && (
        <p className="mt-2 text-sm text-gray-500" role="status">
          {loadingText}
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {errorText}
        </p>
      )}
      {childOptions.length > 0 && (
        <div className="mt-4">
          <Select
            name={dependentName}
            options={childOptions}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

export default DynamicSelect;
