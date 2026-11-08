// ArtisanForm kit for shadcn/ui. Copy this file into your project (or run
// `npx shadcn add <registry-url>/artisanform-kit.json`); it imports YOUR
// components from `@/components/ui/*`, so the look is the one you already have.
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const FieldWrapper = ({
  id,
  label,
  description,
  error,
  className,
  children,
}: ArtisanFieldWrapperProps) => (
  <div className={`grid gap-2 ${className ?? ''}`}>
    <Label htmlFor={id}>{label}</Label>
    {children}
    {description && (
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        {description}
      </p>
    )}
    {error && (
      <p
        id={`${id}-error`}
        aria-live="polite"
        className="text-sm font-medium text-destructive"
      >
        {error.message}
      </p>
    )}
  </div>
);

const htmlType = { datetime: 'datetime-local' } as Record<string, string>;

const textLike =
  (type: string) =>
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
    aria,
  }: ArtisanInputProps<string | number>) => (
    <Input
      id={id}
      name={name}
      type={htmlType[type] ?? type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      placeholder={placeholder}
      {...aria}
    />
  );

const TextareaInput = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled,
  readOnly,
  placeholder,
  aria,
}: ArtisanInputProps<string>) => (
  <Textarea
    id={id}
    name={name}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    disabled={disabled}
    readOnly={readOnly}
    placeholder={placeholder}
    {...aria}
  />
);

// A native <select> wearing the Input classes: label and keyboard behavior
// come for free (Radix Select needs extra wiring for both).
const SelectInput = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled,
  options = [],
  aria,
}: ArtisanInputProps<string>) => (
  <select
    id={id}
    name={name}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    disabled={disabled}
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"
    {...aria}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

const RadioInput = ({
  id,
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
    aria-label={label}
    value={value ?? ''}
    onValueChange={onChange}
    onBlur={onBlur}
    disabled={disabled}
    {...aria}
  >
    {options.map((o) => (
      <div key={o.value} className="flex items-center gap-2">
        <RadioGroupItem value={o.value} id={`${id}-${o.value}`} />
        <Label htmlFor={`${id}-${o.value}`}>{o.label}</Label>
      </div>
    ))}
  </RadioGroup>
);

const CheckboxInput = ({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  aria,
}: ArtisanInputProps<boolean>) => (
  <Checkbox
    id={id}
    checked={!!value}
    onCheckedChange={(v) => onChange(v === true)}
    onBlur={onBlur}
    disabled={disabled}
    {...aria}
  />
);

const SwitchInput = ({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  aria,
}: ArtisanInputProps<boolean>) => (
  <Switch
    id={id}
    checked={!!value}
    onCheckedChange={onChange}
    onBlur={onBlur}
    disabled={disabled}
    {...aria}
  />
);

const Stepper = ({ steps, labels }: ArtisanStepperProps) =>
  steps.length < 2 ? null : (
    <nav aria-label={labels.progress} className="mb-6">
      <ol className="flex gap-2">
        {steps.map((s) => (
          <li
            key={s.id}
            aria-current={s.state === 'current' ? 'step' : undefined}
            className="flex-1 rounded-md border px-3 py-2 text-sm text-muted-foreground aria-[current=step]:border-primary aria-[current=step]:font-semibold aria-[current=step]:text-foreground"
          >
            {s.title}
          </li>
        ))}
      </ol>
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
  <div className="mt-6 grid gap-3">
    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    <div className="flex justify-between">
      {!hidePrevious && !isFirst ? (
        <Button type="button" variant="outline" onClick={onPrevious}>
          {labels.previous}
        </Button>
      ) : (
        <span />
      )}
      {!hideNext && (
        <Button
          type="button"
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
  <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
);

const FormError = ({ message }: ArtisanFormErrorProps) => (
  <p role="alert" className="mt-3 text-sm font-medium text-destructive">
    {message}
  </p>
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
    textarea: TextareaInput,
    select: SelectInput,
    radio: RadioInput,
    checkbox: CheckboxInput,
    switch: SwitchInput,
  },
};

export const shadcnKit = {
  name: 'shadcn',
  components,
} satisfies ArtisanUiKit;

export default shadcnKit;
