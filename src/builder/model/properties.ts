import {
  FIELD_KEYS,
  type NativeFieldType,
  type NativeStepType,
  STEP_KEYS,
} from '../../schema';
import type { Level, PropertyDescriptor, Section } from './types';

type FieldKey = (typeof FIELD_KEYS)[NativeFieldType][number];
type StepKey = (typeof STEP_KEYS)[NativeStepType][number];

/** Left to the canvas or the palette: it is not edited as a property. */
const MANAGED = 'managed' as const;
type Entry = readonly PropertyDescriptor[] | typeof MANAGED;

const p = (
  path: string,
  label: string,
  control: PropertyDescriptor['control'],
  level: Level,
  section: Section,
  extra: Partial<PropertyDescriptor> = {},
): PropertyDescriptor => ({ path, label, control, level, section, ...extra });

/**
 * How each field key is edited. The `satisfies` makes adding a key to the
 * contract (`FIELD_KEYS`) without deciding how it is edited a compile error.
 * `validation` depends on the type, see {@link validationFor}.
 */
const FIELD_KEY_ENTRIES = {
  type: MANAGED,
  id: [p('id', 'Id', 'text', 'developer', 'advanced')],
  name: [
    p('name', 'Name', 'text', 'simple', 'general', {
      help: 'The key this answer is saved under',
    }),
  ],
  label: [p('label', 'Label', 'text', 'simple', 'general')],
  description: [p('description', 'Help text', 'textarea', 'simple', 'general')],
  required: [p('required', 'Required', 'boolean', 'simple', 'general')],
  disabled: [p('disabled', 'Disabled', 'boolean', 'advanced', 'general')],
  defaultValue: [
    p('defaultValue', 'Default value', 'json', 'advanced', 'data'),
  ],
  sensitive: [
    p('sensitive', 'Sensitive data', 'boolean', 'advanced', 'data', {
      help: 'Marks personal or confidential answers',
    }),
  ],
  visibleWhen: [
    p('visibleWhen', 'Show only when', 'condition', 'advanced', 'flow'),
  ],
  ui: [p('ui.span', 'Width', 'enum', 'simple', 'layout', { options: [1, 2] })],
  placeholder: [p('placeholder', 'Placeholder', 'text', 'simple', 'general')],
  mask: [p('mask', 'Input mask', 'text', 'advanced', 'general')],
  prefix: [p('prefix', 'Prefix', 'text', 'advanced', 'general')],
  suffix: [p('suffix', 'Suffix', 'text', 'advanced', 'general')],
  autoComplete: [
    p('autoComplete', 'Autocomplete', 'text', 'advanced', 'advanced'),
  ],
  inputMode: [
    p('inputMode', 'Keyboard', 'enum', 'advanced', 'advanced', {
      options: [
        'none',
        'text',
        'tel',
        'url',
        'email',
        'numeric',
        'decimal',
        'search',
      ],
    }),
  ],
  readOnly: [p('readOnly', 'Read only', 'boolean', 'advanced', 'general')],
  maxLength: [
    p('maxLength', 'Max characters', 'number', 'advanced', 'validation', {
      min: 0,
    }),
  ],
  validation: MANAGED, // expanded per type by validationFor
  step: [p('step', 'Step size', 'number', 'advanced', 'general')],
  length: [p('length', 'Length', 'number', 'simple', 'general', { min: 1 })],
  charset: [
    p('charset', 'Characters', 'enum', 'simple', 'general', {
      options: ['numeric', 'alphanumeric'],
    }),
  ],
  endName: [p('endName', 'End name', 'text', 'advanced', 'data')],
  endLabel: [p('endLabel', 'End label', 'text', 'simple', 'general')],
  options: [p('options', 'Options', 'options', 'simple', 'data')],
  optionsSource: [
    p('optionsSource', 'Options source', 'ref', 'developer', 'data', {
      ref: 'options',
    }),
  ],
  dependentName: [
    p('dependentName', 'Second value name', 'text', 'advanced', 'data'),
  ],
  dependentOptions: [
    p(
      'dependentOptions',
      'Options by parent',
      'optionsMap',
      'advanced',
      'data',
    ),
  ],
  dependentOptionsSource: [
    p(
      'dependentOptionsSource',
      'Dependent options source',
      'ref',
      'developer',
      'data',
      {
        ref: 'dependentOptions',
      },
    ),
  ],
  accept: [p('accept', 'Accepted types', 'text', 'advanced', 'general')],
  storage: [
    p('storage', 'Storage', 'ref', 'developer', 'data', { ref: 'storage' }),
  ],
  capture: [
    p('capture', 'Camera', 'enum', 'advanced', 'general', {
      options: ['user', 'environment'],
    }),
  ],
  itemFields: MANAGED, // the rows are edited on the canvas
  addLabel: [p('addLabel', 'Add button text', 'text', 'simple', 'general')],
  text: [p('text', 'Text', 'textarea', 'simple', 'general')],
  variant: [p('variant', 'Variant', 'text', 'advanced', 'layout')],
} as const satisfies Record<FieldKey, Entry>;

/** The same for step keys. */
const STEP_KEY_ENTRIES = {
  type: MANAGED,
  id: [p('id', 'Id', 'text', 'developer', 'advanced')],
  title: [p('title', 'Title', 'text', 'simple', 'general')],
  visibleWhen: [
    p('visibleWhen', 'Show only when', 'condition', 'advanced', 'flow'),
  ],
  ui: [
    p('ui.columns', 'Columns', 'enum', 'simple', 'layout', { options: [1, 2] }),
  ],
  controls: [
    p('controls.nextLabel', 'Next button text', 'text', 'simple', 'layout'),
    p('controls.previousLabel', 'Back button text', 'text', 'simple', 'layout'),
    p('controls.hidden', 'Hide the buttons', 'boolean', 'advanced', 'layout'),
    p('controls.hidePrevious', 'Hide Back', 'boolean', 'advanced', 'layout'),
    p('controls.hideNext', 'Hide Next', 'boolean', 'advanced', 'layout'),
    p('controls.nextDisabled', 'Disable Next', 'boolean', 'advanced', 'layout'),
  ],
  hooks: [
    p('hooks.beforeNext', 'Before leaving', 'ref', 'developer', 'advanced', {
      ref: 'hooks',
    }),
    p('hooks.onEnter', 'On entering', 'ref', 'developer', 'advanced', {
      ref: 'hooks',
    }),
  ],
  next: [p('next', 'Next steps', 'transitions', 'advanced', 'flow')],
  loop: [
    p('loop.max', 'Times it can repeat', 'number', 'advanced', 'flow', {
      min: 1,
      max: 1000,
    }),
  ],
  revisit: [
    p('revisit', 'Going back', 'enum', 'advanced', 'flow', {
      options: ['allow', 'deny'],
    }),
  ],
  fields: MANAGED,
  providers: [
    p('providers', 'Payment methods', 'refs', 'developer', 'data', {
      ref: 'paymentProviders',
    }),
  ],
  resultName: [p('resultName', 'Result name', 'text', 'advanced', 'data')],
  summary: [p('summary', 'Summary', 'textarea', 'simple', 'general')],
  strategy: [
    p('strategy', 'Waiting strategy', 'ref', 'developer', 'data', {
      ref: 'waits',
    }),
  ],
  message: [p('message', 'Message', 'textarea', 'simple', 'general')],
  failTo: [p('failTo', 'On failure go to', 'step', 'advanced', 'flow')],
  timeoutMs: [
    p('timeoutMs', 'Timeout (ms)', 'number', 'advanced', 'flow', {
      min: 1,
      max: 3_600_000,
    }),
  ],
  retry: [
    p('retry.max', 'Retries', 'number', 'advanced', 'flow', {
      min: 1,
      max: 10,
    }),
    p('retry.backoffMs', 'Retry delay (ms)', 'number', 'advanced', 'flow', {
      min: 0,
      max: 60_000,
    }),
  ],
  cancellable: [
    p('cancellable', 'Can be cancelled', 'boolean', 'advanced', 'flow'),
  ],
  content: [p('content', 'Content', 'textarea', 'simple', 'general')],
  href: [p('href', 'Full document link', 'text', 'advanced', 'general')],
  accept: [
    p('accept.label', 'Acceptance text', 'text', 'simple', 'general'),
    p('accept.name', 'Acceptance name', 'text', 'advanced', 'data'),
  ],
  errorMessage: [
    p('errorMessage', 'Error message', 'textarea', 'simple', 'general'),
  ],
  actions: [p('actions', 'Buttons', 'actions', 'simple', 'general')],
  renderer: [
    p('renderer', 'Renderer', 'ref', 'developer', 'data', { ref: 'renderers' }),
  ],
  config: [p('config', 'Settings (JSON)', 'json', 'developer', 'advanced')],
} as const satisfies Record<StepKey, Entry>;

const TEXT_TYPES: readonly NativeFieldType[] = [
  'text',
  'email',
  'tel',
  'url',
  'password',
  'textarea',
];
const NUMBER_TYPES: readonly NativeFieldType[] = ['number', 'range'];
const DATE_TYPES: readonly NativeFieldType[] = [
  'date',
  'time',
  'datetime',
  'month',
  'daterange',
];

/** The `validation` properties a type accepts (what the parser allows under `validation`). */
export const validationFor = (type: NativeFieldType): PropertyDescriptor[] => {
  const v = (
    key: string,
    label: string,
    control: PropertyDescriptor['control'],
    extra: Partial<PropertyDescriptor> = {},
  ) => p(`validation.${key}`, label, control, 'simple', 'validation', extra);
  if (TEXT_TYPES.includes(type))
    return [
      v('minLength', 'Min characters', 'number', { min: 0 }),
      v('maxLength', 'Max characters', 'number', { min: 0 }),
      v('pattern', 'Pattern (regular expression)', 'text', {
        help: 'At most 500 characters',
      }),
      v('sameAs', 'Must match the field', 'text'),
    ];
  if (NUMBER_TYPES.includes(type))
    return [v('min', 'Minimum', 'number'), v('max', 'Maximum', 'number')];
  if (DATE_TYPES.includes(type))
    return [v('min', 'Earliest', 'text'), v('max', 'Latest', 'text')];
  if (type === 'array')
    return [
      v('minItems', 'Min rows', 'number', { min: 0 }),
      v('maxItems', 'Max rows', 'number', { min: 0 }),
    ];
  if (type === 'file' || type === 'image')
    return [
      v('maxSize', 'Max size (bytes)', 'number', { min: 0 }),
      v('minFiles', 'Min files', 'number', { min: 0 }),
      v('maxFiles', 'Max files', 'number', { min: 0 }),
    ];
  return [];
};

/** The properties the inspector offers for a field type, in the order of its keys. */
export const fieldProperties = (type: NativeFieldType): PropertyDescriptor[] =>
  FIELD_KEYS[type].flatMap((key): PropertyDescriptor[] => {
    if (key === 'validation') return validationFor(type);
    if (key === 'variant' && type === 'callout')
      return [
        p('variant', 'Style', 'enum', 'simple', 'general', {
          options: ['info', 'success', 'warning', 'error'],
        }),
      ];
    const entry: Entry = FIELD_KEY_ENTRIES[key];
    return entry === MANAGED ? [] : [...entry];
  });

/** The properties the inspector offers for a step type. */
export const stepProperties = (type: NativeStepType): PropertyDescriptor[] =>
  STEP_KEYS[type].flatMap((key): PropertyDescriptor[] => {
    const entry: Entry = STEP_KEY_ENTRIES[key];
    return entry === MANAGED ? [] : [...entry];
  });

/** Keys handled by the canvas or the palette, not by a control (for the drift test). */
export const MANAGED_FIELD_KEYS = (
  Object.entries(FIELD_KEY_ENTRIES) as [FieldKey, Entry][]
)
  .filter(([, e]) => e === MANAGED)
  .map(([k]) => k);
export const MANAGED_STEP_KEYS = (
  Object.entries(STEP_KEY_ENTRIES) as [StepKey, Entry][]
)
  .filter(([, e]) => e === MANAGED)
  .map(([k]) => k);
