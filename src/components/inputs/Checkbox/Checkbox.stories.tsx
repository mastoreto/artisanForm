import type { Meta, StoryObj } from '@storybook/react';
import * as Yup from 'yup';
import { withForm } from '../../../../.storybook/withForm';
import Checkbox from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Controls/Artisan Inputs/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: { id: 'accept', name: 'accept', label: 'I accept the conditions' },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  decorators: [withForm({ accept: false })],
};

export const Switch: Story = {
  args: { variant: 'switch', label: 'Receive news' },
  decorators: [withForm({ accept: false })],
};

/** Submit unchecked to see the required error. */
export const Required: Story = {
  decorators: [
    withForm(
      { accept: false },
      { accept: Yup.boolean().oneOf([true], 'Required field') },
    ),
  ],
};
