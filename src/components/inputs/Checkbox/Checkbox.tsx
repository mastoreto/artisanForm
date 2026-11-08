import { useArtisanField } from '../../../engine/form/useArtisanField';
import {
  describedBy as ariaDescribedBy,
  FieldBox,
  FieldError,
  FieldHelp,
} from '../../ui/FieldParts';
import { useCx } from '../../ui/UiContext';

interface CheckboxProps {
  id: string;
  name: string;
  label: string;
  /** `switch` renders a toggle; both hold a boolean. */
  variant?: 'checkbox' | 'switch';
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

const Checkbox = ({
  id,
  name,
  label,
  variant = 'checkbox',
  disabled,
  helperText,
  className,
}: CheckboxProps) => {
  const [field, meta, helpers] = useArtisanField<boolean>(name);
  const checked = !!field.value;
  const error = meta.touched && meta.error ? meta.error : null;
  const cx = useCx();
  const describedBy = ariaDescribedBy(id, { helperText, error });

  const toggle = (next: boolean) => {
    helpers.setValue(next);
    helpers.setTouched();
  };

  return (
    <FieldBox
      id={id}
      label={label}
      helperText={helperText}
      error={error}
      errorCode={meta.code}
      className={className}
    >
      <div className={cx('choiceGroup')} data-inline>
        {variant === 'switch' ? (
          <button
            type="button"
            id={id}
            role="switch"
            aria-checked={checked}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            disabled={disabled}
            onClick={() => toggle(!checked)}
            className={cx('switch')}
            data-checked={checked || undefined}
          >
            <span className={cx('switchThumb')} />
          </button>
        ) : (
          <input
            type="checkbox"
            id={id}
            name={name}
            checked={checked}
            onChange={(e) => toggle(e.target.checked)}
            onBlur={field.onBlur}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cx('checkbox')}
          />
        )}
        <label htmlFor={id} className={cx('label')} data-inline>
          {label}
        </label>
      </div>
      <FieldHelp id={id} text={helperText} />
      <FieldError id={id} error={error} />
    </FieldBox>
  );
};

export default Checkbox;
