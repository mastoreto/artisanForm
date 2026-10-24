import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Rating from '@mui/material/Rating';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import MuiStepper from '@mui/material/Stepper';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import type {
  ArtisanComponents,
  ArtisanControlsProps,
  ArtisanFieldWrapperProps,
  ArtisanFormErrorProps,
  ArtisanInputProps,
  ArtisanStepHeaderProps,
  ArtisanStepperProps,
  ArtisanUiKit,
} from 'artisanform';

/** MUI owns the look; the form's own part of the markup is only layout. */
const FieldWrapper = ({
  id,
  label,
  description,
  error,
  invalid,
  children,
}: ArtisanFieldWrapperProps) => (
  <FormControl error={invalid} fullWidth margin="dense">
    <FormLabel htmlFor={id}>{label}</FormLabel>
    {children}
    {description && (
      <FormHelperText id={`${id}-help`}>{description}</FormHelperText>
    )}
    {error && (
      <FormHelperText id={`${id}-error`} aria-live="polite">
        {error.message}
      </FormHelperText>
    )}
  </FormControl>
);

const htmlType = { datetime: 'datetime-local' } as Record<string, string>;

const textLike =
  (type: string, multiline = false) =>
  ({
    id,
    name,
    value,
    onChange,
    onBlur,
    disabled,
    readOnly,
    required,
    placeholder,
    error,
    aria,
  }: ArtisanInputProps<string | number>) => (
    <OutlinedInput
      id={id}
      name={name}
      type={multiline ? undefined : (htmlType[type] ?? type)}
      multiline={multiline}
      minRows={multiline ? 3 : undefined}
      size="small"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      error={!!error}
      inputProps={{ ...aria, required }}
    />
  );

const SelectInput = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled,
  error,
  options = [],
  aria,
}: ArtisanInputProps<string>) => (
  <Select
    native
    size="small"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value as string)}
    onBlur={onBlur}
    disabled={disabled}
    error={!!error}
    inputProps={{ id, name, ...aria }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </Select>
);

const RadioInput = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled,
  options = [],
  label,
  aria,
}: ArtisanInputProps<string>) => (
  <RadioGroup
    id={id}
    name={name}
    aria-label={label}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    {...aria}
  >
    {options.map((o) => (
      <FormControlLabel
        key={o.value}
        value={o.value}
        control={<Radio disabled={disabled} />}
        label={o.label}
      />
    ))}
  </RadioGroup>
);

const CheckInput = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled,
  options = [],
  label,
  aria,
}: ArtisanInputProps<string[]>) => {
  const picked = value ?? [];
  return (
    <FormGroup id={id} aria-label={label} onBlur={onBlur} {...aria}>
      {options.map((o) => (
        <FormControlLabel
          key={o.value}
          label={o.label}
          control={
            <Checkbox
              name={name}
              disabled={disabled}
              checked={picked.includes(o.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...picked, o.value]
                    : picked.filter((v) => v !== o.value),
                )
              }
            />
          }
        />
      ))}
    </FormGroup>
  );
};

const toggle =
  (Control: typeof Checkbox | typeof Switch) =>
  ({
    id,
    name,
    value,
    onChange,
    onBlur,
    disabled,
    aria,
  }: ArtisanInputProps<boolean>) => (
    <div>
      <Control
        id={id}
        name={name}
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
        disabled={disabled}
        slotProps={{ input: aria }}
      />
    </div>
  );

const RatingInput = ({
  id,
  name,
  value,
  onChange,
  disabled,
  readOnly,
  field,
}: ArtisanInputProps<number | string>) => (
  <Rating
    id={id}
    name={name}
    value={Number(value) || 0}
    max={(field as { length?: number }).length ?? 5}
    onChange={(_, v) => onChange(v ?? 0)}
    disabled={disabled}
    readOnly={readOnly}
  />
);

const RangeInput = ({
  name,
  value,
  onChange,
  disabled,
  label,
  field,
}: ArtisanInputProps<number | string>) => (
  <Slider
    name={name}
    aria-label={label}
    valueLabelDisplay="auto"
    value={Number(value) || 0}
    min={Number(field.min ?? 0)}
    max={Number(field.max ?? 100)}
    step={Number(field.step ?? 1)}
    onChange={(_, v) => onChange(v as number)}
    disabled={disabled}
  />
);

const Stepper = ({ steps, current, labels }: ArtisanStepperProps) =>
  steps.length < 2 ? null : (
    <nav aria-label={labels.progress}>
      <MuiStepper activeStep={current} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((s) => (
          <Step
            key={s.id}
            completed={s.state === 'done'}
            aria-current={s.state === 'current' ? 'step' : undefined}
          >
            <StepLabel>{s.title}</StepLabel>
          </Step>
        ))}
      </MuiStepper>
    </nav>
  );

const Controls = ({
  onNext,
  onPrevious,
  isFirst,
  isLast,
  isSubmitting,
  nextDisabled,
  hidePrevious,
  hideNext,
  error,
  labels,
}: ArtisanControlsProps) => (
  <div>
    {error && (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    )}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 24,
      }}
    >
      {!hidePrevious && !isFirst ? (
        <Button variant="outlined" onClick={onPrevious}>
          {labels.previous}
        </Button>
      ) : (
        <span />
      )}
      {!hideNext && (
        <Button
          variant="contained"
          onClick={onNext}
          disabled={isSubmitting || nextDisabled}
        >
          {isLast ? labels.submit : labels.next}
        </Button>
      )}
    </div>
  </div>
);

const StepHeader = ({ title }: ArtisanStepHeaderProps) => (
  <Typography variant="h6" component="h2" gutterBottom>
    {title}
  </Typography>
);

const FormError = ({ message }: ArtisanFormErrorProps) => (
  <Alert severity="error" sx={{ mt: 2 }}>
    {message}
  </Alert>
);

const components: ArtisanComponents = {
  FieldWrapper,
  Stepper,
  Controls,
  StepHeader,
  FormError,
  inputs: {
    text: textLike('text'),
    email: textLike('email'),
    tel: textLike('tel'),
    url: textLike('url'),
    password: textLike('password'),
    number: textLike('number'),
    date: textLike('date'),
    time: textLike('time'),
    datetime: textLike('datetime'),
    month: textLike('month'),
    textarea: textLike('text', true),
    select: SelectInput,
    radio: RadioInput,
    check: CheckInput,
    checkbox: toggle(Checkbox),
    switch: toggle(Switch),
    rating: RatingInput,
    range: RangeInput,
  },
};

/**
 * Material UI for ArtisanForm: MUI controls inside a `FormControl`. The kit
 * replaces single-value inputs, the stepper, controls, header and form error;
 * `combobox`, `multiselect`, `otp`, files, arrays and date ranges keep the
 * default components (themed with the `--artisan-*` tokens).
 */
export const muiKit = {
  name: 'mui',
  components,
} satisfies ArtisanUiKit;

export default muiKit;
