import type { ReactNode } from 'react';
import * as Yup from 'yup';
import type { ArtisanLabels } from '../../commons/labels';
import type { StorageMap } from '../../integrations/storage/types';
import type { FieldSchema } from '../../schema/legacy/types';
import ArrayField from '../inputs/ArrayField/ArrayField';
import Check from '../inputs/Check/Check';
import Checkbox from '../inputs/Checkbox/Checkbox';
import Combobox from '../inputs/Combobox/Combobox';
import DateInput from '../inputs/Date/Date';
import DynamicSelect from '../inputs/DynamicSelect/DynamicSelect';
import FileUpload from '../inputs/FileUpload/FileUpload';
import Otp from '../inputs/Otp/Otp';
import Password from '../inputs/Password/Password';
import Radio from '../inputs/Radio/Radio';
import Range from '../inputs/Range/Range';
import Rating from '../inputs/Rating/Rating';
import RemoteOptions from '../inputs/RemoteOptions/RemoteOptions';
import Select from '../inputs/Select/Select';
import Text from '../inputs/Text/Text';
import Textarea from '../inputs/Textarea/Textarea';
import InputBridge from '../ui/InputBridge';
import type { ArtisanComponents, OverridableInputType } from '../ui/types';
import type { Cx } from '../ui/UiContext';

export interface FieldContext {
  /** Class names for the default UI (`af-*` + the consumer's `classNames`). */
  cx: Cx;
  /** Replacement components from the `components` prop. */
  components?: ArtisanComponents;
  labels: ArtisanLabels;
  /** The registry in use (lets container fields render their children). */
  registry: FieldRegistry;
  /** Storage adapters by key (see the `storage` prop of ArtisanForm). */
  storage: StorageMap;
}

/** Everything the wizard needs to know about one field `type`. */
export interface FieldDefinition {
  render: (field: FieldSchema, ctx: FieldContext) => ReactNode;
  /** Initial form values, keyed by the value names the field owns. */
  initialValues: (field: FieldSchema) => Record<string, unknown>;
  /** Yup schema for each value name the field owns. */
  rules: (
    field: FieldSchema,
    labels: ArtisanLabels,
    registry?: FieldRegistry,
  ) => Record<string, Yup.AnySchema>;
  /** The wrapper renders the label (group-like fields without a native one). */
  groupLabel?: boolean;
  /** The group label is a real `<label for>` of the control (native single control). */
  labelFor?: boolean;
  /** Never written to drafts (e.g. passwords). May depend on the field (arrays). */
  secret?: boolean | ((field: FieldSchema, registry: FieldRegistry) => boolean);
}

export type FieldRegistry = Record<string, FieldDefinition>;

/** Fails early, with the type name, when a custom field lacks a required part. */
export const assertFieldRegistry = (registry: FieldRegistry): FieldRegistry => {
  for (const [type, def] of Object.entries(registry)) {
    for (const part of ['render', 'initialValues', 'rules'] as const) {
      if (typeof def?.[part] !== 'function')
        throw new Error(
          `Field type "${type}" is incomplete: it needs a \`${part}\` function`,
        );
    }
  }
  return registry;
};

/**
 * Renders a field: the consumer's replacement input for its `type` (through
 * the neutral `ArtisanInputProps` contract) or the registry's own render.
 */
export const renderField = (
  def: FieldDefinition,
  f: FieldSchema,
  ctx: FieldContext,
): ReactNode => {
  // A select or radio fed by a registered source: load, then render as static.
  if (f.loadOptions && (f.type === 'select' || f.type === 'radio'))
    return (
      <RemoteOptions
        field={f}
        labels={ctx.labels}
        render={(resolved) => renderField(def, resolved, ctx)}
      />
    );
  const Override = ctx.components?.inputs?.[f.type as OverridableInputType];
  return Override ? (
    <InputBridge Component={Override} field={f} />
  ) : (
    def.render(f, ctx)
  );
};

/**
 * A replaced input inside a `FieldWrapper` already gets its label, help and
 * error from the wrapper: the step must not print a group label as well.
 */
export const wrapperOwnsLabel = (
  components: FieldContext['components'],
  f: FieldSchema,
): boolean =>
  !!components?.FieldWrapper &&
  !!components.inputs?.[f.type as OverridableInputType];

const textProps = (f: FieldSchema) => ({
  id: f.name,
  name: f.name,
  label: f.label,
  placeholder: f.placeholder,
  disabled: f.disabled,
  helperText: f.helperText,
});

const nativeProps = (f: FieldSchema) =>
  Object.fromEntries(
    Object.entries({
      autoComplete: f.autoComplete,
      inputMode: f.inputMode,
      readOnly: f.readOnly,
      maxLength: f.maxLength,
    }).filter(([, v]) => v !== undefined),
  );

const adornments = (f: FieldSchema) => ({
  mask: f.mask,
  prefix: f.prefix,
  suffix: f.suffix,
});

const choiceProps = (f: FieldSchema) => ({
  name: f.name,
  options: f.options ?? [],
  disabled: f.disabled,
});

const required = (s: Yup.AnySchema, f: FieldSchema, labels: ArtisanLabels) =>
  f.required ? s.required(labels.required) : s;

const stringRules = (
  f: FieldSchema,
  labels: ArtisanLabels,
  extra?: (s: Yup.StringSchema) => Yup.StringSchema,
) => {
  let s = Yup.string();
  // Length checks skip empty values so optional fields can stay blank.
  if (f.min) {
    const min = f.min;
    s = s.test('min', labels.minLength(min), (v) => !v || v.length >= min);
  }
  if (f.max) {
    const max = f.max;
    s = s.test('max', labels.maxLength(max), (v) => !v || v.length <= max);
  }
  if (extra) s = extra(s);
  if (f.sameAs) s = s.oneOf([Yup.ref(f.sameAs)], labels.mustMatch);
  if (f.pattern) {
    s = s.matches(new RegExp(f.pattern), {
      message: labels.invalidPattern,
      excludeEmptyString: true,
    });
  }
  return { [f.name]: required(s, f, labels) };
};

const single = (f: FieldSchema, fallback: unknown = '') => ({
  [f.name]: f.defaultValue ?? fallback,
});

const textLike = (
  extra?: (s: Yup.StringSchema, labels: ArtisanLabels) => Yup.StringSchema,
): Pick<FieldDefinition, 'initialValues' | 'rules'> => ({
  initialValues: (f) => single(f),
  rules: (f, labels) =>
    stringRules(f, labels, extra && ((s) => extra(s, labels))),
});

const firstOption = (f: FieldSchema) =>
  (f.defaultValue as string | undefined) ?? f.options?.[0]?.value ?? '';

const fileDefinition = (image: boolean): FieldDefinition => ({
  initialValues: (f) => single(f, []),
  rules: (f, labels) => {
    let a = Yup.array();
    if (f.maxFiles) {
      const max = f.maxFiles;
      a = a.max(max, labels.tooManyFiles(max));
    }
    const min = f.minFiles ?? (f.required ? 1 : 0);
    if (min > 0)
      a = a.min(min, f.minFiles ? labels.minFiles(min) : labels.required);
    return { [f.name]: a };
  },
  render: (f, { labels, storage }) => (
    <FileUpload
      {...textProps(f)}
      storage={storage[f.storage ?? 'default'] ?? Object.values(storage)[0]}
      accept={f.accept ?? (image ? 'image/*' : undefined)}
      maxSize={f.maxSize}
      maxFiles={f.maxFiles}
      capture={f.capture}
      preview={image}
      labels={labels}
    />
  ),
});

const dateLike = (
  type: 'date' | 'time' | 'datetime-local' | 'month',
): FieldDefinition => ({
  initialValues: (f) => single(f),
  rules: (f, labels) =>
    stringRules(f, labels, (s) => {
      const { minDate, maxDate } = f;
      let d = s;
      if (minDate) {
        d = d.test(
          'minDate',
          labels.minDate(minDate),
          (v) => !v || v >= minDate,
        );
      }
      if (maxDate) {
        d = d.test(
          'maxDate',
          labels.maxDate(maxDate),
          (v) => !v || v <= maxDate,
        );
      }
      return d;
    }),
  render: (f) => (
    <DateInput
      {...textProps(f)}
      type={type}
      inputProps={{ min: f.minDate, max: f.maxDate, ...nativeProps(f) }}
    />
  ),
});

/** Display-only content: owns no form values. */
const content = (render: FieldDefinition['render']): FieldDefinition => ({
  initialValues: () => ({}),
  rules: () => ({}),
  render,
});

const optionsOf = (f: FieldSchema) => f.options ?? [];

const arrayDefinition: FieldDefinition = {
  secret: (f, registry) =>
    (f.itemFields ?? []).some((sub) => {
      const secret = definitionOf(registry, sub).secret;
      return typeof secret === 'function' ? secret(sub, registry) : !!secret;
    }),
  initialValues: (f) => ({
    [f.name]: f.defaultValue ?? [],
  }),
  rules: (f, labels, registry = defaultFieldRegistry) => {
    const shape: Record<string, Yup.AnySchema> = {};
    for (const sub of f.itemFields ?? []) {
      Object.assign(
        shape,
        definitionOf(registry, sub).rules(sub, labels, registry),
      );
    }
    let a = Yup.array().of(Yup.object(shape));
    if (f.minItems) a = a.min(f.minItems, labels.minItems(f.minItems));
    if (f.maxItems) a = a.max(f.maxItems, labels.maxItems(f.maxItems));
    return { [f.name]: a };
  },
  render: (f, ctx) => {
    const sub = f.itemFields ?? [];
    const rowOf = () =>
      Object.assign(
        {},
        ...sub.map((s) => definitionOf(ctx.registry, s).initialValues(s)),
      );
    return (
      <ArrayField
        name={f.name}
        label={f.label}
        emptyRow={rowOf}
        minItems={f.minItems}
        maxItems={f.maxItems}
        addLabel={f.addLabel}
        disabled={f.disabled}
        helperText={f.helperText}
        labels={ctx.labels}
        renderRow={(i) =>
          sub.map((s) => {
            const path = `${f.name}.${i}.${s.name}`;
            const row = { ...s, name: path };
            // Renamed copies keep every other prop; dependent names follow the row.
            if (s.dependentName)
              row.dependentName = `${f.name}.${i}.${s.dependentName}`;
            if (s.endName) row.endName = `${f.name}.${i}.${s.endName}`;
            const def = definitionOf(ctx.registry, s);
            return (
              <div key={path} className={ctx.cx('arrayRow')}>
                {def.groupLabel &&
                  !wrapperOwnsLabel(ctx.components, s) &&
                  (def.labelFor ? (
                    <label htmlFor={path} className={ctx.cx('groupLabel')}>
                      {s.label}
                    </label>
                  ) : (
                    <span className={ctx.cx('groupLabel')}>{s.label}</span>
                  ))}
                {renderField(def, row, ctx)}
              </div>
            );
          })
        }
      />
    );
  },
};

export const defaultFieldRegistry: FieldRegistry = {
  array: arrayDefinition,
  heading: content((f, ctx) => (
    <h3 className={ctx.cx('heading')}>{f.label}</h3>
  )),
  paragraph: content((f, ctx) => (
    <p className={ctx.cx('paragraph')}>{f.label}</p>
  )),
  callout: content((f, ctx) => (
    <p
      role={f.variant === 'error' || f.variant === 'warning' ? 'alert' : 'note'}
      className={ctx.cx('callout')}
      data-variant={f.variant ?? 'info'}
    >
      {f.label}
    </p>
  )),
  divider: content((_, ctx) => <hr className={ctx.cx('divider')} />),
  time: dateLike('time'),
  datetime: dateLike('datetime-local'),
  month: dateLike('month'),
  daterange: {
    initialValues: (f) => ({
      [f.name]: f.defaultValue ?? '',
      [f.endName ?? `${f.name}End`]: '',
    }),
    rules: (f, labels) => {
      const end = f.endName ?? `${f.name}End`;
      const start = stringRules(f, labels)[f.name];
      return {
        [f.name]: start,
        [end]: required(
          Yup.string().test(
            'range',
            labels.endBeforeStart,
            (v, ctx) => !v || !ctx.parent[f.name] || v >= ctx.parent[f.name],
          ),
          f,
          labels,
        ),
      };
    },
    render: (f, { labels, cx }) => {
      const end = f.endName ?? `${f.name}End`;
      return (
        <div className={cx('dateRange')}>
          <DateInput
            {...textProps(f)}
            inputProps={{ min: f.minDate, max: f.maxDate }}
          />
          <DateInput
            {...textProps(f)}
            id={end}
            name={end}
            label={f.endLabel ?? labels.dateTo}
            inputProps={{ min: f.minDate, max: f.maxDate }}
          />
        </div>
      );
    },
  },
  range: {
    initialValues: (f) => ({ [f.name]: f.defaultValue ?? f.min ?? 0 }),
    rules: (f, labels) => {
      let n = Yup.number().typeError(labels.invalidNumber);
      if (f.min !== undefined) n = n.min(f.min, labels.minValue(f.min));
      if (f.max !== undefined) n = n.max(f.max, labels.maxValue(f.max));
      return { [f.name]: n };
    },
    render: (f) => (
      <Range
        {...textProps(f)}
        min={f.min}
        max={f.max}
        step={Number(f.step) || 1}
      />
    ),
  },
  rating: {
    initialValues: (f) => single(f),
    rules: (f, labels) => ({
      [f.name]: required(
        Yup.number().transform((v, o) => (o === '' ? undefined : v)),
        f,
        labels,
      ),
    }),
    render: (f) => <Rating {...textProps(f)} max={f.length} />,
  },
  otp: {
    initialValues: (f) => single(f),
    rules: (f, labels) => {
      const length = f.length ?? 6;
      const s = Yup.string().test(
        'otp',
        labels.minLength(length),
        (v) => !v || v.length === length,
      );
      return { [f.name]: required(s, f, labels) };
    },
    render: (f) => (
      <Otp {...textProps(f)} length={f.length} charset={f.charset} />
    ),
  },
  combobox: {
    groupLabel: false,
    initialValues: (f) => single(f),
    rules: (f, labels) => stringRules(f, labels),
    render: (f, { labels }) => (
      <Combobox
        {...textProps(f)}
        options={optionsOf(f)}
        loadOptions={f.loadOptions}
        labels={labels}
      />
    ),
  },
  multiselect: {
    initialValues: (f) => single(f, []),
    rules: (f, labels) => {
      const s = Yup.array().of(Yup.string().required());
      return { [f.name]: f.required ? s.min(1, labels.required) : s };
    },
    render: (f, { labels }) => (
      <Combobox
        {...textProps(f)}
        multiple
        options={optionsOf(f)}
        loadOptions={f.loadOptions}
        labels={labels}
      />
    ),
  },
  text: {
    ...textLike(),
    render: (f) => (
      <Text
        {...textProps(f)}
        {...adornments(f)}
        type="text"
        inputProps={nativeProps(f)}
      />
    ),
  },
  tel: {
    ...textLike((s, labels) =>
      s.matches(/^[+()\d\s.-]{6,}$/, {
        message: labels.invalidPhone,
        excludeEmptyString: true,
      }),
    ),
    render: (f) => (
      <Text
        {...textProps(f)}
        type="tel"
        inputProps={{
          autoComplete: 'tel',
          inputMode: 'tel',
          ...nativeProps(f),
        }}
      />
    ),
  },
  url: {
    ...textLike((s, labels) => s.url(labels.invalidUrl)),
    render: (f) => (
      <Text
        {...textProps(f)}
        type="url"
        inputProps={{
          autoComplete: 'url',
          inputMode: 'url',
          ...nativeProps(f),
        }}
      />
    ),
  },
  checkbox: {
    initialValues: (f) => ({ [f.name]: f.defaultValue ?? false }),
    rules: (f, labels) => ({
      [f.name]: f.required
        ? Yup.boolean().oneOf([true], labels.required)
        : Yup.boolean(),
    }),
    render: (f) => <Checkbox {...textProps(f)} variant="checkbox" />,
  },
  switch: {
    initialValues: (f) => ({ [f.name]: f.defaultValue ?? false }),
    rules: (f, labels) => ({
      [f.name]: f.required
        ? Yup.boolean().oneOf([true], labels.required)
        : Yup.boolean(),
    }),
    render: (f) => <Checkbox {...textProps(f)} variant="switch" />,
  },
  email: {
    ...textLike((s, labels) => s.email(labels.invalidEmail)),
    render: (f) => (
      <Text
        {...textProps(f)}
        type="email"
        inputProps={{ autoComplete: 'email', ...nativeProps(f) }}
      />
    ),
  },
  number: {
    initialValues: (f) => single(f),
    rules: (f, labels) => {
      let n = Yup.number()
        .transform((v, original) => (original === '' ? undefined : v))
        .typeError(labels.invalidNumber);
      if (f.min !== undefined) n = n.min(f.min, labels.minValue(f.min));
      if (f.max !== undefined) n = n.max(f.max, labels.maxValue(f.max));
      return { [f.name]: required(n, f, labels) };
    },
    render: (f) => (
      <Text
        {...textProps(f)}
        {...adornments(f)}
        type="number"
        inputProps={{
          inputMode: 'decimal',
          min: f.min,
          max: f.max,
          step: f.step,
          ...nativeProps(f),
        }}
      />
    ),
  },
  textarea: {
    ...textLike(),
    render: (f) => <Textarea {...textProps(f)} inputProps={nativeProps(f)} />,
  },
  password: {
    ...textLike(),
    secret: true,
    render: (f) => (
      <Password
        {...textProps(f)}
        inputProps={{ autoComplete: 'current-password', ...nativeProps(f) }}
      />
    ),
  },
  file: fileDefinition(false),
  image: fileDefinition(true),
  date: dateLike('date'),
  select: {
    groupLabel: true,
    labelFor: true,
    initialValues: (f) => ({ [f.name]: firstOption(f) }),
    rules: (f, labels) => stringRules(f, labels),
    render: (f) => <Select {...choiceProps(f)} />,
  },
  dynamicSelect: {
    groupLabel: true,
    initialValues: (f) => {
      const first = firstOption(f);
      const values: Record<string, unknown> = { [f.name]: first };
      if (f.dependentName) {
        values[f.dependentName] = f.dependentOptions?.[first]?.[0]?.value ?? '';
      }
      return values;
    },
    rules: (f, labels) => {
      const rule = stringRules(f, labels)[f.name];
      return f.dependentName
        ? { [f.name]: rule, [f.dependentName]: rule }
        : { [f.name]: rule };
    },
    render: (f, { labels }) => (
      <DynamicSelect
        {...choiceProps(f)}
        dependentName={f.dependentName ?? `${f.name}Dependent`}
        dependentOptions={f.dependentOptions}
        loadDependentOptions={f.loadDependentOptions}
        loadingText={labels.loadingOptions}
        errorText={labels.loadOptionsError}
      />
    ),
  },
  check: {
    groupLabel: true,
    initialValues: (f) => single(f, []),
    rules: (f, labels) => {
      const s = Yup.array().of(Yup.string().required());
      return { [f.name]: f.required ? s.min(1, labels.required) : s };
    },
    render: (f) => <Check {...choiceProps(f)} label={f.label} />,
  },
  radio: {
    groupLabel: true,
    initialValues: (f) => single(f),
    rules: (f, labels) => stringRules(f, labels),
    render: (f) => <Radio {...choiceProps(f)} label={f.label} />,
  },
};

const unknownField: FieldDefinition = {
  initialValues: (f) => single(f),
  rules: () => ({}),
  render: (f) => (
    <p role="alert" className="af-error">
      {`Unknown field type "${f.type}"`}
    </p>
  ),
};

/** Whether a field's value must never be persisted or echoed (passwords…). */
export const isSecretField = (
  registry: FieldRegistry,
  field: FieldSchema,
): boolean => {
  const secret = definitionOf(registry, field).secret;
  return typeof secret === 'function' ? secret(field, registry) : !!secret;
};

export const definitionOf = (
  registry: FieldRegistry,
  field: FieldSchema,
): FieldDefinition => registry[field.type] ?? unknownField;
