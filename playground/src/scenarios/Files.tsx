import { ArtisanForm, type FormSchema, mockStorage } from 'artisanform';
import { useState } from 'react';

const scheme: FormSchema = {
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

// Demo storage: simulates progress and fails for files named "fail*".
const storage = mockStorage({
  delay: 800,
  fail: (f) => f.name.startsWith('fail'),
});

const Files = () => {
  const [result, setResult] = useState<unknown>(null);
  return (
    <>
      <ArtisanForm
        scheme={scheme}
        storage={storage}
        onSubmit={(values) => setResult(values)}
      />
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

export default Files;
