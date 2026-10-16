import type { Meta, StoryObj } from '@storybook/react';
import { withForm } from '../../../../.storybook/withForm';
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
        { value: 'cba', label: 'Cordoba' },
      ],
      cl: [{ value: 'scl', label: 'Santiago' }],
    },
  },
};

export default meta;

export const Default: StoryObj<typeof DynamicSelect> = {
  decorators: [withForm({ country: 'ar', city: '' })],
};

/** The dependent options come from a (fake) async request. */
export const AsyncOptions: StoryObj<typeof DynamicSelect> = {
  args: {
    dependentOptions: undefined,
    loadDependentOptions: (country: string) =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve([{ value: `${country}-1`, label: `City of ${country}` }]),
          800,
        ),
      ),
  },
  decorators: [withForm({ country: 'ar', city: '' })],
};
