import { useArtisanField } from '../../../engine/form/useArtisanField';
import { FieldError } from '../../ui/FieldParts';
import { useCx } from '../../ui/UiContext';

interface Option {
  label: string;
  value: string;
}

interface RadioProps {
  name: string;
  options: Option[];
  disabled?: boolean;
  /** Accessible name of the group. */
  label?: string;
  className?: string;
}

const Radio = ({ name, options, disabled, label, className }: RadioProps) => {
  const [field, meta, helpers] = useArtisanField<string>(name);
  const cx = useCx();
  const error = meta.touched && meta.error ? meta.error : null;

  const handleChange = (value: string) => {
    helpers.setValue(value);
    helpers.setTouched();
  };

  return (
    <div>
      <div
        className={cx('choiceGroup', className)}
        role="radiogroup"
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
            role="radio"
            aria-checked={field.value === option.value}
            className={cx('choice')}
            data-checked={field.value === option.value || undefined}
          >
            {option.label}
          </button>
        ))}
      </div>
      <FieldError id={name} error={error} />
    </div>
  );
};

export default Radio;
