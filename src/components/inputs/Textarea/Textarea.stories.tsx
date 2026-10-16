import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withFormik } from '../../../../.storybook/withFormik';
import Textarea from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Controls/Artisan Inputs/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    id: 'textarea-input',
    name: 'field',
    label: 'Textarea Input',
    helperText: 'Máximo 200 caracteres',
  },
};

export default meta;

type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  decorators: [withFormik({ field: '' })],
};

export const Disabled: Story = {
  args: { disabled: true },
  decorators: [withFormik({ field: 'No editable' })],
};

/** Submit (or blur) the empty field to see the Yup error. */
export const WithValidation: Story = {
  decorators: [
    withFormik(
      { field: '' },
      { field: Yup.string().required('Campo requerido') },
    ),
  ],
};
