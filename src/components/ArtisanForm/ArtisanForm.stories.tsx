import type { Meta, StoryObj } from '@storybook/react';
import type { FormSchema } from '../../schema/legacy/types';
import ArtisanForm from './ArtisanForm';

const scheme: FormSchema = {
  steps: [
    {
      title: 'Personal data',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true, min: 3 },
        { type: 'date', name: 'birth', label: 'Birth date', required: true },
      ],
    },
    {
      title: 'Preferences',
      fields: [
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
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          label: 'Country and city',
          required: true,
          options: [
            { value: 'ar', label: 'Argentina' },
            { value: 'cl', label: 'Chile' },
          ],
          dependentOptions: {
            ar: [
              { value: 'bsas', label: 'Buenos Aires' },
              { value: 'cba', label: 'Cordoba' },
            ],
            cl: [{ value: 'scl', label: 'Santiago' }],
          },
        },
        {
          type: 'check',
          name: 'topics',
          label: 'Topics',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        },
      ],
    },
    {
      title: 'Account',
      fields: [
        {
          type: 'password',
          name: 'password',
          label: 'Password',
          required: true,
          min: 8,
        },
      ],
    },
  ],
};

const meta: Meta<typeof ArtisanForm> = {
  title: 'Artisan Form',
  component: ArtisanForm,
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj<typeof ArtisanForm> = {
  args: { scheme, onSubmit: (values) => console.log(values) },
};
