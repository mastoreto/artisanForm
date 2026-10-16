import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withForm } from '../../../../.storybook/withForm';
import Textarea from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Controls/Artisan Inputs/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    id: 'textarea-input',
    name: 'field',
    label: 'Textarea Input',
    helperText: 'Maximum 200 characters',
  },
};

export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  decorators: [withForm({ field: '' })],
};

export const Disabled: Story = {
  args: { disabled: true },
  decorators: [withForm({ field: 'Not editable' })],
};

/** Submit (or blur) the empty field to see the Yup error. */
export const WithValidation: Story = {
  decorators: [
    withForm({ field: '' }, { field: Yup.string().required('Required field') }),
  ],
};
