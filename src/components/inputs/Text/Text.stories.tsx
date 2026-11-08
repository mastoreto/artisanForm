import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withForm } from '../../../../.storybook/withForm';
import Text from './Text';

const meta: Meta<typeof Text> = {
  title: 'Controls/Artisan Inputs/Text',
  component: Text,
  tags: ['autodocs'],
  args: { id: 'text-input', name: 'field', label: 'Text Input' },
};

export default meta;

type Story = StoryObj<typeof Text>;

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
          .min(3, 'Minimum 3 characters'),
      },
    ),
  ],
};
