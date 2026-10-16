import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withForm } from '../../../../.storybook/withForm';
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
  decorators: [withForm({ field: [] })],
};

/** Submit without choosing to see the Yup error. */
export const WithValidation: Story = {
  decorators: [
    withForm(
      { field: [] },
      { field: Yup.array().min(1, 'Choose at least one option') },
    ),
  ],
};
