import type { NativeFieldType, NativeStepType } from '../../schema';
import type { DefaultsContext, Level, PaletteCategory } from './types';

export interface FieldEntry {
  /** English default; the UI can translate it. */
  label: string;
  category: PaletteCategory;
  /** `simple` types are offered to everyone; `advanced` ones in the advanced mode. */
  level: Level;
  /** Base of the generated name (`text`, `text2`…). */
  baseName: string;
  /** May it be a row of an `array` (rows are flat). */
  inArray: boolean;
  /** Properties beyond `type`, `name` and the label that make a new field valid and useful. */
  defaults: (ctx: DefaultsContext) => Record<string, unknown>;
}

const options = () => [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];
const none = () => ({});

/**
 * Every native field type as the palette shows it. The `satisfies` makes a new
 * type in the contract a compile error until it has an entry here.
 */
export const FIELD_CATALOG = {
  text: {
    label: 'Text',
    category: 'text',
    level: 'simple',
    baseName: 'text',
    inArray: true,
    defaults: none,
  },
  email: {
    label: 'Email',
    category: 'text',
    level: 'simple',
    baseName: 'email',
    inArray: true,
    defaults: none,
  },
  tel: {
    label: 'Phone',
    category: 'text',
    level: 'simple',
    baseName: 'phone',
    inArray: true,
    defaults: none,
  },
  url: {
    label: 'Link',
    category: 'text',
    level: 'simple',
    baseName: 'url',
    inArray: true,
    defaults: none,
  },
  password: {
    label: 'Password',
    category: 'text',
    level: 'advanced',
    baseName: 'password',
    inArray: true,
    defaults: none,
  },
  textarea: {
    label: 'Long text',
    category: 'text',
    level: 'simple',
    baseName: 'message',
    inArray: true,
    defaults: none,
  },
  number: {
    label: 'Number',
    category: 'number',
    level: 'simple',
    baseName: 'number',
    inArray: true,
    defaults: none,
  },
  range: {
    label: 'Slider',
    category: 'number',
    level: 'advanced',
    baseName: 'range',
    inArray: true,
    defaults: () => ({ validation: { min: 0, max: 100 } }),
  },
  rating: {
    label: 'Rating',
    category: 'number',
    level: 'simple',
    baseName: 'rating',
    inArray: true,
    defaults: () => ({ length: 5 }),
  },
  otp: {
    label: 'Code',
    category: 'number',
    level: 'advanced',
    baseName: 'code',
    inArray: true,
    defaults: () => ({ length: 6 }),
  },
  date: {
    label: 'Date',
    category: 'datetime',
    level: 'simple',
    baseName: 'date',
    inArray: true,
    defaults: none,
  },
  time: {
    label: 'Time',
    category: 'datetime',
    level: 'simple',
    baseName: 'time',
    inArray: true,
    defaults: none,
  },
  datetime: {
    label: 'Date and time',
    category: 'datetime',
    level: 'simple',
    baseName: 'datetime',
    inArray: true,
    defaults: none,
  },
  month: {
    label: 'Month',
    category: 'datetime',
    level: 'advanced',
    baseName: 'month',
    inArray: true,
    defaults: none,
  },
  daterange: {
    label: 'Date range',
    category: 'datetime',
    level: 'simple',
    baseName: 'dates',
    inArray: true,
    defaults: () => ({ endLabel: 'To' }),
  },
  select: {
    label: 'Dropdown',
    category: 'choice',
    level: 'simple',
    baseName: 'choice',
    inArray: true,
    defaults: () => ({ options: options() }),
  },
  radio: {
    label: 'Single choice',
    category: 'choice',
    level: 'simple',
    baseName: 'option',
    inArray: true,
    defaults: () => ({ options: options() }),
  },
  check: {
    label: 'Checkboxes',
    category: 'choice',
    level: 'simple',
    baseName: 'choices',
    inArray: true,
    defaults: () => ({ options: options() }),
  },
  combobox: {
    label: 'Search and pick',
    category: 'choice',
    level: 'advanced',
    baseName: 'search',
    inArray: true,
    defaults: () => ({ options: options() }),
  },
  multiselect: {
    label: 'Multiple choice',
    category: 'choice',
    level: 'simple',
    baseName: 'selection',
    inArray: true,
    defaults: () => ({ options: options() }),
  },
  dynamicSelect: {
    label: 'Linked dropdowns',
    category: 'choice',
    level: 'advanced',
    baseName: 'group',
    inArray: true,
    defaults: () => ({
      options: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
      ],
      dependentOptions: {
        option1: [{ value: 'a', label: 'A' }],
        option2: [{ value: 'b', label: 'B' }],
      },
    }),
  },
  checkbox: {
    label: 'Checkbox',
    category: 'boolean',
    level: 'simple',
    baseName: 'agree',
    inArray: true,
    defaults: none,
  },
  switch: {
    label: 'Switch',
    category: 'boolean',
    level: 'simple',
    baseName: 'enabled',
    inArray: true,
    defaults: none,
  },
  file: {
    label: 'File upload',
    category: 'file',
    level: 'simple',
    baseName: 'file',
    inArray: true,
    defaults: none,
  },
  image: {
    label: 'Image upload',
    category: 'file',
    level: 'simple',
    baseName: 'image',
    inArray: true,
    defaults: none,
  },
  array: {
    label: 'Repeating group',
    category: 'structure',
    level: 'simple',
    baseName: 'items',
    inArray: false,
    defaults: () => ({
      addLabel: 'Add another',
      itemFields: [{ type: 'text', name: 'item', label: 'Item' }],
    }),
  },
  heading: {
    label: 'Heading',
    category: 'content',
    level: 'simple',
    baseName: 'heading',
    inArray: false,
    defaults: () => ({ text: 'Section title' }),
  },
  paragraph: {
    label: 'Paragraph',
    category: 'content',
    level: 'simple',
    baseName: 'paragraph',
    inArray: false,
    defaults: () => ({ text: 'Write your text here.' }),
  },
  callout: {
    label: 'Notice',
    category: 'content',
    level: 'simple',
    baseName: 'notice',
    inArray: false,
    defaults: () => ({ text: 'Something worth knowing.', variant: 'info' }),
  },
  divider: {
    label: 'Divider',
    category: 'content',
    level: 'simple',
    baseName: 'divider',
    inArray: false,
    defaults: none,
  },
} as const satisfies Record<NativeFieldType, FieldEntry>;

export interface StepEntry {
  label: string;
  description: string;
  level: Level;
  /** Properties beyond `type`, `id` and `title`; `refs` are the ids the app registered. */
  defaults: (ctx: DefaultsContext) => Record<string, unknown>;
}

/** Every native step type, as the "add a step" menu shows it. */
export const STEP_CATALOG = {
  form: {
    label: 'Form',
    description: 'A page with fields',
    level: 'simple',
    defaults: () => ({ fields: [] }),
  },
  terms: {
    label: 'Terms',
    description: 'Text the person must accept',
    level: 'simple',
    defaults: () => ({
      content: 'Write the terms here.',
      accept: { label: 'I accept the terms' },
    }),
  },
  review: {
    label: 'Review',
    description: 'Shows the answers before sending',
    level: 'simple',
    defaults: none,
  },
  result: {
    label: 'Result',
    description: 'The thank-you page',
    level: 'simple',
    defaults: () => ({ message: 'Thank you!' }),
  },
  payment: {
    label: 'Payment',
    description: 'Charges through a payment method',
    level: 'developer',
    defaults: (ctx) => ({
      providers: [ctx.refs?.paymentProviders?.[0] ?? 'provider'],
    }),
  },
  wait: {
    label: 'Waiting',
    description: 'Waits for a confirmation',
    level: 'developer',
    defaults: (ctx) => ({
      strategy: ctx.refs?.waits?.[0] ?? 'strategy',
      message: 'Waiting for confirmation…',
    }),
  },
  custom: {
    label: 'Custom',
    description: 'A step your app renders',
    level: 'developer',
    defaults: (ctx) => ({ renderer: ctx.refs?.renderers?.[0] ?? 'renderer' }),
  },
} as const satisfies Record<NativeStepType, StepEntry>;

/** Palette categories in display order. */
export const PALETTE_CATEGORIES: readonly {
  id: PaletteCategory;
  label: string;
}[] = [
  { id: 'text', label: 'Text' },
  { id: 'number', label: 'Numbers' },
  { id: 'datetime', label: 'Date and time' },
  { id: 'choice', label: 'Choices' },
  { id: 'boolean', label: 'Yes / no' },
  { id: 'file', label: 'Files' },
  { id: 'structure', label: 'Structure' },
  { id: 'content', label: 'Content' },
];

const CONTENT: readonly NativeFieldType[] = [
  'heading',
  'paragraph',
  'callout',
  'divider',
];
export const isContentType = (type: string): boolean =>
  (CONTENT as readonly string[]).includes(type);
