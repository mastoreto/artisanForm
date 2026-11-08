import { ArtisanForm, type FormSchema } from 'artisanform';
import { useState } from 'react';

const scheme: FormSchema = {
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
          helperText:
            'Between 1 and 3 people (try the name "fail" to simulate a submit error)',
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

const Repeatables = () => {
  const [result, setResult] = useState<unknown>(null);
  return (
    <>
      <ArtisanForm
        scheme={scheme}
        onSubmit={async (v) => {
          await new Promise((r) => setTimeout(r, 700));
          const members = (v.members ?? []) as { name: string }[];
          // Demo: a member named "fail" simulates a server error.
          if (members.some((m) => m.name === 'fail'))
            throw new Error('The server rejected the submission');
          setResult(v);
        }}
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

export default Repeatables;
