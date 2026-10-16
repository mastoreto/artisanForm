import { ArtisanForm, type FormSchema } from 'artisanform';
import { useState } from 'react';

const countries = [
  { value: 'ar', label: 'Argentina' },
  { value: 'au', label: 'Australia' },
  { value: 'cl', label: 'Chile' },
  { value: 'uy', label: 'Uruguay' },
];

const scheme: FormSchema = {
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
        { type: 'number', name: 'price', label: 'Presupuesto', prefix: '$' },
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
        },
        { type: 'time', name: 'time', label: 'Hora de contacto' },
        { type: 'range', name: 'level', label: 'Nivel', min: 0, max: 10 },
        { type: 'rating', name: 'stars', label: 'Valoración' },
        { type: 'otp', name: 'code', label: 'Código', length: 4 },
        { type: 'switch', name: 'news', label: 'Recibir novedades' },
      ],
    },
  ],
};

const Fields = () => {
  const [result, setResult] = useState<unknown>(null);
  return (
    <>
      <ArtisanForm scheme={scheme} onSubmit={(v) => setResult(v)} />
      {result !== null && (
        <pre
          data-testid="result"
          className="mt-6 rounded bg-gray-100 p-3 text-xs"
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </>
  );
};

export default Fields;
