import { ArtisanForm, type FormSchema } from 'artisanform';
import { useState } from 'react';
import './styles.css';

const scheme: FormSchema = {
  steps: [
    {
      title: 'Hello',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'email', name: 'email', label: 'Email' },
      ],
    },
  ],
};

type Mode = 'tokens' | 'tailwind' | 'plain-css';

/** The same form, styled three ways; none of them touches the library. */
const Styles = () => {
  const [mode, setMode] = useState<Mode>('tokens');
  return (
    <>
      <fieldset className="mb-4 flex gap-2 border-0 p-0 text-sm">
        <legend className="sr-only">Styling approach</legend>
        {(['tokens', 'tailwind', 'plain-css'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            className="rounded border px-3 py-1 aria-pressed:bg-gray-200"
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </fieldset>
      {mode === 'tokens' && (
        <div className="violet-theme">
          <ArtisanForm scheme={scheme} onSubmit={() => {}} />
        </div>
      )}
      {mode === 'tailwind' && (
        <ArtisanForm
          scheme={scheme}
          onSubmit={() => {}}
          classNames={{
            input: 'rounded-full border-emerald-400 bg-emerald-50',
            label: 'uppercase tracking-wide text-emerald-700',
            button: 'rounded-full bg-emerald-600',
          }}
        />
      )}
      {mode === 'plain-css' && (
        <ArtisanForm
          scheme={scheme}
          onSubmit={() => {}}
          unstyled
          classNames={{
            input: 'plain-input',
            label: 'plain-label',
            button: 'plain-button',
            controls: 'plain-controls',
          }}
        />
      )}
    </>
  );
};

export default Styles;
