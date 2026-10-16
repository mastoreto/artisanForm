import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withForm } from '../../../../.storybook/withForm';
import Password from './Password';

const meta: Meta<typeof Password> = {
  title: 'Controls/Artisan Inputs/Password',
  component: Password,
  tags: ['autodocs'],
  args: { id: 'password-input', name: 'field', label: 'Password Input' },
};

export default meta;

type Story = StoryObj<typeof Password>;

export const Default: Story = {
  decorators: [withForm({ field: '' })],
};

/** Submit (or blur) the empty field to see the Yup error. */
export const WithValidation: Story = {
  decorators: [
    withForm(
      { field: '' },
      {
        field: Yup.string()
          .required('Required field')
          .min(8, 'Minimum 8 characters'),
      },
    ),
  ],
};
