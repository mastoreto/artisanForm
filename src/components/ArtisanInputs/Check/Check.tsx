import { useField } from 'formik';
import { cn } from '../../../commons/cn';

interface Option {
  label: string;
  value: string;
}

interface CheckProps {
  name: string;
  options: Option[];
  disabled?: boolean;
}

const Check = ({ name, options, disabled }: CheckProps) => {
  const [field, meta, helpers] = useField<string[]>(name);
  const error = meta.touched && meta.error ? meta.error : null;
  const selected = field.value ?? [];

  const handleChange = (value: string) => {
    helpers.setValue(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
    helpers.setTouched(true, false);
  };

  return (
    <div>
      <div className="flex flex-wrap">
        {options.map((option) => (
          <button
            type="button"
            disabled={disabled}
            key={option.value}
            onClick={() => handleChange(option.value)}
            aria-pressed={selected.includes(option.value)}
            className={cn(
              'cursor-pointer select-none m-1 px-4 py-2 border-2 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              selected.includes(option.value)
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Check;
