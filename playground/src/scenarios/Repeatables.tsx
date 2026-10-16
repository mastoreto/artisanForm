import { ArtisanForm, type FormSchema } from 'artisanform';
import { useState } from 'react';

const scheme: FormSchema = {
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

const Repeatables = () => {
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

export default Repeatables;
