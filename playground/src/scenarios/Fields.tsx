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
        { type: 'number', name: 'price', label: 'Budget', prefix: '$' },
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
        },
        { type: 'time', name: 'time', label: 'Contact time' },
        { type: 'range', name: 'level', label: 'Level', min: 0, max: 10 },
        { type: 'rating', name: 'stars', label: 'Rating' },
        { type: 'otp', name: 'code', label: 'Code', length: 4 },
        { type: 'switch', name: 'news', label: 'Receive news' },
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
