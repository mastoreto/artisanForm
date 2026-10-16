import type { ReactNode } from 'react';
import * as Yup from 'yup';
import type { ArtisanLabels } from '../../commons/labels';
import type { StorageMap } from '../../storage/types';
import Check from '../ArtisanInputs/Check/Check';
import Checkbox from '../ArtisanInputs/Checkbox/Checkbox';
import DateInput from '../ArtisanInputs/Date/Date';
import DynamicSelect from '../ArtisanInputs/DynamicSelect/DynamicSelect';
import FileUpload from '../ArtisanInputs/FileUpload/FileUpload';
import Password from '../ArtisanInputs/Password/Password';
import Radio from '../ArtisanInputs/Radio/Radio';
import Select from '../ArtisanInputs/Select/Select';
import Text from '../ArtisanInputs/Text/Text';
import Textarea from '../ArtisanInputs/Textarea/Textarea';
import type { FieldSchema } from './types';

export interface FieldContext {
  labels: ArtisanLabels;
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
  ) => Record<string, Yup.AnySchema>;
  /** The wrapper renders the label (group-like fields without a native one). */
  groupLabel?: boolean;
  /** Never written to drafts (e.g. passwords). */
  secret?: boolean;
}

export type FieldRegistry = Record<string, FieldDefinition>;

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

export const defaultFieldRegistry: FieldRegistry = {
  text: {
    ...textLike(),
    render: (f) => (
      <Text {...textProps(f)} type="text" inputProps={nativeProps(f)} />
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
  date: {
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
        inputProps={{ min: f.minDate, max: f.maxDate, ...nativeProps(f) }}
      />
    ),
  },
  select: {
    groupLabel: true,
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
    <p role="alert" className="text-sm text-red-600">
      {`Unknown field type "${f.type}"`}
    </p>
  ),
};

export const definitionOf = (
  registry: FieldRegistry,
  field: FieldSchema,
): FieldDefinition => registry[field.type] ?? unknownField;
