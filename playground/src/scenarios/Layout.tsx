import { ArtisanForm, defineForm } from 'artisanform';
import { useState } from 'react';

const scheme = (ui: Record<string, string>) =>
  defineForm({
    schemaVersion: 1,
    id: 'layout-demo',
    ui,
    steps: [
      {
        id: 'profile',
        type: 'form',
        title: 'Profile',
        ui: { columns: 2 },
        fields: [
          { type: 'text', name: 'first', label: 'First name', ui: { span: 1 } },
          { type: 'text', name: 'last', label: 'Last name', ui: { span: 1 } },
          {
            type: 'email',
            name: 'email',
            label: 'Email',
            description: 'We never share it',
            ui: { span: 2 },
          },
          { type: 'text', name: 'city', label: 'City', ui: { span: 1 } },
          { type: 'text', name: 'zip', label: 'Zip', ui: { span: 1 } },
        ],
      },
    ],
  });

/** Same schema, semantic `ui` settings changed from the form-level `ui`. */
const Layout = () => {
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    'comfortable',
  );
  const [labelPosition, setLabelPosition] = useState<'top' | 'left'>('top');
  return (
    <>
      <div className="mb-4 flex gap-4 text-sm">
        <label>
          Density{' '}
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value as typeof density)}
          >
            <option value="comfortable">comfortable</option>
            <option value="compact">compact</option>
          </select>
        </label>
        <label>
          Labels{' '}
          <select
            value={labelPosition}
            onChange={(e) =>
              setLabelPosition(e.target.value as typeof labelPosition)
            }
          >
            <option value="top">top</option>
            <option value="left">left</option>
          </select>
        </label>
      </div>
      <ArtisanForm
        key={`${density}-${labelPosition}`}
        scheme={scheme({ density, labelPosition })}
        onSubmit={() => {}}
      />
    </>
  );
};

export default Layout;
