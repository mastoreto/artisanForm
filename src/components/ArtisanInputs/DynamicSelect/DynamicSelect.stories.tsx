import type { Meta, StoryObj } from '@storybook/react';
import { withFormik } from '../../../../.storybook/withFormik';
import DynamicSelect from './DynamicSelect';

const meta: Meta<typeof DynamicSelect> = {
  title: 'Controls/Artisan Inputs/Dynamic Select',
  component: DynamicSelect,
  tags: ['autodocs'],
  args: {
    name: 'country',
    dependentName: 'city',
    options: [
      { value: 'ar', label: 'Argentina' },
      { value: 'cl', label: 'Chile' },
    ],
    dependentOptions: {
      ar: [
        { value: 'bsas', label: 'Buenos Aires' },
        { value: 'cba', label: 'Córdoba' },
      ],
      cl: [{ value: 'scl', label: 'Santiago' }],
    },
  },
};

export default meta;

export const Default: StoryObj<typeof DynamicSelect> = {
  decorators: [withFormik({ country: 'ar', city: '' })],
};
