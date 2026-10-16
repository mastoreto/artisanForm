import { cn } from '../../../commons/cn';
import { theme } from '../../../commons/theme';
import { useArtisanField } from '../../../engine/form/useArtisanField';

interface Option {
  label: string;
  value: string;
}

interface CheckProps {
  name: string;
  options: Option[];
  disabled?: boolean;
  /** Accessible name of the group. */
  label?: string;
  className?: string;
}

const Check = ({ name, options, disabled, label, className }: CheckProps) => {
  const [field, meta, helpers] = useArtisanField<string[]>(name);
  const error = meta.touched && meta.error ? meta.error : null;
  const selected = field.value ?? [];

  const handleChange = (value: string) => {
    helpers.setValue(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
    helpers.setTouched();
  };

  return (
    <div>
      <div
        className={cn('flex flex-wrap', className)}
        role="group"
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        tabIndex={-1}
      >
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
                ? cn('text-white', theme.bg, theme.border)
                : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && (
        <p
          className="mt-2 text-sm text-red-600"
          id={`${name}-error`}
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Check;
