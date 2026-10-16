import type { Meta, StoryObj } from '@storybook/react';
import ArtisanForm from './ArtisanForm';
import type { FormSchema } from './types';

const scheme: FormSchema = {
  steps: [
    {
      title: 'Datos personales',
      fields: [
        { type: 'text', name: 'name', label: 'Nombre', required: true, min: 3 },
        { type: 'date', name: 'birth', label: 'Nacimiento', required: true },
      ],
    },
    {
      title: 'Preferencias',
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
          type: 'check',
          name: 'topics',
          label: 'Temas',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        },
      ],
    },
    {
      title: 'Cuenta',
      fields: [
        {
          type: 'password',
          name: 'password',
          label: 'Contraseña',
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
