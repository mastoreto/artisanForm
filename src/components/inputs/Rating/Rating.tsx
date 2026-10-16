import { useField } from 'formik';
import { useId } from 'react';
import { cn } from '../../../commons/cn';

interface RatingProps {
  name: string;
  label: string;
  /** Number of stars (default 5). */
  max?: number;
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

/** 1..max star rating exposed as a radio group; click the chosen star again to clear. */
const Rating = ({
  name,
  label,
  max = 5,
  disabled,
  helperText,
  className,
}: RatingProps) => {
  const [field, meta, helpers] = useField<number | string>(name);
  const value = Number(field.value) || 0;
  const error = meta.touched && meta.error ? meta.error : null;
  const labelId = useId();

  const choose = (n: number) => {
    helpers.setValue(n === value ? '' : n);
    helpers.setTouched(true, false);
  };

  return (
    <div className={cn('mb-4', className)}>
      <span id={labelId} className="block text-sm font-medium text-gray-700">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={!!error}
        className="flex gap-1"
      >
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} / ${max}`}
            disabled={disabled}
            onClick={() => choose(n)}
            className={cn(
              'text-2xl leading-none disabled:opacity-50',
              n <= value ? 'text-yellow-500' : 'text-gray-300',
            )}
          >
            ★
          </button>
        ))}
      </div>
      {helperText && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
      {error && (
        <p className="mt-2 text-sm text-red-600" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
};

export default Rating;
