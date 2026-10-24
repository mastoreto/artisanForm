import { bootstrapKit } from '@artisanform/ui-bootstrap';
import '@artisanform/ui-bootstrap/style.css';
import { ArtisanForm, type FormSchema } from 'artisanform';
import { useEffect, useState } from 'react';

const scheme: FormSchema = {
  steps: [
    {
      title: 'Account',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'email', name: 'email', label: 'Email', required: true },
        {
          type: 'select',
          name: 'plan',
          label: 'Plan',
          options: [
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
          ],
        },
        { type: 'checkbox', name: 'news', label: 'Send me news' },
      ],
    },
    { title: 'Done', kind: 'result', message: 'Saved' },
  ],
};

/** The same wizard rendered by a UI kit: Bootstrap's CSS does all the styling. */
const Kits = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Bootstrap's global CSS is loaded only while this scenario is open.
    import('bootstrap/dist/css/bootstrap.min.css').then(() => setReady(true));
  }, []);
  if (!ready) return null;
  return (
    <div data-testid="bootstrap-kit">
      <ArtisanForm scheme={scheme} onSubmit={() => {}} kit={bootstrapKit} />
    </div>
  );
};

export default Kits;
