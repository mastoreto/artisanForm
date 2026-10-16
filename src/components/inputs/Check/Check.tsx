import { useArtisanField } from '../../../engine/form/useArtisanField';
import { FieldError } from '../../ui/FieldParts';
import { useCx } from '../../ui/UiContext';

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
  const cx = useCx();
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
        className={cx('choiceGroup', className)}
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
            className={cx('choice')}
            data-checked={selected.includes(option.value) || undefined}
          >
            {option.label}
          </button>
        ))}
      </div>
      <FieldError id={name} error={error} />
    </div>
  );
};

export default Check;
