import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withForm } from '../../../../.storybook/withForm';
import Radio from './Radio';

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
];

const meta: Meta<typeof Radio> = {
  title: 'Controls/Artisan Inputs/Radio',
  component: Radio,
  tags: ['autodocs'],
  args: { name: 'field', options },
};

export default meta;

type Story = StoryObj<typeof Radio>;

export const Default: Story = {
  decorators: [withForm({ field: '' })],
};

/** Submit without choosing to see the Yup error. */
export const WithValidation: Story = {
  decorators: [
    withForm(
      { field: '' },
      { field: Yup.string().required('Choose an option') },
    ),
  ],
};
