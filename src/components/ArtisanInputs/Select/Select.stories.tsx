import type { Meta, StoryObj } from '@storybook/react';
import { withFormik } from '../../../../.storybook/withFormik';
import Select from './Select';

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
];

const meta: Meta<typeof Select> = {
  title: 'Controls/Artisan Inputs/Select',
  component: Select,
  tags: ['autodocs'],
  args: { name: 'field', options },
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  decorators: [withFormik({ field: '1' })],
};
