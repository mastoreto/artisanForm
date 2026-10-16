import { polling } from '../../wait';
import type { LegacyFormSchema } from '../legacy';

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
      title: 'Datos personales',
      fields: [
        { type: 'text', name: 'name', label: 'Nombre', required: true, min: 3 },
        { type: 'email', name: 'email', label: 'Email', required: true },
        { type: 'date', name: 'birth', label: 'Nacimiento' },
      ],
    },
    {
      title: 'Ubicación',
      fields: [
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          label: 'País y ciudad',
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
      title: 'Todos los campos',
      fields: [
        { type: 'heading', name: 'h1', label: 'Datos básicos' },
        {
          type: 'text',
          name: 'name',
          label: 'Nombre',
          width: 'half',
          required: true,
        },
        { type: 'tel', name: 'phone', label: 'Teléfono', width: 'half' },
        { type: 'text', name: 'cuit', label: 'CUIT', mask: '##-########-#' },
        {
          type: 'number',
          name: 'price',
          label: 'Presupuesto',
          prefix: '$',
          min: 0,
          max: 1000,
          step: '0.5',
        },
        { type: 'divider', name: 'd1', label: '' },
        {
          type: 'callout',
          name: 'c1',
          label: 'Los campos con * son obligatorios',
          variant: 'info',
        },
        {
          type: 'combobox',
          name: 'country',
          label: 'País',
          options: countries,
        },
        {
          type: 'multiselect',
          name: 'visited',
          label: 'Países visitados',
          options: countries,
        },
        {
          type: 'daterange',
          name: 'from',
          endName: 'to',
          label: 'Viaje desde',
          minDate: '2030-01-01',
        },
        { type: 'time', name: 'time', label: 'Hora de contacto' },
        { type: 'range', name: 'level', label: 'Nivel', min: 0, max: 10 },
        { type: 'rating', name: 'stars', label: 'Valoración' },
        { type: 'otp', name: 'code', label: 'Código', length: 4 },
        {
          type: 'switch',
          name: 'news',
          label: 'Recibir novedades',
          helperText: 'Una vez por mes',
        },
        {
          type: 'password',
          name: 'pw',
          label: 'Clave',
          min: 8,
          pattern: '^\\S+$',
        },
        { type: 'password', name: 'pw2', label: 'Repetir clave', sameAs: 'pw' },
      ],
    },
  ],
};

export const files: LegacyFormSchema = {
  steps: [
    {
      title: 'Documentos',
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
          label: 'Fotos',
          maxFiles: 3,
          helperText: 'Hasta 3 imágenes',
        },
      ],
    },
    { title: 'Revisá', kind: 'review' },
    { title: 'Listo', kind: 'result', message: 'Documentos recibidos' },
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
      title: 'Pago',
      kind: 'payment',
      providers: ['card', 'hosted', 'declined'],
      summary: 'Total a pagar lo calcula tu servidor.',
    },
    { title: 'Listo', kind: 'result', message: 'Pago registrado' },
  ],
};

export const pending: LegacyFormSchema = {
  steps: [
    {
      title: 'Solicitud',
      fields: [
        { type: 'text', name: 'name', label: 'Nombre', required: true },
        { type: 'checkbox', name: 'simulateFailure', label: 'Simular fallo' },
      ],
      onEnter: () => {},
    },
    {
      title: 'Confirmando',
      kind: 'pending',
      wait: polling(async () => ({ status: 'success' }), { interval: 500 }),
      resultName: 'orderId',
      failTo: 0,
    },
    { title: 'Listo', kind: 'result', message: 'Operación confirmada' },
  ],
};

export const repeatables: LegacyFormSchema = {
  steps: [
    {
      title: 'Equipo',
      fields: [
        {
          type: 'array',
          name: 'members',
          label: 'Integrantes',
          minItems: 1,
          maxItems: 3,
          helperText: 'Entre 1 y 3 personas',
          itemFields: [
            { type: 'text', name: 'name', label: 'Nombre', required: true },
            { type: 'email', name: 'email', label: 'Email', required: true },
            {
              type: 'select',
              name: 'role',
              label: 'Rol',
              options: [
                { value: 'dev', label: 'Desarrollo' },
                { value: 'design', label: 'Diseño' },
              ],
            },
          ],
        },
      ],
    },
    { title: 'Listo', kind: 'result', message: 'Equipo guardado' },
  ],
};

/** Conditions, async options, custom pieces and terms: the rest of the 0.2.0 surface. */
export const advanced: LegacyFormSchema = {
  steps: [
    {
      title: 'Cuenta',
      fields: [
        {
          type: 'radio',
          name: 'kind',
          label: 'Tipo',
          options: [
            { value: 'person', label: 'Persona' },
            { value: 'company', label: 'Empresa' },
          ],
        },
        {
          type: 'text',
          name: 'company',
          label: 'Empresa',
          required: true,
          showIf: { field: 'kind', equals: 'company' },
        },
        {
          type: 'text',
          name: 'nick',
          label: 'Apodo',
          showIf: { field: 'kind', equals: ['person', 'company'], not: true },
        },
        {
          type: 'text',
          name: 'any',
          label: 'Si hay tipo',
          showIf: { field: 'kind' },
        },
        {
          type: 'combobox',
          name: 'lang',
          label: 'Idioma',
          loadOptions: async () => [{ value: 'es', label: 'Español' }],
        },
        {
          type: 'stars',
          name: 'score',
          label: 'Puntaje',
          extra: 5,
          nested: { a: [1, 2] },
        },
      ],
    },
    {
      title: 'Datos de empresa',
      showIf: { field: 'kind', equals: 'company' },
      fields: [{ type: 'text', name: 'tax', label: 'CUIT', required: true }],
    },
    {
      title: 'Términos',
      kind: 'terms',
      content: 'Texto de los términos',
      href: 'https://example.com/terms',
      acceptName: 'ok',
      acceptLabel: 'Acepto',
    },
    { title: 'Custom', kind: 'custom', render: () => null, note: 'hola' },
    {
      title: 'Fin',
      kind: 'result',
      message: 'Hecho',
      actions: [
        { label: 'Ir', href: '/' },
        { label: 'Otra', onClick: () => {} },
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
