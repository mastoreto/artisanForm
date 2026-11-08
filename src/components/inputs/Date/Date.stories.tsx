import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withForm } from '../../../../.storybook/withForm';
import DateInput from './Date';

const meta: Meta<typeof DateInput> = {
  title: 'Controls/Artisan Inputs/Date',
  component: DateInput,
  tags: ['autodocs'],
  args: { id: 'date-input', name: 'field', label: 'Date Input' },
};

export default meta;

type Story = StoryObj<typeof DateInput>;

export const Default: Story = {
  decorators: [withForm({ field: '' })],
};

/** Submit (or blur) the empty field to see the Yup error. */
export const WithValidation: Story = {
  decorators: [
    withForm(
      { field: '' },
      {
        field: Yup.date().typeError('Invalid date').required('Required field'),
      },
    ),
  ],
};
