import { cn } from '../../../commons/cn';
import { theme } from '../../../commons/theme';
import { useArtisanField } from '../../../engine/form/useArtisanField';

interface RangeProps {
  id: string;
  name: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

/** Slider holding a number; shows the current value. */
const Range = ({
  id,
  name,
  label,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  helperText,
  className,
}: RangeProps) => {
  const [field, , helpers] = useArtisanField<number | string>(name);
  const value =
    field.value === '' || field.value == null ? min : Number(field.value);
  return (
    <div className={cn('mb-4', className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <output htmlFor={id} className="text-sm text-gray-600">
          {value}
        </output>
      </div>
      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={helperText ? `${id}-help` : undefined}
        onChange={(e) => helpers.setValue(Number(e.target.value))}
        onBlur={field.onBlur}
        className={cn('mt-1 w-full', theme.accent)}
      />
      {helperText && (
        <p className="mt-1 text-sm text-gray-500" id={`${id}-help`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Range;
