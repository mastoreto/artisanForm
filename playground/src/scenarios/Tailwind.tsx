import { tailwindKit } from '@artisanform/ui-tailwind';
import { ArtisanForm, type FormSchema } from 'artisanform';

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

/** The same wizard rendered with Tailwind utilities (no default styles). */
const Tailwind = () => (
  <div data-testid="tailwind-kit">
    <ArtisanForm scheme={scheme} onSubmit={() => {}} kit={tailwindKit} />
  </div>
);

export default Tailwind;
