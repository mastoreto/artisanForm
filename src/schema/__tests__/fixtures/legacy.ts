import { polling } from '../../../integrations/wait';
import type { LegacyFormSchema } from '../../legacy/adapter';

/**
 * 0.2.0 schemas mirroring the playground scenarios. They are the regression
 * fixtures for the legacy adapter: real shapes, real props.
 */
const countries = [
  { value: 'ar', label: 'Argentina' },
  { value: 'au', label: 'Australia' },
  { value: 'cl', label: 'Chile' },
  { value: 'uy', label: 'Uruguay' },
];

export const wizard: LegacyFormSchema = {
  steps: [
    {
      title: 'Personal data',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true, min: 3 },
        { type: 'email', name: 'email', label: 'Email', required: true },
        { type: 'date', name: 'birth', label: 'Birth date' },
      ],
    },
    {
      title: 'Location',
      fields: [
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          label: 'Country and city',
          options: [
            { value: 'ar', label: 'Argentina' },
            { value: 'cl', label: 'Chile' },
          ],
          dependentOptions: {
            ar: [{ value: 'bsas', label: 'Buenos Aires' }],
            cl: [{ value: 'scl', label: 'Santiago' }],
          },
        },
        {
          type: 'radio',
          name: 'plan',
          label: 'Plan',
          required: true,
          options: [
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
          ],
        },
      ],
    },
  ],
};

export const fields: LegacyFormSchema = {
  steps: [
    {
      title: 'All fields',
      fields: [
        { type: 'heading', name: 'h1', label: 'Basic data' },
        {
          type: 'text',
          name: 'name',
          label: 'Name',
          width: 'half',
          required: true,
        },
        { type: 'tel', name: 'phone', label: 'Phone', width: 'half' },
        { type: 'text', name: 'taxId', label: 'Tax ID', mask: '##-########-#' },
        {
          type: 'number',
          name: 'price',
          label: 'Budget',
          prefix: '$',
          min: 0,
          max: 1000,
          step: '0.5',
        },
        { type: 'divider', name: 'd1', label: '' },
        {
          type: 'callout',
          name: 'c1',
          label: 'Fields marked * are required',
          variant: 'info',
        },
        {
          type: 'combobox',
          name: 'country',
          label: 'Country',
          options: countries,
        },
        {
          type: 'multiselect',
          name: 'visited',
          label: 'Visited countries',
          options: countries,
        },
        {
          type: 'daterange',
          name: 'from',
          endName: 'to',
          label: 'Trip from',
          minDate: '2030-01-01',
        },
        { type: 'time', name: 'time', label: 'Contact time' },
        { type: 'range', name: 'level', label: 'Level', min: 0, max: 10 },
        { type: 'rating', name: 'stars', label: 'Rating' },
        { type: 'otp', name: 'code', label: 'Code', length: 4 },
        {
          type: 'switch',
          name: 'news',
          label: 'Receive news',
          helperText: 'Once a month',
        },
        {
          type: 'password',
          name: 'pw',
          label: 'Password',
          min: 8,
          pattern: '^\\S+$',
        },
        {
          type: 'password',
          name: 'pw2',
          label: 'Repeat password',
          sameAs: 'pw',
        },
      ],
    },
  ],
};

export const files: LegacyFormSchema = {
  steps: [
    {
      title: 'Documents',
      fields: [
        {
          type: 'file',
          name: 'dni',
          label: 'DNI (PDF)',
          accept: 'application/pdf',
          maxSize: 2 * 1024 * 1024,
          required: true,
        },
        {
          type: 'image',
          name: 'photos',
          label: 'Photos',
          maxFiles: 3,
          helperText: 'Up to 3 images',
        },
      ],
    },
    { title: 'Review', kind: 'review' },
    { title: 'Done', kind: 'result', message: 'Documents received' },
  ],
};

export const payments: LegacyFormSchema = {
  steps: [
    {
      title: 'Plan',
      fields: [
        {
          type: 'radio',
          name: 'plan',
          label: 'Plan',
          required: true,
          options: [
            { value: 'pro', label: 'Pro' },
            { value: 'team', label: 'Team' },
          ],
        },
      ],
    },
    {
      title: 'Payment',
      kind: 'payment',
      providers: ['card', 'hosted', 'declined'],
      summary: 'The total to pay is computed by your server.',
    },
    { title: 'Done', kind: 'result', message: 'Payment recorded' },
  ],
};

export const pending: LegacyFormSchema = {
  steps: [
    {
      title: 'Request',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        {
          type: 'checkbox',
          name: 'simulateFailure',
          label: 'Simulate failure',
        },
      ],
      onEnter: () => {},
    },
    {
      title: 'Confirming',
      kind: 'pending',
      wait: polling(async () => ({ status: 'success' }), { interval: 500 }),
      resultName: 'orderId',
      failTo: 0,
    },
    { title: 'Done', kind: 'result', message: 'Operation confirmed' },
  ],
};

export const repeatables: LegacyFormSchema = {
  steps: [
    {
      title: 'Team',
      fields: [
        {
          type: 'array',
          name: 'members',
          label: 'Members',
          minItems: 1,
          maxItems: 3,
          helperText: 'Between 1 and 3 people',
          itemFields: [
            { type: 'text', name: 'name', label: 'Name', required: true },
            { type: 'email', name: 'email', label: 'Email', required: true },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { value: 'dev', label: 'Development' },
                { value: 'design', label: 'Design' },
              ],
            },
          ],
        },
      ],
    },
    { title: 'Done', kind: 'result', message: 'Team saved' },
  ],
};

/** Conditions, async options, custom pieces and terms: the rest of the 0.2.0 surface. */
export const advanced: LegacyFormSchema = {
  steps: [
    {
      title: 'Account',
      fields: [
        {
          type: 'radio',
          name: 'kind',
          label: 'Type',
          options: [
            { value: 'person', label: 'Person' },
            { value: 'company', label: 'Company' },
          ],
        },
        {
          type: 'text',
          name: 'company',
          label: 'Company',
          required: true,
          showIf: { field: 'kind', equals: 'company' },
        },
        {
          type: 'text',
          name: 'nick',
          label: 'Nickname',
          showIf: { field: 'kind', equals: ['person', 'company'], not: true },
        },
        {
          type: 'text',
          name: 'any',
          label: 'If there is a type',
          showIf: { field: 'kind' },
        },
        {
          type: 'combobox',
          name: 'lang',
          label: 'Language',
          loadOptions: async () => [{ value: 'es', label: 'Spanish' }],
        },
        {
          type: 'stars',
          name: 'score',
          label: 'Score',
          extra: 5,
          nested: { a: [1, 2] },
        },
      ],
    },
    {
      title: 'Company details',
      showIf: { field: 'kind', equals: 'company' },
      fields: [{ type: 'text', name: 'tax', label: 'Tax ID', required: true }],
    },
    {
      title: 'Terms',
      kind: 'terms',
      content: 'Terms text',
      href: 'https://example.com/terms',
      acceptName: 'ok',
      acceptLabel: 'I accept',
    },
    { title: 'Custom', kind: 'custom', render: () => null, note: 'hola' },
    {
      title: 'End',
      kind: 'result',
      message: 'Done',
      actions: [
        { label: 'Ir', href: '/' },
        { label: 'Other', onClick: () => {} },
      ],
    },
  ],
};

export const legacyFixtures = {
  wizard,
  fields,
  files,
  payments,
  pending,
  repeatables,
  advanced,
};
