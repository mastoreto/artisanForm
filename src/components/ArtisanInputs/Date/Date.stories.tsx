import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withFormik } from '../../../../.storybook/withFormik';
import Date from './Date';

const meta: Meta<typeof Date> = {
  title: 'Controls/Artisan Inputs/Date',
  component: Date,
  tags: ['autodocs'],
  args: { id: 'date-input', name: 'field', label: 'Date Input' },
};

export default meta;

type Story = StoryObj<typeof Date>;

export const Default: Story = {
  decorators: [withFormik({ field: '' })],
};

/** Submit (or blur) the empty field to see the Yup error. */
export const WithValidation: Story = {
  decorators: [
    withFormik(
      { field: '' },
      {
        field: Yup.date()
          .typeError('Fecha inválida')
          .required('Campo requerido'),
      },
    ),
  ],
};
