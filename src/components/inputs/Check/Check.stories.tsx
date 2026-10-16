import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withFormik } from '../../../../.storybook/withFormik';
import Check from './Check';

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
];

const meta: Meta<typeof Check> = {
  title: 'Controls/Artisan Inputs/Check',
  component: Check,
  tags: ['autodocs'],
  args: { name: 'field', options },
};

export default meta;

type Story = StoryObj<typeof Check>;

export const Default: Story = {
  decorators: [withFormik({ field: [] })],
};

/** Submit without choosing to see the Yup error. */
export const WithValidation: Story = {
  decorators: [
    withFormik(
      { field: [] },
      { field: Yup.array().min(1, 'Elegí al menos una opción') },
    ),
  ],
};
