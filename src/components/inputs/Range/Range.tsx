import { useArtisanField } from '../../../engine/form/useArtisanField';
import { FieldBox, FieldHelp, FieldLabel } from '../../ui/FieldParts';
import { useCx } from '../../ui/UiContext';

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
  const cx = useCx();
  const [field, , helpers] = useArtisanField<number | string>(name);
  const value =
    field.value === '' || field.value == null ? min : Number(field.value);
  return (
    <FieldBox
      id={id}
      label={label}
      helperText={helperText}
      className={className}
    >
      <div className={cx('rangeValue')}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <output htmlFor={id} className={cx('muted')}>
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
        className={cx('range')}
      />
      <FieldHelp id={id} text={helperText} />
    </FieldBox>
  );
};

export default Range;
